import api from "./axios";

export const companyApi = {
  // ✅ Become Partner (multipart/form-data)
  async sendRequest(payload) {
    const fd = new FormData();

    // text
    fd.append("CompanyName", payload?.CompanyName?.trim?.() || "");
    fd.append("Contact", payload?.Contact?.trim?.() || "");
    fd.append("Email", payload?.Email?.trim?.() || "");
    fd.append("Address", payload?.Address?.trim?.() || "");
    fd.append("CIN", payload?.CIN?.trim?.() || "");
    fd.append("PAN_No", payload?.PAN_No?.trim?.() || "");

    // ✅ plan
    fd.append("planKey", payload?.planKey || "");
    fd.append("billingCycle", payload?.billingCycle || "");
    // files
    const files = payload?.files || {};
    Object.entries(files).forEach(([key, file]) => {
      if (file instanceof File) {
        fd.append(key, file, file.name);
      }
    });

    // ✅ IMPORTANT: don't set Content-Type manually for FormData
    const res = await api.post("/api/company/request", fd);
    return res.data;
  },

  // (Optional - only keep if backend exists)
  async listMyRequests(params = {}) {
    const res = await api.get("/api/company/requests", { params });
    return res.data;
  },

  async getRequestById(id) {
    const res = await api.get(`/api/company/requests/${id}`);
    return res.data;
  },

  async getRequestDoc(requestId, docKey) {
    const res = await api.get(`/api/company/requests/${requestId}/docs/${docKey}`);
    return res.data;
  },

  // Admin APIs (only keep if backend exists + protected)
  async listPendingRequests() {
    const res = await api.get("/api/company/admin/requests/pending");
    return res.data;
  },

  async approveRequest(requestId, body = {}) {
    const res = await api.post(`/api/company/admin/requests/${requestId}/approve`, body);
    return res.data;
  },

  async rejectRequest(requestId, body = {}) {
    const res = await api.post(`/api/company/admin/requests/${requestId}/reject`, body);
    return res.data;
  },
};

export default companyApi;
