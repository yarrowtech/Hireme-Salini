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
  upsertCompanyEmployees,
  deleteCompanyEmployee,
  getCompanyHrAccounts,
  upsertCompanyHrAccount,
  deleteCompanyHrAccount,
  getHrManagedEmployees,
  getCompanySubscription,
  upsertCompanySubscription,
  getCompanyPayroll,
  submitCompanyPayroll,
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
router.post("/:companyId/employees", auth, upsertCompanyEmployees);
router.delete("/:companyId/employees/:employeeId", auth, deleteCompanyEmployee);
router.get("/:companyId/hr", auth, getCompanyHrAccounts);
router.post("/:companyId/hr", auth, upsertCompanyHrAccount);
router.delete("/:companyId/hr/:hrId", auth, deleteCompanyHrAccount);
router.get("/:companyId/hr/:hrId/employees", auth, getHrManagedEmployees);
router.get("/:companyId/subscription", auth, getCompanySubscription);
router.post("/:companyId/subscription", auth, upsertCompanySubscription);
router.get("/:companyId/payroll", auth, getCompanyPayroll);
router.post("/:companyId/payroll", auth, submitCompanyPayroll);

module.exports = router;
