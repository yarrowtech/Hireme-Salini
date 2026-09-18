// src/api/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // http://localhost:5000
  withCredentials: true,
});

/* ===============================
   REQUEST INTERCEPTOR
================================ */
api.interceptors.request.use((config) => {
  /**
   * Priority:
   * 1️⃣ Admin token (for admin routes)
   * 2️⃣ User/Guest token
   */
  const adminToken = localStorage.getItem("adminAuthToken");
  const userToken = localStorage.getItem("authToken");
  const requestUrl = String(config.url || "");
  const isAdminRequest = requestUrl.includes("/api/admin");

  if (isAdminRequest && adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  } else if (userToken) {
    config.headers.Authorization = `Bearer ${userToken}`;
  }

  /**
   * Content-Type handling
   * - JSON → set header
   * - FormData → let browser handle boundary
   */
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  if (!isFormData) {
    config.headers["Content-Type"] = "application/json";
  } else {
    delete config.headers["Content-Type"];
  }

  return config;
});

/* ===============================
   RESPONSE INTERCEPTOR
================================ */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Optional: global auth handling
    if (error.response?.status === 401) {
      const message = String(error.response?.data?.message || "");
      const requestUrl = String(error.config?.url || "");
      const isAdminRequest = requestUrl.includes("/api/admin");

      if (!isAdminRequest && message.toLowerCase().includes("token expired")) {
        localStorage.removeItem("authToken");
        localStorage.setItem("authSessionExpired", "true");
      }

      console.warn("Unauthorized request");
    }
    return Promise.reject(error);
  }
);
/* ===============================
   FILE URL BUILDER
================================ */
export const buildFileUrl = (url) => {
  const API_BASE =
    (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

  if (!url) return "";

  // If wrongly saved with frontend host
  if (url.startsWith("http://localhost:5173")) {
    return url.replace("http://localhost:5173", API_BASE);
  }

  // If already correct absolute URL
  if (url.startsWith("http")) return url;

  // If relative path
  if (url.startsWith("/")) return `${API_BASE}${url}`;

  return `${API_BASE}/${url}`;
};

export default api;
