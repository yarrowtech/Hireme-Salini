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

function readAuthTokenPayload() {
  try {
    const token = localStorage.getItem("authToken") || "";
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
  } catch {
    return null;
  }
}

function isAuthTokenExpired() {
  const payload = readAuthTokenPayload();
  if (!payload?.exp) return false;
  return Number(payload.exp) * 1000 <= Date.now();
}

function clearExpiredCompanySession() {
  localStorage.removeItem("authToken");
  localStorage.setItem("authSessionExpired", "true");
}

function readTokenCompanyId() {
  if (isAuthTokenExpired()) {
    clearExpiredCompanySession();
    return "";
  }

  const decoded = readAuthTokenPayload();
  return decoded?.companyId ? String(decoded.companyId) : "";
}

export const companyApi = {
  isAuthTokenExpired,

  clearExpiredCompanySession,

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
    const tokenCompanyId = readTokenCompanyId();
    if (tokenCompanyId) {
      localStorage.setItem("companyId", tokenCompanyId);
      localStorage.setItem("activeCompanyId", tokenCompanyId);
      return tokenCompanyId;
    }

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

  async getCompanyEmployee(companyId, employeeId) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id || !employeeId) return null;
    const res = await api.get(`/api/company/${id}/employees/${encodeURIComponent(employeeId)}`);
    return res.data;
  },

  async upsertCompanyEmployee(companyId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.post(`/api/company/${id}/employees`, payload);
    return res.data;
  },

  async saveEmployeePortalLogin(companyId, employeeId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id || !employeeId) return null;
    const res = await api.post(`/api/company/${id}/employees/${encodeURIComponent(employeeId)}/portal-login`, payload);
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

  async getCompanyPayroll(companyId, params = {}) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/payroll`, { params });
    return res.data;
  },

  async submitCompanyPayroll(companyId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.post(`/api/company/${id}/payroll`, payload);
    return res.data;
  },

  async getCompanyAttendance(companyId, params = {}) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/attendance`, { params });
    return res.data;
  },

  async getAttendanceDaily(companyId, params = {}) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/attendance/daily`, { params });
    return res.data;
  },

  async getAttendanceMonthly(companyId, params = {}) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/attendance/monthly`, { params });
    return res.data;
  },

  async getAttendanceYearly(companyId, params = {}) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/attendance/yearly`, { params });
    return res.data;
  },

  async bulkAttendance(companyId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.post(`/api/company/${id}/attendance/bulk`, payload);
    return res.data;
  },

  async runAutoAbsent(companyId, payload = {}) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.post(`/api/company/${id}/attendance/run-auto-absent`, payload);
    return res.data;
  },

  async getAttendancePolicy(companyId) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/attendance/policy`);
    return res.data;
  },

  async saveAttendancePolicy(companyId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.put(`/api/company/${id}/attendance/policy`, payload);
    return res.data;
  },

  async getHolidays(companyId, params = {}) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/holidays`, { params });
    return res.data;
  },

  async saveHoliday(companyId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.post(`/api/company/${id}/holidays`, payload);
    return res.data;
  },

  async deleteHoliday(companyId, holidayId) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id || !holidayId) return null;
    const res = await api.delete(`/api/company/${id}/holidays/${holidayId}`);
    return res.data;
  },

  async upsertCompanyAttendance(companyId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.post(`/api/company/${id}/attendance`, payload);
    return res.data;
  },

  async requestAttendanceCorrection(companyId, employeeId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id || !employeeId) return null;
    const res = await api.post(`/api/company/${id}/employees/${encodeURIComponent(employeeId)}/attendance-corrections`, payload);
    return res.data;
  },

  async reviewAttendanceCorrection(companyId, attendanceId, requestId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id || !attendanceId || !requestId) return null;
    const res = await api.post(`/api/company/${id}/attendance/${attendanceId}/corrections/${requestId}/review`, payload);
    return res.data;
  },

  async getCompanySalaryStructures(companyId, params = {}) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.get(`/api/company/${id}/salary-structures`, { params });
    return res.data;
  },

  async upsertCompanySalaryStructure(companyId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.post(`/api/company/${id}/salary-structures`, payload);
    return res.data;
  },

  async createPayrollRun(companyId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id) return null;
    const res = await api.post(`/api/company/${id}/payroll-runs`, payload);
    return res.data;
  },

  async lockPayrollAttendance(companyId, runId, payload = {}) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id || !runId) return null;
    const res = await api.post(`/api/company/${id}/payroll-runs/${runId}/lock-attendance`, payload);
    return res.data;
  },

  async calculatePayrollRun(companyId, runId) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id || !runId) return null;
    const res = await api.post(`/api/company/${id}/payroll-runs/${runId}/calculate`);
    return res.data;
  },

  async approvePayrollRun(companyId, runId, payload = {}) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id || !runId) return null;
    const res = await api.post(`/api/company/${id}/payroll-runs/${runId}/approve`, payload);
    return res.data;
  },

  async confirmPayrollPayment(companyId, runId, payload) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id || !runId) return null;
    const res = await api.post(`/api/company/${id}/payroll-runs/${runId}/payments`, payload);
    return res.data;
  },

  async getEmployeePayslip(companyId, employeeId, params = {}) {
    const id = companyId || (await this.resolveCompanyId());
    if (!id || !employeeId) return null;
    const res = await api.get(`/api/company/${id}/employees/${encodeURIComponent(employeeId)}/payslip`, { params });
    return res.data;
  },
};

export default companyApi;
