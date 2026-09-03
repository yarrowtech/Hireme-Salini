// src/api/company.api.js
import api, { buildFileUrl } from "./axios";

function readStoredUser() {
  try {
    const raw = localStorage.getItem("user") || localStorage.getItem("authUser") || localStorage.getItem("currentUser") || "";
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const companyApi = {
  async sendRequest(payload) {
    const fd = new FormData();

    fd.append("CompanyName", payload?.CompanyName?.trim?.() || "");  
    fd.append("Contact", payload?.Contact?.trim?.() || "");
    fd.append("Email", payload?.Email?.trim?.() || "");
    fd.append("Address", payload?.Address?.trim?.() || "");
    fd.append("CIN", payload?.CIN?.trim?.() || "");
    fd.append("PAN_No", payload?.PAN_No?.trim?.() || "");

    fd.append("planKey", payload?.planKey || "");
    fd.append("billingCycle", payload?.billingCycle || "");

    const files = payload?.files || {};
    Object.entries(files).forEach(([key, file]) => {
      if (file instanceof File) fd.append(key, file, file.name);
    });

    const res = await api.post("/api/company/request", fd);
    return res.data;
  },

  async listMyRequests(params = {}) {
    const res = await api.get("/api/company/requests", { params });
    return res.data;
  },

  async getRequestById(requestId) {
    const res = await api.get(`/api/company/requests/${requestId}`);
    return res.data;
  },

  getDocUrl(requestId, docKey) {
    return buildFileUrl(`/api/company/requests/${requestId}/docs/${docKey}`);
  },

  async getRequestDoc(requestId, docKey) {
    const res = await api.get(`/api/company/requests/${requestId}/docs/${docKey}`, {
      responseType: "blob",
    });
    return res.data;
  },

  async resolveCompanyId() {
    const authRole = String(localStorage.getItem("authRole") || "").toUpperCase();
    const storedUser =
      readStoredUser() ||
      (() => {
        try {
          const raw = localStorage.getItem("authUser") || "";
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();

    const storedCompanyId =
      storedUser?.companyId ||
      storedUser?.CompanyId ||
      storedUser?.company?.id ||
      storedUser?.company?._id ||
      storedUser?.user?.companyId ||
      storedUser?.user?.CompanyId ||
      "";

    if (storedCompanyId) {
      localStorage.setItem("companyId", String(storedCompanyId));
      localStorage.setItem("activeCompanyId", String(storedCompanyId));
      return String(storedCompanyId);
    }

    const fromStorage = localStorage.getItem("companyId") || localStorage.getItem("activeCompanyId") || "";
    if (fromStorage) {
      if (authRole === "COMPANY" && storedCompanyId && String(fromStorage) !== String(storedCompanyId)) {
        localStorage.setItem("companyId", String(storedCompanyId));
        localStorage.setItem("activeCompanyId", String(storedCompanyId));
        return String(storedCompanyId);
      }
      return fromStorage;
    }

    const user = readStoredUser();
    const email = user?.Email || user?.email || user?.user?.Email || user?.user?.email || "";
    if (email) {
      const res = await this.listMyRequests({ email });
      const first = res?.requests?.[0];
      if (first?._id) {
        localStorage.setItem("companyId", first._id);
        return first._id;
      }
    }

    return "";
  },

  async getCompanyDashboard(companyId) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/dashboard`);
    return res.data;
  },

  async getCompanyAnalytics(companyId) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/analytics`);
    return res.data;
  },

  async getCompanyEmployees(companyId) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/employees`);
    return res.data;
  },

  async upsertCompanyEmployee(companyId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.post(`/api/company/${id}/employees`, payload);
    return res.data;
  },

  async deleteCompanyEmployee(companyId, employeeId) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.delete(`/api/company/${id}/employees/${employeeId}`);
    return res.data;
  },

  async getCompanySubscription(companyId) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/subscription`);
    return res.data;
  },

  async upsertCompanySubscription(companyId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.post(`/api/company/${id}/subscription`, payload);
    return res.data;
  },

  async getCompanyPayroll(companyId) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/payroll`);
    return res.data;
  },

  async submitCompanyPayroll(companyId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.post(`/api/company/${id}/payroll`, payload);
    return res.data;
  },
};

export default companyApi;
