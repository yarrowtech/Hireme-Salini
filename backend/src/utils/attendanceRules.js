/**
 * Pure attendance rules engine.
 *
 * Given an employee's shift configuration (from CompanyEmployeeData), the company
 * attendance policy (CompanyServiceAccess.attendancePolicy) and the day's
 * check-in / check-out times, derive the daily status and the metrics that feed
 * payroll (late minutes, worked hours, overtime).
 *
 * No DB access here — everything is a pure function so it can be unit tested and
 * reused by the controller, the aggregation service, the payroll calculator and
 * the nightly auto-absent job.
 */

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const DEFAULT_POLICY = {
  graceMinutes: 10,
  halfDayMaxHours: 4.5,
  fullDayHours: 8,
  overtimeAfterHours: 9,
  weeklyOffDays: ["Sunday"],
  autoAbsentEnabled: true,
  autoAbsentHour: 1,
};

function resolvePolicy(policy) {
  return { ...DEFAULT_POLICY, ...(policy || {}) };
}

/** "HH:MM" -> minutes since midnight, or null */
function hmToMin(value) {
  const text = String(value || "").trim();
  const m = text.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

function minToHours(min) {
  return Math.round((Number(min || 0) / 60) * 100) / 100;
}

/** "2026-09-08" -> "Tuesday" */
function weekdayName(dateStr) {
  const d = new Date(`${String(dateStr || "").slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return WEEKDAYS[d.getUTCDay()].replace(/^./, (c) => c.toUpperCase());
}

/** Employee weeklyOff string ("Sunday", "Sun, Sat", "Saturday/Sunday") -> ["sunday", ...] */
function parseWeeklyOff(value) {
  return String(value || "")
    .split(/[,/;|]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .map((part) => WEEKDAYS.find((day) => day.startsWith(part)) || "")
    .filter(Boolean);
}

function resolveWeeklyOff(employee, policy) {
  const fromEmployee = parseWeeklyOff(employee?.weeklyOff);
  if (fromEmployee.length) return fromEmployee;
  const p = resolvePolicy(policy);
  return (p.weeklyOffDays || []).map((d) => String(d).toLowerCase());
}

function isWeeklyOff(dateStr, employee, policy) {
  const name = weekdayName(dateStr).toLowerCase();
  return resolveWeeklyOff(employee, policy).includes(name);
}

const MANUAL_OVERRIDE_IGNORE = new Set(["", "AUTO", "NOT_MARKED", "PENDING"]);

/**
 * @param {object} input  { dateStr, checkIn, checkOut, manualStatus, isHoliday, isPastDay }
 * @param {object} employee { shiftStart, shiftEnd, weeklyOff, shiftName }
 * @param {object} policy
 * @returns {{ status, lateMinutes, earlyMinutes, workedHours, overtimeHours }}
 */
function deriveAttendance(input, employee, policy) {
  const p = resolvePolicy(policy);
  const { dateStr, checkIn, checkOut, manualStatus, isHoliday, isPastDay } = input || {};

  const shiftStart = hmToMin(employee?.shiftStart);
  const shiftEnd = hmToMin(employee?.shiftEnd);
  let inMin = hmToMin(checkIn);
  let outMin = hmToMin(checkOut);

  // Overnight shift / past-midnight checkout.
  if (inMin != null && outMin != null && outMin <= inMin) outMin += 24 * 60;

  let lateMinutes = 0;
  let earlyMinutes = 0;
  let workedHours = 0;
  let overtimeHours = 0;

  if (inMin != null && shiftStart != null) lateMinutes = Math.max(0, inMin - shiftStart);
  if (outMin != null && shiftEnd != null) earlyMinutes = Math.max(0, shiftEnd - outMin);
  if (inMin != null && outMin != null) workedHours = minToHours(outMin - inMin);

  if (inMin != null && outMin != null) {
    if (shiftEnd != null) {
      overtimeHours = Math.max(0, minToHours(outMin - shiftEnd));
    } else if (workedHours > p.overtimeAfterHours) {
      overtimeHours = Math.round((workedHours - p.fullDayHours) * 100) / 100;
    }
    if (overtimeHours < 0.5) overtimeHours = 0;
  }

  // ---- status precedence ----
  let status;
  const override = String(manualStatus || "").toUpperCase().replace(/\s+/g, "_");
  if (!MANUAL_OVERRIDE_IGNORE.has(override)) {
    status = override;
  } else if (isHoliday) {
    status = "HOLIDAY";
  } else if (isWeeklyOff(dateStr, employee, policy)) {
    status = "WEEKLY_OFF";
  } else if (inMin == null) {
    status = isPastDay ? "ABSENT" : "NOT_MARKED";
  } else if (outMin == null) {
    status = lateMinutes > p.graceMinutes ? "LATE" : isPastDay ? "MISSING_CHECKOUT" : "PRESENT";
  } else if (workedHours > 0 && workedHours < p.halfDayMaxHours) {
    status = "HALF_DAY";
  } else {
    status = lateMinutes > p.graceMinutes ? "LATE" : "PRESENT";
  }

  return {
    status,
    lateMinutes: status === "LATE" || status === "PRESENT" || status === "HALF_DAY" || status === "MISSING_CHECKOUT" ? lateMinutes : 0,
    earlyMinutes,
    workedHours,
    overtimeHours,
  };
}

/** number of paid working days in a month for one employee (calendar - weekly offs - holidays) */
function workingDaysInMonth(month, employee, policy, holidaySet) {
  const normalized = String(month || "").slice(0, 7);
  const [year, mon] = normalized.split("-").map(Number);
  if (!year || !mon) return 0;
  const days = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  let count = 0;
  for (let day = 1; day <= days; day += 1) {
    const dateStr = `${normalized}-${String(day).padStart(2, "0")}`;
    if (isWeeklyOff(dateStr, employee, policy)) continue;
    if (holidaySet && holidaySet.has(dateStr)) continue;
    count += 1;
  }
  return count;
}

const PRESENT_STATUSES = ["PRESENT", "LATE", "WORK_FROM_HOME", "MISSING_CHECKOUT"];

/** roll up a list of attendance records into counts + payable days + % */
function summarize(records, opts = {}) {
  const summary = {
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    holiday: 0,
    weeklyOff: 0,
    workFromHome: 0,
    missingCheckout: 0,
    overtimeHours: 0,
    lateMinutes: 0,
    pendingCorrections: 0,
    marked: 0,
  };

  for (const record of records || []) {
    const status = String(record.status || "").toUpperCase();
    summary.marked += 1;
    if (PRESENT_STATUSES.includes(status)) summary.present += 1;
    if (status === "ABSENT") summary.absent += 1;
    if (status === "LATE") summary.late += 1;
    if (status === "HALF_DAY") {
      summary.halfDay += 1;
      summary.present += 0.5; // half a present day
    }
    if (status === "ON_LEAVE") summary.onLeave += 1;
    if (status === "HOLIDAY") summary.holiday += 1;
    if (status === "WEEKLY_OFF") summary.weeklyOff += 1;
    if (status === "WORK_FROM_HOME") summary.workFromHome += 1;
    if (status === "MISSING_CHECKOUT") summary.missingCheckout += 1;
    summary.overtimeHours += Number(record.overtimeHours || 0);
    summary.lateMinutes += Number(record.lateMinutes || 0);
    summary.pendingCorrections += (record.correctionRequests || []).filter((r) => r.status === "PENDING").length;
  }

  const paidLeave = summary.onLeave; // treat approved leave as paid unless extended later
  summary.payableDays =
    Math.round(
      (summary.present + summary.holiday + summary.weeklyOff + paidLeave) * 100
    ) / 100;

  const workingDays = Number(opts.workingDays || 0);
  summary.workingDays = workingDays;
  summary.attendancePct = workingDays
    ? Math.round((Math.min(summary.present, workingDays) / workingDays) * 100)
    : 0;

  return summary;
}

module.exports = {
  WEEKDAYS,
  DEFAULT_POLICY,
  resolvePolicy,
  hmToMin,
  minToHours,
  weekdayName,
  parseWeeklyOff,
  resolveWeeklyOff,
  isWeeklyOff,
  deriveAttendance,
  workingDaysInMonth,
  summarize,
  PRESENT_STATUSES,
};
