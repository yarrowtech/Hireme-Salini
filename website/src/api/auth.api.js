import api from "./axios";

export const authApi = {
  /* ============================
     EMPLOYEE / HR AUTH
  ============================ */
  login: async ({ username, password, companyCode }) => {
    const res = await api.post("/api/auth/login", {
      username,
      password,
      companyCode: Number(companyCode),
    });
    return res.data;
  },

  register: async ({ username, email, password, companyCode }) => {
    const res = await api.post("/api/auth/register", {
      username,
      email,
      password,
      companyCode: Number(companyCode),
    });
    return res.data;
  },

  me: async () => {
    const res = await api.get("/api/auth/me");
    return res.data;
  },

  logout: async () => {
    const res = await api.post("/api/auth/logout");
    return res.data;
  },

  companyLogin: async ({ email, companyCode }) => {
    const res = await api.post("/api/auth/company/login", {
      email,
      companyCode: Number(companyCode),
    });
    return res.data;
  },
};
