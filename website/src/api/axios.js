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

  if (adminToken) {
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
      // token expired / invalid
      // DO NOT auto logout admin silently
      console.warn("Unauthorized request");
    }
    return Promise.reject(error);
  }
);

export default api;
