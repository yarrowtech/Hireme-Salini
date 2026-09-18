// src/api/employee.api.js
import api from "./axios";

export const employeeApi = {
  async me() {
    const res = await api.get("/api/employee/me");
    return res.data;
  },

  async getDashboard(params = {}) {
    const res = await api.get("/api/employee/dashboard", { params });
    return res.data;
  },

  async getAttendance(params = {}) {
    const res = await api.get("/api/employee/attendance", { params });
    return res.data;
  },

  async checkIn(payload = {}) {
    const res = await api.post("/api/employee/attendance/check-in", payload);
    return res.data;
  },

  async checkOut(payload = {}) {
    const res = await api.post("/api/employee/attendance/check-out", payload);
    return res.data;
  },

  async leaveRequest(payload) {
    const res = await api.post("/api/employee/attendance/leave-request", payload);
    return res.data;
  },
};

export default employeeApi;
