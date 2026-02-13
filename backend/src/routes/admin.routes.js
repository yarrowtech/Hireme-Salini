// src/routes/admin.routes.js
const router = require("express").Router();
const { adminOnly } = require("../middleware/adminAuth");

const {
  // AUTH
  adminLogin,
  adminMe,
  adminLogout,

  // LISTS
  listPendingCompanies,
  listApprovedCompanies,
  listRejectedCompanies,

  // ACTIONS
  approveCompany,
  rejectCompany,

  // ✅ DETAILS + DOCS + DELETE
  getCompanyById,
  getCompanyDocuments,
  getCompanyDocument,
  deleteCompany,
 getAdminPlans,
 updateCompanySubscription,
  // ✅ DASHBOARD OVERVIEW
  getAdminDashboardOverview,
} = require("../controllers/admin.controller");

/* ===========================
   AUTH
=========================== */
router.post("/auth/login", adminLogin);
router.get("/auth/me", adminOnly, adminMe);
router.post("/auth/logout", adminOnly, adminLogout);

/* ===========================
   ✅ DASHBOARD
=========================== */
router.get("/dashboard/overview", adminOnly, getAdminDashboardOverview);

/* ===========================
   COMPANY REQUESTS (by status)
=========================== */
router.get("/company/requests/pending", adminOnly, listPendingCompanies);
router.get("/company/requests/approved", adminOnly, listApprovedCompanies);
router.get("/company/requests/rejected", adminOnly, listRejectedCompanies);

/* ===========================
   APPROVE / REJECT
=========================== */
router.post("/company/requests/:companyId/approve", adminOnly, approveCompany);
router.post("/company/requests/:companyId/reject", adminOnly, rejectCompany);

/* ===========================
   ✅ COMPANY DETAILS + DOCS + DELETE
=========================== */
router.get("/company/:companyId", adminOnly, getCompanyById);
router.get("/company/:companyId/documents", adminOnly, getCompanyDocuments);
router.get("/company/:companyId/documents/:docKey", adminOnly, getCompanyDocument);
router.delete("/company/:companyId", adminOnly, deleteCompany);


// ✅ PLANS (catalog for UI)
router.get("/plans", adminOnly, getAdminPlans);

// ✅ UPDATE SUBSCRIPTION (upgrade / change plan)
router.put("/company/:companyId/subscription", adminOnly, updateCompanySubscription);



module.exports = router;
