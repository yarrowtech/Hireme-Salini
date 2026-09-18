const { asyncHandler } = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/response");
const mongoose = require("mongoose");
const User = require("../models/User");
const Company = require("../models/Company");
const EmployeeProfile = require("../models/EmployeeProfile");
const CompanyEmployeeData = require("../models/CompanyEmployeeData");
const Attendance = require("../models/Attendance");
const SalaryStructure = require("../models/SalaryStructure");
const PayrollRun = require("../models/PayrollRun");
const attendanceService = require("../services/attendanceService");
const attendanceRules = require("../utils/attendanceRules");
const { writeAttendance } = require("./company.controller");

/** Resolve the caller's { companyId, employeeId, employee } from either data source. */
async function resolveEmployeeContext(userId) {
  let master = await CompanyEmployeeData.findOne({ userId }).lean();
  if (!master) {
    const user = await User.findById(userId).lean();
    if (user) {
      master = await CompanyEmployeeData.findOne({
        companyId: user.companyId,
        $or: [
          { username: user.username },
          { email: user.email },
          { employeeId: user.username },
        ],
      }).lean();
      if (master) {
        // Link userId for future fast lookups
        await CompanyEmployeeData.updateOne({ _id: master._id }, { $set: { userId: user._id } });
      }
    }
  }
  if (master) {
    return { companyId: master.companyId, employeeId: master.employeeId, employee: master };
  }
  const profile = await EmployeeProfile.findOne({ userId }).lean();
  if (profile) {
    return {
      companyId: profile.companyId,
      employeeId: profile.employeeId,
      employee: { ...profile, name: profile.name || "", shiftStart: "", shiftEnd: "", weeklyOff: "" },
    };
  }
  return null;
}

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function nowHM() {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("hour")}:${get("minute")}`;
}

const employeeMe = asyncHandler(async (req, res) => {
  const ctx = await resolveEmployeeContext(req.user._id);
  const companyDoc = ctx?.companyId
    ? await Company.findById(ctx.companyId).select("name CompanyName companyCode code email phone Address").lean()
    : null;

  const company = companyDoc
    ? {
        name: companyDoc.CompanyName || companyDoc.name || "Company",
        code: companyDoc.companyCode || companyDoc.code,
        email: companyDoc.email || companyDoc.Email || "",
        phone: companyDoc.phone || companyDoc.Contact || "",
        address: companyDoc.address || companyDoc.Address || "",
      }
    : null;

  const salaryStructure = ctx?.companyId && ctx?.employeeId
    ? await SalaryStructure.findOne({ companyId: ctx.companyId, employeeId: ctx.employeeId }).sort({ effectiveFrom: -1 }).lean()
    : null;

  const payrollRuns = ctx?.companyId && ctx?.employeeId
    ? await PayrollRun.find({ companyId: ctx.companyId, "items.employeeId": ctx.employeeId }).sort({ month: -1 }).limit(3).lean()
    : [];

  const recentPayroll = payrollRuns.map((p) => {
    const it = p.items?.find((i) => i.employeeId === ctx.employeeId);
    return {
      month: p.month,
      netSalary: it?.netSalary || 0,
      grossSalary: it?.grossSalary || 0,
      totalDeductions: it?.totalDeductions || 0,
      status: it?.status || "PAID",
      paymentDate: it?.payment?.paymentDate || null,
    };
  });

  return ok(
    res,
    {
      user: req.user,
      employee: ctx?.employee || null,
      company,
      salaryStructure,
      recentPayroll,
    },
    "Employee profile"
  );
});

const getEmployeeDashboard = asyncHandler(async (req, res) => {
  const ctx = await resolveEmployeeContext(req.user._id);
  if (!ctx) return fail(res, "No employee record linked to this login", 404);

  const today = todayKey();
  const currentMonth = String(req.query.month || today.slice(0, 7)).slice(0, 7);

  // 1. Today's attendance
  const todayRecord = await Attendance.findOne({
    companyId: ctx.companyId,
    employeeId: ctx.employeeId,
    date: today,
  }).lean();

  // 2. Month records
  const monthRecords = await Attendance.find({
    companyId: ctx.companyId,
    employeeId: ctx.employeeId,
    date: { $gte: `${currentMonth}-01`, $lte: `${currentMonth}-31` },
  })
    .sort({ date: -1 })
    .lean();

  // 3. Monthly grid summary
  let monthlySummary = null;
  try {
    const monthlyGridData = await attendanceService.monthlyGrid(ctx.companyId, currentMonth, {
      employeeId: ctx.employeeId,
    });
    monthlySummary = monthlyGridData?.rows?.[0] || null;
  } catch (err) {
    // fallback if attendanceService has issues
  }

  // 4. Company info
  const companyDoc = await Company.findById(ctx.companyId).select("name CompanyName companyCode code email phone").lean();
  const company = companyDoc
    ? {
        name: companyDoc.CompanyName || companyDoc.name || "Company",
        code: companyDoc.companyCode || companyDoc.code,
        email: companyDoc.email || "",
        phone: companyDoc.phone || "",
      }
    : null;

  // 5. Salary Structure & Recent Payroll
  const salaryStructure = await SalaryStructure.findOne({
    companyId: ctx.companyId,
    employeeId: ctx.employeeId,
  })
    .sort({ effectiveFrom: -1 })
    .lean();

  const recentPayrollRuns = await PayrollRun.find({
    companyId: ctx.companyId,
    "items.employeeId": ctx.employeeId,
  })
    .sort({ month: -1 })
    .limit(3)
    .lean();

  const payrollHistory = recentPayrollRuns.map((p) => {
    const it = p.items?.find((i) => i.employeeId === ctx.employeeId);
    return {
      month: p.month,
      netSalary: it?.netSalary || 0,
      grossSalary: it?.grossSalary || 0,
      totalDeductions: it?.totalDeductions || 0,
      status: it?.status || "PAID",
      paymentDate: it?.payment?.paymentDate || null,
    };
  });

  const presentDays = monthlySummary?.presentDays ?? monthRecords.filter((r) => ["PRESENT", "HALF_DAY"].includes(r.status)).length;
  const absentDays = monthlySummary?.absentDays ?? monthRecords.filter((r) => r.status === "ABSENT").length;
  const leaveDays = monthlySummary?.paidLeave ?? monthRecords.filter((r) => r.status === "ON_LEAVE").length;
  const workingDays = monthlySummary?.workingDays || 26;

  return ok(
    res,
    {
      employee: {
        employeeId: ctx.employeeId,
        name: ctx.employee.name || req.user.username || "Employee",
        role: ctx.employee.role || "Employee",
        department: ctx.employee.department || "General",
        designation: ctx.employee.designation || ctx.employee.role || "Employee",
        email: ctx.employee.email || req.user.email || "",
        phone: ctx.employee.phone || ctx.employee.contact || "",
        shiftStart: ctx.employee.shiftStart || "09:00",
        shiftEnd: ctx.employee.shiftEnd || "18:00",
        shiftName: ctx.employee.shiftName || "Standard Shift",
        weeklyOff: ctx.employee.weeklyOff || "Sunday",
        workLocation: ctx.employee.workLocation || "Main Office",
        joiningDate: ctx.employee.joiningDate || "",
        status: ctx.employee.status || "ACTIVE",
        attendanceMode: ctx.employee.attendanceMode || "SELF",
      },
      company,
      todayAttendance: {
        date: today,
        checkIn: todayRecord?.checkIn || null,
        checkOut: todayRecord?.checkOut || null,
        status: todayRecord?.status || (todayRecord?.checkIn ? "CHECKED_IN" : "NOT_MARKED"),
        workingHours: todayRecord?.workingHours || 0,
      },
      monthlySummary: {
        month: currentMonth,
        workingDays,
        presentDays,
        absentDays,
        paidLeave: leaveDays,
        attendancePct: workingDays ? Math.min(100, Math.round((presentDays / workingDays) * 100)) : 0,
      },
      salary: {
        structure: salaryStructure || null,
        latestPayroll: payrollHistory[0] || null,
        history: payrollHistory,
      },
      recentAttendance: monthRecords.slice(0, 10).map((r) => ({
        date: r.date,
        checkIn: r.checkIn || null,
        checkOut: r.checkOut || null,
        status: r.status || "PRESENT",
        lateMinutes: r.lateMinutes || 0,
      })),
    },
    "Employee dashboard"
  );
});

const getMyAttendance = asyncHandler(async (req, res) => {
  const ctx = await resolveEmployeeContext(req.user._id);
  if (!ctx) return fail(res, "No employee record linked to this login", 404);

  const month = String(req.query.month || todayKey().slice(0, 7)).slice(0, 7);
  const year = Number(req.query.year) || Number(month.slice(0, 4));

  const [records, monthly] = await Promise.all([
    Attendance.find({ companyId: ctx.companyId, employeeId: ctx.employeeId, date: { $gte: `${month}-01`, $lte: `${month}-31` } })
      .sort({ date: 1 })
      .lean(),
    attendanceService.monthlyGrid(ctx.companyId, month, { employeeId: ctx.employeeId }),
  ]);

  const yearRecords = await Attendance.find({
    companyId: ctx.companyId,
    employeeId: ctx.employeeId,
    date: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
  }).lean();

  const policy = await attendanceService.getPolicy(ctx.companyId);
  const holidays = await attendanceService.holidaySet(ctx.companyId, `${year}-01-01`, `${year}-12-31`);
  let yearWorking = 0;
  for (let mo = 1; mo <= 12; mo += 1) {
    yearWorking += attendanceRules.workingDaysInMonth(`${year}-${String(mo).padStart(2, "0")}`, ctx.employee, policy, holidays);
  }
  const yearSummary = attendanceRules.summarize(yearRecords, { workingDays: yearWorking });

  return ok(
    res,
    {
      employeeId: ctx.employeeId,
      companyId: String(ctx.companyId),
      shift: { start: ctx.employee.shiftStart || "", end: ctx.employee.shiftEnd || "", weeklyOff: ctx.employee.weeklyOff || "" },
      month,
      records,
      monthly: monthly.rows?.[0] || null,
      yearSummary,
    },
    "Attendance"
  );
});

const clock = (kind) =>
  asyncHandler(async (req, res) => {
    const ctx = await resolveEmployeeContext(req.user._id);
    if (!ctx) return fail(res, "No employee record linked to this login", 404);
    const date = todayKey();
    const existing = await Attendance.findOne({ companyId: ctx.companyId, employeeId: ctx.employeeId, date }).lean();
    if (["ABSENT", "ON_LEAVE"].includes(String(existing?.status || ""))) {
      return fail(res, `Today is marked ${existing.status}. Ask your company to change it first.`, 409);
    }
    if (kind === "in" && existing?.checkIn) return fail(res, "Already checked in today", 409);
    if (kind === "out" && existing?.checkOut) return fail(res, "Already checked out today", 409);
    if (kind === "out" && !existing?.checkIn) return fail(res, "Check in before checking out", 409);

    try {
      const time = String(req.body.time || nowHM());
      const record = await writeAttendance(
        ctx.companyId,
        {
          employeeId: ctx.employeeId,
          date,
          [kind === "in" ? "checkIn" : "checkOut"]: time,
          mode: "SELF",
        },
        req.user.name || req.user.username || "Employee"
      );
      return ok(res, { attendance: record }, kind === "in" ? "Checked in successfully" : "Checked out successfully");
    } catch (err) {
      return fail(res, err.message || "Could not record attendance", err.status || 500);
    }
  });

const leaveRequest = asyncHandler(async (req, res) => {
  const ctx = await resolveEmployeeContext(req.user._id);
  if (!ctx) return fail(res, "No employee record linked to this login", 404);
  const date = String(req.body.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, "date (YYYY-MM-DD) is required", 400);

  const record = await Attendance.findOneAndUpdate(
    { companyId: ctx.companyId, employeeId: ctx.employeeId, date },
    {
      $setOnInsert: {
        companyId: ctx.companyId,
        companyCode: ctx.employee.companyCode || "",
        employeeId: ctx.employeeId,
        employeeName: ctx.employee.name || "",
        department: ctx.employee.department || "",
        date,
        status: "ABSENT",
      },
      $push: {
        correctionRequests: {
          requestedBy: ctx.employeeId,
          reason: String(req.body.reason || "").trim(),
          requestedStatus: "ON_LEAVE",
        },
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return ok(res, { attendance: record }, "Leave request submitted successfully");
});

module.exports = {
  employeeMe,
  getEmployeeDashboard,
  getMyAttendance,
  checkIn: clock("in"),
  checkOut: clock("out"),
  leaveRequest,
};
