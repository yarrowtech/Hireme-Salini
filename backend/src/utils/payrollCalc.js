/**
 * Shared payroll math so the payroll run calculator and the monthly attendance
 * view produce identical numbers.
 */
const { summarize, workingDaysInMonth } = require("./attendanceRules");

function numeric(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function salaryGross(structure) {
  return (
    numeric(structure?.basic) +
    numeric(structure?.hra) +
    numeric(structure?.conveyance) +
    numeric(structure?.medicalAllowance) +
    numeric(structure?.specialAllowance) +
    numeric(structure?.bonus)
  );
}

function salaryFixedDeductions(structure) {
  return (
    numeric(structure?.pf) +
    numeric(structure?.esi) +
    numeric(structure?.professionalTax) +
    numeric(structure?.incomeTax) +
    numeric(structure?.insurance) +
    numeric(structure?.otherDeductions)
  );
}

/**
 * @param {object} employee  { employeeId, id, name, department, role, status, shiftStart, shiftEnd, weeklyOff }
 * @param {Array}  records    that employee's attendance rows for the month
 * @param {object} structure  latest SalaryStructure effective for the period (or null)
 * @param {object} ctx        { month, policy, holidaySet }
 * @returns payroll item (without `status`)
 */
function computePayItem(employee, records, structure, ctx = {}) {
  const { month, policy, holidaySet } = ctx;
  const workingDays = workingDaysInMonth(month, employee, policy, holidaySet) || 30;
  const summary = summarize(records, { workingDays });

  // Every working day is paid unless the employee was absent / on unpaid half-day.
  // present already includes 0.5 per half-day; approved leave (onLeave) is paid.
  const accounted = Math.min(workingDays, summary.present + summary.onLeave);
  const payableDays = Math.round(accounted * 100) / 100;
  const unpaidDays = Math.max(0, Math.round((workingDays - payableDays) * 100) / 100);

  const gross = salaryGross(structure);
  const perDay = workingDays ? gross / workingDays : 0;
  const attendanceDeduction = Math.round(perDay * unpaidDays);
  const overtimePay = Math.round(numeric(structure?.overtimeRatePerHour) * summary.overtimeHours);
  const statutoryDeductions = salaryFixedDeductions(structure);
  const totalDeductions = Math.round(attendanceDeduction + statutoryDeductions);
  const grossSalary = Math.round(gross + overtimePay);
  const netSalary = Math.max(0, Math.round(gross + overtimePay - totalDeductions));

  return {
    employeeId: employee.employeeId || employee.id,
    employeeName: employee.name || "Employee",
    department: employee.department || "General",
    role: employee.role || "Employee",
    workingDays,
    presentDays: summary.present,
    paidLeave: summary.onLeave,
    unpaidLeave: unpaidDays,
    absentDays: summary.absent,
    lateDays: summary.late,
    halfDays: summary.halfDay,
    overtimeHours: summary.overtimeHours,
    payableDays,
    grossSalary,
    attendanceDeduction,
    statutoryDeductions,
    otherDeductions: numeric(structure?.otherDeductions),
    totalDeductions,
    netSalary,
    salaryStructureId: structure?._id || null,
  };
}

module.exports = { numeric, salaryGross, salaryFixedDeductions, computePayItem };
