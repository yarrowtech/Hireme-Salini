/**
 * Attendance aggregation + config service.
 *
 * Daily / monthly / yearly rollups for the company panel, holiday + policy CRUD,
 * bulk marking and the nightly auto-absent job. Everything is paginated so a
 * company with thousands of employees stays responsive.
 */
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Holiday = require("../models/Holiday");
const SalaryStructure = require("../models/SalaryStructure");
const PayrollRun = require("../models/PayrollRun");
const CompanyServiceAccess = require("../models/CompanyServiceAccess");
const companyEmployees = require("./companyEmployees");
const rules = require("../utils/attendanceRules");
const { computePayItem } = require("../utils/payrollCalc");

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function monthKey(value) {
  return String(value || new Date().toISOString()).slice(0, 7);
}
function monthRange(month) {
  const m = monthKey(month);
  const [y, mon] = m.split("-").map(Number);
  const days = new Date(Date.UTC(y, mon, 0)).getUTCDate();
  return { month: m, start: `${m}-01`, end: `${m}-${String(days).padStart(2, "0")}`, days };
}
function pageParams(opts = {}) {
  const page = Math.max(1, Number(opts.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(opts.limit) || DEFAULT_LIMIT));
  return { page, limit, skip: (page - 1) * limit };
}

async function getPolicy(companyId) {
  const sa = await CompanyServiceAccess.findOne({ companyId }).select("attendancePolicy").lean();
  return rules.resolvePolicy(sa?.attendancePolicy);
}

async function savePolicy(companyId, patch = {}) {
  const allowed = [
    "graceMinutes",
    "halfDayMaxHours",
    "fullDayHours",
    "overtimeAfterHours",
    "weeklyOffDays",
    "autoAbsentEnabled",
    "autoAbsentHour",
  ];
  const set = {};
  for (const key of allowed) {
    if (patch[key] === undefined) continue;
    if (key === "weeklyOffDays") set[`attendancePolicy.${key}`] = Array.isArray(patch[key]) ? patch[key] : [];
    else if (key === "autoAbsentEnabled") set[`attendancePolicy.${key}`] = Boolean(patch[key]);
    else set[`attendancePolicy.${key}`] = Number(patch[key]) || 0;
  }
  await CompanyServiceAccess.findOneAndUpdate(
    { companyId },
    { $set: set },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return getPolicy(companyId);
}

async function listHolidays(companyId, year) {
  const rows = await Holiday.find({ companyId }).sort({ date: 1 }).lean();
  if (!year) return rows;
  const y = String(year);
  return rows.filter((row) => row.recurring || String(row.date).slice(0, 4) === y);
}

async function saveHoliday(companyId, companyCode, payload = {}) {
  const date = String(payload.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const err = new Error("Holiday date must be YYYY-MM-DD");
    err.status = 400;
    throw err;
  }
  return Holiday.findOneAndUpdate(
    { companyId, date },
    {
      $set: {
        companyCode: String(companyCode || ""),
        name: String(payload.name || "Holiday").trim() || "Holiday",
        recurring: Boolean(payload.recurring),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
}

async function deleteHoliday(companyId, holidayId) {
  await Holiday.deleteOne({ _id: holidayId, companyId });
  return { success: true };
}

async function holidaySet(companyId, fromKey, toKey) {
  const rows = await Holiday.find({ companyId }).lean();
  const set = new Set();
  const fromYear = Number(String(fromKey).slice(0, 4));
  const toYear = Number(String(toKey).slice(0, 4));
  for (const row of rows) {
    const date = String(row.date || "").slice(0, 10);
    if (!date) continue;
    if (date >= fromKey && date <= toKey) set.add(date);
    if (row.recurring) {
      const md = date.slice(5);
      for (let y = fromYear; y <= toYear; y += 1) {
        const candidate = `${y}-${md}`;
        if (candidate >= fromKey && candidate <= toKey) set.add(candidate);
      }
    }
  }
  return set;
}

function filterRoster(employees, opts = {}) {
  const q = String(opts.q || "").trim().toLowerCase();
  const department = String(opts.department || "").trim();
  const shift = String(opts.shift || "").trim();
  const includeInactive = opts.includeInactive === true || String(opts.includeInactive) === "true";
  return employees
    .filter((e) => includeInactive || String(e.status || "ACTIVE").toUpperCase() !== "INACTIVE")
    .filter((e) => !department || String(e.department || "") === department)
    .filter((e) => !shift || String(e.shiftName || "") === shift)
    .filter(
      (e) =>
        !q ||
        [e.employeeId, e.id, e.name, e.department, e.role, e.shiftName].some((v) =>
          String(v || "").toLowerCase().includes(q)
        )
    )
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

async function loadRoster(companyId, opts) {
  const { employees, companyCode } = await companyEmployees.listEmployees(companyId);
  return { roster: filterRoster(employees, opts), companyCode };
}

function shortStatus(status) {
  return rules.PRESENT_STATUSES.includes(status) && status === "PRESENT"
    ? "P"
    : {
        PRESENT: "P",
        ABSENT: "A",
        LATE: "L",
        HALF_DAY: "½",
        ON_LEAVE: "LV",
        HOLIDAY: "H",
        WEEKLY_OFF: "WO",
        WORK_FROM_HOME: "WFH",
        MISSING_CHECKOUT: "MC",
        NOT_MARKED: "",
      }[status] || "";
}

/** DAILY register — every employee + their row (or derived status) for one date. */
async function dailyRegister(companyId, dateStr, opts = {}) {
  const date = String(dateStr || todayKey()).slice(0, 10);
  const { page, limit, skip } = pageParams(opts);
  const [{ roster }, policy, holidays] = await Promise.all([
    loadRoster(companyId, opts),
    getPolicy(companyId),
    holidaySet(companyId, date, date),
  ]);
  const records = await Attendance.find({ companyId, date }).lean();
  const byEmp = new Map(records.map((r) => [String(r.employeeId), r]));
  const isPast = date < todayKey();

  const resolve = (employee) => {
    const existing = byEmp.get(String(employee.employeeId || employee.id));
    if (existing) return { ...existing, marked: true };
    const derived = rules.deriveAttendance(
      { dateStr: date, isHoliday: holidays.has(date), isPastDay: isPast },
      employee,
      policy
    );
    return {
      employeeId: employee.employeeId || employee.id,
      employeeName: employee.name,
      department: employee.department,
      date,
      status: derived.status,
      checkIn: "",
      checkOut: "",
      lateMinutes: 0,
      overtimeHours: 0,
      marked: false,
    };
  };

  const totals = rules.summarize(roster.map(resolve));
  const pageRows = roster.slice(skip, skip + limit).map((employee) => {
    const r = resolve(employee);
    return {
      employeeId: employee.employeeId || employee.id,
      name: employee.name,
      companyCode: employee.companyCode,
      department: employee.department,
      role: employee.role,
      shiftName: employee.shiftName || "",
      shiftStart: employee.shiftStart || "",
      shiftEnd: employee.shiftEnd || "",
      photoUrl: employee.photoUrl || "",
      status: r.status,
      checkIn: r.checkIn || "",
      checkOut: r.checkOut || "",
      lateMinutes: r.lateMinutes || 0,
      overtimeHours: r.overtimeHours || 0,
      attendanceId: r._id || null,
      marked: r.marked,
      lockedForPayroll: Boolean(r.lockedForPayroll),
    };
  });

  return {
    date,
    rows: pageRows,
    totals,
    pageInfo: { page, limit, total: roster.length, pages: Math.max(1, Math.ceil(roster.length / limit)) },
  };
}

/** MONTHLY grid — per employee day-by-day + totals + estimated salary. */
async function monthlyGrid(companyId, month, opts = {}) {
  const { month: m, start, end, days } = monthRange(month);
  const single = String(opts.employeeId || "").trim();
  const { page, limit, skip } = pageParams(opts);

  const [{ roster }, policy, holidays, structures] = await Promise.all([
    loadRoster(companyId, opts),
    getPolicy(companyId),
    holidaySet(companyId, start, end),
    SalaryStructure.find({ companyId, effectiveFrom: { $lte: end } }).sort({ effectiveFrom: -1 }).lean(),
  ]);
  const structByEmp = new Map();
  for (const s of structures) if (!structByEmp.has(s.employeeId)) structByEmp.set(s.employeeId, s);

  const scoped = single ? roster.filter((e) => String(e.employeeId || e.id) === single) : roster;
  const pageRoster = single ? scoped : scoped.slice(skip, skip + limit);
  const empIds = pageRoster.map((e) => e.employeeId || e.id);

  const records = await Attendance.find({
    companyId,
    employeeId: { $in: empIds },
    date: { $gte: start, $lte: end },
  }).lean();
  const recByEmp = new Map();
  for (const r of records) {
    const list = recByEmp.get(String(r.employeeId)) || [];
    list.push(r);
    recByEmp.set(String(r.employeeId), list);
  }

  const today = todayKey();
  const rows = pageRoster.map((employee) => {
    const key = String(employee.employeeId || employee.id);
    const empRecords = recByEmp.get(key) || [];
    const recByDate = new Map(empRecords.map((r) => [String(r.date).slice(0, 10), r]));
    const dayMap = {};
    for (let d = 1; d <= days; d += 1) {
      const dateStr = `${m}-${String(d).padStart(2, "0")}`;
      const real = recByDate.get(dateStr);
      if (real) {
        dayMap[String(d).padStart(2, "0")] = shortStatus(String(real.status).toUpperCase());
        continue;
      }
      if (holidays.has(dateStr)) dayMap[String(d).padStart(2, "0")] = "H";
      else if (rules.isWeeklyOff(dateStr, employee, policy)) dayMap[String(d).padStart(2, "0")] = "WO";
      else if (dateStr < today) dayMap[String(d).padStart(2, "0")] = "A";
      else dayMap[String(d).padStart(2, "0")] = "";
    }

    const workingDays = rules.workingDaysInMonth(m, employee, policy, holidays);
    const summary = rules.summarize(empRecords, { workingDays });
    const pay = computePayItem(employee, empRecords, structByEmp.get(key), { month: m, policy, holidaySet: holidays });

    return {
      employeeId: key,
      name: employee.name,
      companyCode: employee.companyCode,
      department: employee.department,
      role: employee.role,
      shiftName: employee.shiftName || "",
      days: dayMap,
      totals: {
        present: summary.present,
        absent: summary.absent,
        late: summary.late,
        halfDay: summary.halfDay,
        onLeave: summary.onLeave,
        weeklyOff: summary.weeklyOff,
        holiday: summary.holiday,
        overtimeHours: summary.overtimeHours,
      },
      workingDays,
      payableDays: pay.payableDays,
      presentDays: pay.presentDays,
      paidLeave: pay.paidLeave,
      unpaidLeave: pay.unpaidLeave,
      absentDays: pay.absentDays,
      lateDays: pay.lateDays,
      halfDays: pay.halfDays,
      attendancePct: workingDays ? Math.round((Math.min(summary.present, workingDays) / workingDays) * 100) : 0,
      grossSalary: pay.grossSalary,
      attendanceDeduction: pay.attendanceDeduction,
      statutoryDeductions: pay.statutoryDeductions,
      totalDeductions: pay.totalDeductions,
      estimatedNet: pay.netSalary,
      salaryStructureId: pay.salaryStructureId,
      hasSalaryStructure: Boolean(structByEmp.get(key)),
    };
  });

  const total = scoped.length;
  return {
    month: m,
    daysInMonth: days,
    rows,
    pageInfo: { page: single ? 1 : page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    companyTotals: {
      estimatedNet: rows.reduce((s, r) => s + r.estimatedNet, 0),
      employees: total,
    },
  };
}

/** YEARLY grid — per employee x 12 months present/working + %. */
async function yearlyGrid(companyId, year, opts = {}) {
  const y = Number(year) || new Date().getFullYear();
  const start = `${y}-01-01`;
  const end = `${y}-12-31`;
  const { page, limit, skip } = pageParams(opts);

  const [{ roster }, policy, holidays] = await Promise.all([
    loadRoster(companyId, opts),
    getPolicy(companyId),
    holidaySet(companyId, start, end),
  ]);
  const pageRoster = roster.slice(skip, skip + limit);
  const empIds = pageRoster.map((e) => e.employeeId || e.id);

  const grouped = await Attendance.aggregate([
    {
      $match: {
        companyId: new mongoose.Types.ObjectId(String(companyId)),
        employeeId: { $in: empIds.map(String) },
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: { employeeId: "$employeeId", month: { $substr: ["$date", 0, 7] } },
        present: {
          $sum: {
            $cond: [{ $in: ["$status", rules.PRESENT_STATUSES] }, 1, 0],
          },
        },
        halfDay: { $sum: { $cond: [{ $eq: ["$status", "HALF_DAY"] }, 0.5, 0] } },
        absent: { $sum: { $cond: [{ $eq: ["$status", "ABSENT"] }, 1, 0] } },
        onLeave: { $sum: { $cond: [{ $eq: ["$status", "ON_LEAVE"] }, 1, 0] } },
        overtimeHours: { $sum: "$overtimeHours" },
      },
    },
  ]);
  const byEmpMonth = new Map();
  for (const g of grouped) byEmpMonth.set(`${g._id.employeeId}|${g._id.month}`, g);

  const rows = pageRoster.map((employee) => {
    const key = String(employee.employeeId || employee.id);
    const months = [];
    let yearPresent = 0;
    let yearWorking = 0;
    for (let mo = 1; mo <= 12; mo += 1) {
      const mk = `${y}-${String(mo).padStart(2, "0")}`;
      const workingDays = rules.workingDaysInMonth(mk, employee, policy, holidays);
      const g = byEmpMonth.get(`${key}|${mk}`);
      const present = (g?.present || 0) + (g?.halfDay || 0);
      yearPresent += present;
      yearWorking += workingDays;
      months.push({
        month: mk,
        present,
        absent: g?.absent || 0,
        onLeave: g?.onLeave || 0,
        overtimeHours: g?.overtimeHours || 0,
        workingDays,
        pct: workingDays ? Math.round((Math.min(present, workingDays) / workingDays) * 100) : 0,
      });
    }
    return {
      employeeId: key,
      name: employee.name,
      companyCode: employee.companyCode,
      department: employee.department,
      months,
      yearPresent: Math.round(yearPresent * 100) / 100,
      yearWorking,
      yearPct: yearWorking ? Math.round((Math.min(yearPresent, yearWorking) / yearWorking) * 100) : 0,
    };
  });

  return {
    year: y,
    rows,
    pageInfo: { page, limit, total: roster.length, pages: Math.max(1, Math.ceil(roster.length / limit)) },
  };
}

/** Insert ABSENT rows for a past working day where nothing was recorded. Idempotent. */
async function runAutoAbsent(companyId, dateStr) {
  const date = String(dateStr || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date >= todayKey()) {
    return { inserted: 0, skipped: "future-or-invalid-date" };
  }
  // Don't touch a month that payroll has already locked.
  const locked = await Attendance.exists({ companyId, date, lockedForPayroll: true });
  if (locked) return { inserted: 0, skipped: "payroll-locked" };

  const [{ employees }, policy, holidays, existing] = await Promise.all([
    companyEmployees.listEmployees(companyId),
    getPolicy(companyId),
    holidaySet(companyId, date, date),
    Attendance.find({ companyId, date }).select("employeeId").lean(),
  ]);
  if (holidays.has(date)) return { inserted: 0, skipped: "holiday" };

  const marked = new Set(existing.map((r) => String(r.employeeId)));
  const docs = [];
  for (const employee of employees) {
    if (String(employee.status || "ACTIVE").toUpperCase() === "INACTIVE") continue;
    const key = String(employee.employeeId || employee.id);
    if (marked.has(key)) continue;
    if (rules.isWeeklyOff(date, employee, policy)) continue;
    docs.push({
      companyId,
      companyCode: employee.companyCode || "",
      employeeId: key,
      employeeName: employee.name || "",
      department: employee.department || "",
      date,
      status: "ABSENT",
      mode: "AUTO",
      autoGenerated: true,
      markedBy: "System",
    });
  }
  if (!docs.length) return { inserted: 0 };
  try {
    await Attendance.insertMany(docs, { ordered: false });
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }
  return { inserted: docs.length };
}

async function runAutoAbsentAllCompanies(dateStr) {
  const companies = await CompanyServiceAccess.find({}).select("companyId attendancePolicy").lean();
  let total = 0;
  for (const sa of companies) {
    const policy = rules.resolvePolicy(sa.attendancePolicy);
    if (!policy.autoAbsentEnabled) continue;
    const res = await runAutoAbsent(sa.companyId, dateStr);
    total += res.inserted || 0;
  }
  return { companies: companies.length, inserted: total };
}

module.exports = {
  getPolicy,
  savePolicy,
  listHolidays,
  saveHoliday,
  deleteHoliday,
  holidaySet,
  dailyRegister,
  monthlyGrid,
  yearlyGrid,
  runAutoAbsent,
  runAutoAbsentAllCompanies,
};
