// src/routes/company.routes.js
const router = require("express").Router();

const {
  sendRequest,
  listRequests,
  getRequestById,
  getRequestDoc,
  getCompanyDashboard,
  getCompanyAnalytics,
  getCompanyEmployees,
  getCompanyEmployeeById,
  upsertCompanyEmployees,
  upsertCompanyEmployeePortalLogin,
  deleteCompanyEmployee,
  getCompanySubscription,
  upsertCompanySubscription,
  getCompanyPayroll,
  submitCompanyPayroll,
  getCompanyAttendance,
  upsertCompanyAttendance,
  bulkCompanyAttendance,
  getCompanyAttendanceDaily,
  getCompanyAttendanceMonthly,
  getCompanyAttendanceYearly,
  runCompanyAutoAbsent,
  getCompanyAttendancePolicy,
  updateCompanyAttendancePolicy,
  listCompanyHolidays,
  createCompanyHoliday,
  deleteCompanyHoliday,
  requestAttendanceCorrection,
  reviewAttendanceCorrection,
  getCompanySalaryStructures,
  upsertCompanySalaryStructure,
  createPayrollRun,
  lockPayrollAttendance,
  calculatePayrollRun,
  approvePayrollRun,
  confirmPayrollPayment,
  getEmployeePayslip,
} = require("../controllers/company.controller");
const { auth } = require("../middleware/auth");

const { validate } = require("../middleware/validate");
const { sendRequestSchema } = require("../validators/company.validators");
const { uploadCompanyDocs } = require("../middleware/uploadCompanyDocs");

// ✅ POST /api/company/request  (multipart/form-data)
router.post(
  "/request",
  uploadCompanyDocs, // multer MUST come before validate (so req.body exists)
  validate(sendRequestSchema),
  sendRequest
);

// ✅ GET /api/company/requests?email=...  OR  ?cin=...
router.get("/requests", listRequests);

// ✅ GET /api/company/requests/:id
router.get("/requests/:requestId", getRequestById);

// 🔥 Get document (PDF)
router.get(
  "/requests/:requestId/docs/:docKey",
  getRequestDoc
);

// Company portal data endpoints
router.get("/:companyId/dashboard", auth, getCompanyDashboard);
router.get("/:companyId/analytics", auth, getCompanyAnalytics);
router.get("/:companyId/employees", auth, getCompanyEmployees);
router.get("/:companyId/employees/:employeeId", auth, getCompanyEmployeeById);
router.post("/:companyId/employees", auth, upsertCompanyEmployees);
router.post("/:companyId/employees/:employeeId/portal-login", auth, upsertCompanyEmployeePortalLogin);
router.delete("/:companyId/employees/:employeeId", auth, deleteCompanyEmployee);
router.get("/:companyId/subscription", auth, getCompanySubscription);
router.post("/:companyId/subscription", auth, upsertCompanySubscription);
router.get("/:companyId/payroll", auth, getCompanyPayroll);
router.post("/:companyId/payroll", auth, submitCompanyPayroll);
router.get("/:companyId/attendance", auth, getCompanyAttendance);
router.get("/:companyId/attendance/daily", auth, getCompanyAttendanceDaily);
router.get("/:companyId/attendance/monthly", auth, getCompanyAttendanceMonthly);
router.get("/:companyId/attendance/yearly", auth, getCompanyAttendanceYearly);
router.get("/:companyId/attendance/policy", auth, getCompanyAttendancePolicy);
router.put("/:companyId/attendance/policy", auth, updateCompanyAttendancePolicy);
router.post("/:companyId/attendance", auth, upsertCompanyAttendance);
router.post("/:companyId/attendance/bulk", auth, bulkCompanyAttendance);
router.post("/:companyId/attendance/run-auto-absent", auth, runCompanyAutoAbsent);
router.get("/:companyId/holidays", auth, listCompanyHolidays);
router.post("/:companyId/holidays", auth, createCompanyHoliday);
router.delete("/:companyId/holidays/:holidayId", auth, deleteCompanyHoliday);
router.post("/:companyId/employees/:employeeId/attendance-corrections", auth, requestAttendanceCorrection);
router.post("/:companyId/attendance/:attendanceId/corrections/:requestId/review", auth, reviewAttendanceCorrection);
router.get("/:companyId/salary-structures", auth, getCompanySalaryStructures);
router.post("/:companyId/salary-structures", auth, upsertCompanySalaryStructure);
router.post("/:companyId/payroll-runs", auth, createPayrollRun);
router.post("/:companyId/payroll-runs/:runId/lock-attendance", auth, lockPayrollAttendance);
router.post("/:companyId/payroll-runs/:runId/calculate", auth, calculatePayrollRun);
router.post("/:companyId/payroll-runs/:runId/approve", auth, approvePayrollRun);
router.post("/:companyId/payroll-runs/:runId/payments", auth, confirmPayrollPayment);
router.get("/:companyId/employees/:employeeId/payslip", auth, getEmployeePayslip);

module.exports = router;
