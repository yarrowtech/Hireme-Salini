// AdminLogin.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaShieldAlt, FaEnvelope, FaTimes, FaArrowLeft } from "react-icons/fa";

// ✅ import your API functions
import { adminLogin as adminLoginApi, getAdminMe } from "../api/admin.api";

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");

  
  const handleSend = () => {
    if (!email.trim()) return toast.error("Please enter your email.");
    toast.info("Forgot password backend not connected yet. We'll add this API later.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-md">
      <div className="bg-gradient-to-br from-white to-sky-50 rounded-3xl shadow-2xl p-8 w-[90vw] max-w-md border border-slate-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 rounded-3xl"></div>
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br from-sky-100 to-indigo-100 rounded-full blur-xl"></div>

        <div className="relative z-10">
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-full transition-all duration-300"
          >
            <FaTimes />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center">
              <FaEnvelope className="text-slate-900 text-xl" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Reset Password</h2>
          </div>

          <p className="text-slate-600 mb-6 leading-relaxed">
            Enter your email address and we'll send you secure instructions to reset your password.
          </p>

          <div className="space-y-6">
            <div className="relative">
              <input
                type="email"
                placeholder="admin@company.com"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all duration-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleSend}
              className="w-full p-4 bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-semibold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-300 relative overflow-hidden group"
            >
              <span className="relative z-10">Send Reset Instructions</span>
              <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  const [loginCred, setLoginCred] = useState({ username: "", password: "" });
  const [showForgot, setShowForgot] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginCred((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ REAL BACKEND LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const username = loginCred.username.trim();
    const password = loginCred.password.trim();

    if (!username || !password) {
      return toast.error("Please enter username and password.");
    }

    try {
      setLoading(true);

      // 1) login
      const data = await adminLoginApi({ username, password });

      // ✅ expects: { accessToken, refreshToken, admin }
      const accessToken = data?.accessToken;

      if (!accessToken) {
        toast.error("Login succeeded but token missing. Check backend response.");
        return;
      }

      // 2) store token (matches axios interceptor key)
      localStorage.setItem("authToken", accessToken);

      // optional: store refresh token if you later implement refresh flow
      if (data?.refreshToken) {
        localStorage.setItem("adminRefreshToken", data.refreshToken);
      }

      // 3) verify profile (optional but good)
      await getAdminMe();

      toast.success(data?.message || "Admin login successful");
      navigate("/admin/*"); // change if your route is different
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong while logging in.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-sky-100 to-indigo-100 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-purple-500/20 to-blue-600/20 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-gradient-to-br from-indigo-400/10 to-purple-500/10 rounded-full blur-2xl animate-float" />
      </div>

      {/* Floating Grid Pattern */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMTQ3LCAxOTcsIDI1MywgMC4xKSIvPgo8L3N2Zz4=')] opacity-30"></div>

      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors duration-300 group"
      >
        <FaArrowLeft className="transition-transform group-hover:-translate-x-1" />
        <span>Back to Home</span>
      </button>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      <div className="w-full max-w-md relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 rounded-3xl blur opacity-75 transition duration-1000 animate-tilt"></div>

        <form
          className="relative bg-gradient-to-br from-white to-sky-50 backdrop-blur-xl rounded-3xl p-10 border border-slate-200 shadow-2xl"
          onSubmit={handleLogin}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg">
              <FaShieldAlt className="text-3xl text-slate-900" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Portal</h1>
            <p className="text-slate-600">Secure access to administrative controls</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Administrator Username</label>
              <input
                type="text"
                placeholder="Enter your admin username"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all duration-300"
                value={loginCred.username}
                name="username"
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Secure Password</label>
              <input
                type="password"
                placeholder="Enter your secure password"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent text-slate-900 placeholder-slate-400 backdrop-blur-sm transition-all duration-300"
                value={loginCred.password}
                name="password"
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-center mt-4 mb-8">
            <span
              className="text-sky-600 hover:text-sky-600 text-sm font-medium cursor-pointer transition-colors duration-300"
              onClick={() => setShowForgot(true)}
            >
              Forgot your password?
            </span>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full p-4 bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-bold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-300 relative overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                  Signing in...
                </>
              ) : (
                <>
                  <FaShieldAlt className="text-lg" />
                  Access Admin Portal
                </>
              )}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-sky-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-2xl backdrop-blur-sm">
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              🔒 Your session is protected with enterprise-grade encryption. All administrative actions are logged for
              security compliance.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
