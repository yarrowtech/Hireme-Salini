// admin.api.js
import api from "./axios";

/* ===========================
   AUTH
=========================== */
export async function adminLogin(payload) {
  const res = await api.post("/api/admin/auth/login", payload);
  return res.data;
}

export async function adminLogout() {
  const res = await api.post("/api/admin/auth/logout");
  return res.data;
}

export async function getAdminMe() {
  const res = await api.get("/api/admin/auth/me");
  return res.data;
}

/* ===========================
   ✅ DASHBOARD OVERVIEW
   GET /api/admin/dashboard/overview
=========================== */
export async function getAdminDashboardOverview() {
  const res = await api.get("/api/admin/dashboard/overview");
  return res.data;
}

/* ===========================
   COMPANY REQUESTS
=========================== */

/**
 * ✅ generic (recommended)
 * IMPORTANT:
 * Your router (as you shared) has:
 *  - /api/admin/company/requests/pending
 *  - /api/admin/company/requests/approved
 *  - /api/admin/company/requests/rejected
 *
 * It DOES NOT show: /api/admin/company/requests  (generic)
 * So we map generic => correct route automatically.
 */
export async function getCompanyRequests(status) {
  const s = String(status || "PENDING").toUpperCase();

  if (s === "APPROVED") return await getApprovedCompanyRequests();
  if (s === "REJECTED") return await getRejectedCompanyRequests();
  return await getPendingCompanyRequests();
}

// ✅ specific (optional convenience)
export async function getPendingCompanyRequests() {
  const res = await api.get("/api/admin/company/requests/pending");
  return res.data;
}

export async function getApprovedCompanyRequests() {
  const res = await api.get("/api/admin/company/requests/approved");
  return res.data;
}

export async function getRejectedCompanyRequests() {
  const res = await api.get("/api/admin/company/requests/rejected");
  return res.data;
}

/**
 * ✅ details for modal (IF you really have this route)
 * If you DON'T have: GET /api/admin/company/requests/:id
 * then use getCompanyDetails(companyId) instead.
 */
export async function getCompanyRequestById(requestId) {
  const res = await api.get(`/api/admin/company/requests/${requestId}`);
  return res.data;
}

export async function approveCompanyRequest(requestId) {
  const res = await api.post(`/api/admin/company/requests/${requestId}/approve`);
  return res.data;
}

export async function rejectCompanyRequest(requestId, payload) {
  const res = await api.post(`/api/admin/company/requests/${requestId}/reject`, payload);
  return res.data;
}

/* ===========================
   ✅ COMPANY DETAILS (plan + company code + docs)
   GET /api/admin/company/:companyId
=========================== */
export async function getCompanyDetails(companyId) {
  const res = await api.get(`/api/admin/company/${companyId}`);
  return res.data;
}

/* ===========================
   ✅ DOCS
=========================== */

// ✅ document list (optional, if details doesn't already include docs)
export async function getCompanyDocuments(companyId) {
  const res = await api.get(`/api/admin/company/${companyId}/documents`);
  return res.data;
}

/**
 * ✅ Returns { url, name } (JSON)
 * Backend route:
 * GET /api/admin/company/:companyId/documents/:docKey
 */
export async function getCompanyDocument(companyId, docKey) {
  const res = await api.get(`/api/admin/company/${companyId}/documents/${docKey}`);
  return res.data;
}

/**
 * ✅ NEW: Document view as BLOB (works for stream/pdf)
 * NOTE:
 * Your backend currently returns JSON with cloud URL,
 * not a PDF stream. But keeping this for future streaming support.
 *
 * ✅ Using correct route: /documents/:docKey
 */
export async function getCompanyDocumentBlob(companyId, docKey) {
  const res = await api.get(`/api/admin/company/${companyId}/documents/${docKey}`, {
    responseType: "blob",
  });
  return res.data;
}

/* ===========================
   ✅ DELETE COMPANY
=========================== */
export async function deleteCompany(companyId) {
  const res = await api.delete(`/api/admin/company/${companyId}`);
  return res.data;
}


/* ===========================
   ✅ PLANS
=========================== */
export async function getAdminPlans() {
  const res = await api.get("/api/admin/plans");
  return res.data;
}

/* ===========================
   ✅ UPDATE SUBSCRIPTION (Upgrade)
=========================== */
export async function updateCompanySubscription(companyId, payload) {
  const res = await api.put(`/api/admin/company/${companyId}/subscription`, payload);
  return res.data;
}
