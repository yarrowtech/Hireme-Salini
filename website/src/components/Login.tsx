import React, { useEffect, useMemo, useState, useContext } from "react";
import { toast } from "react-toastify";
import { UserContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import {
  FaUser,
  FaLock,
  FaBuilding,
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaEnvelope,
  FaBriefcase,
  FaUserTie,
  FaArrowLeft,
} from "react-icons/fa";

// ✅ TS/Vite import
import { authApi } from "../api/auth.api";

type LoginRole = "EMPLOYEE" | "HR" | "COMPANY";

/* -------------------- helpers -------------------- */
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
const is3DigitCode = (v: string) => /^\d{3}$/.test(String(v || "").trim());

/* -------------------- Modal: Forgot Access -------------------- */
function ForgotPasswordModal({
  role,
  onClose,
}: {
  role: LoginRole;
  onClose: () => void;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCompany = role === "COMPANY";
  const isHr = role === "HR";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // COMPANY: email + code
    if (isCompany) {
      if (!email.trim()) return toast.error("Company email is required");
      if (!isEmail(email)) return toast.error("Enter a valid company email");

      if (!companyCode.trim()) return toast.error("Company code is required");
      if (!is3DigitCode(companyCode)) return toast.error("Company code must be exactly 3 digits");
    } else {
      // EMPLOYEE / HR: username + code
      if (!username.trim()) return toast.error(isHr ? "HR username is required" : "Username is required");
      if (username.trim().length < 3) return toast.error("Username must be at least 3 characters long");

      if (!companyCode.trim()) return toast.error("Company code is required");
      if (!is3DigitCode(companyCode)) return toast.error("Company code must be exactly 3 digits");
    }

    setIsSubmitting(true);
    try {
      // 🔧 backend later:
      // if (role === "EMPLOYEE") await authApi.forgotEmployee({ username, companyCode })
      // if (role === "HR") await authApi.forgotHr({ username, companyCode })
      // if (role === "COMPANY") await authApi.forgotCompany({ email, companyCode })
      await new Promise((r) => setTimeout(r, 900));

      toast.success("Instructions sent successfully");
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send instructions");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl shadow-2xl p-8 w-[90vw] max-w-md relative border border-blue-200/50 backdrop-blur-sm">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-xl bg-blue-200/50 hover:bg-blue-300/50 text-blue-700 hover:text-blue-800 transition-all duration-200"
        >
          <FaTimes />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
            <FaShieldAlt className="text-2xl text-white" />
          </div>
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Forgot Access</h2>
          <p className="text-blue-600 text-sm">
            {role === "EMPLOYEE" ? "Employee reset" : role === "HR" ? "HR reset" : "Company reset"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isCompany ? (
            <>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <FaEnvelope className="text-blue-500" />
                  Company Email
                </label>
                <input
                  type="email"
                  placeholder="Enter company email"
                  className="w-full p-4 bg-white/80 border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-blue-800 placeholder-blue-400 transition-all duration-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <FaBuilding className="text-blue-500" />
                  Company Code
                </label>
                <input
                  type="text"
                  placeholder="Enter company code (3 digits)"
                  className="w-full p-4 bg-white/80 border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-blue-800 placeholder-blue-400 transition-all duration-300"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  maxLength={3}
                  disabled={isSubmitting}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <FaUser className="text-blue-500" />
                  {isHr ? "HR Username" : "Username"}
                </label>
                <input
                  type="text"
                  placeholder={isHr ? "Enter HR username" : "Enter your username"}
                  className="w-full p-4 bg-white/80 border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-blue-800 placeholder-blue-400 transition-all duration-300"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <FaBuilding className="text-blue-500" />
                  Company Code
                </label>
                <input
                  type="text"
                  placeholder="Enter company code (3 digits)"
                  className="w-full p-4 bg-white/80 border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-blue-800 placeholder-blue-400 transition-all duration-300"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  maxLength={3}
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Sending...
              </div>
            ) : (
              "Send Instructions"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* -------------------- Main Login -------------------- */
export default function Login({ setShowLogin }: { setShowLogin: (value: boolean) => void }) {
  const [role, setRole] = useState<LoginRole>("EMPLOYEE");

  // employee & HR fields
  const [username, setUsername] = useState("");
  const [companyCode, setCompanyCode] = useState("");

  // company fields (NO OTP now)
  const [companyEmail, setCompanyEmail] = useState("");

  // shared for EMPLOYEE/HR
  const [password, setPassword] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { updateUserState } = useContext(UserContext)!;
  const navigate = useNavigate();

  const isCompany = role === "COMPANY";
  const isHr = role === "HR";

  const icon = useMemo(() => {
    if (role === "EMPLOYEE") return <FaUser className="text-lg text-white" />;
    if (role === "HR") return <FaUserTie className="text-lg text-white" />;
    return <FaBriefcase className="text-lg text-white" />;
  }, [role]);

  const title = useMemo(() => {
    if (role === "EMPLOYEE") return "Employee Sign In";
    if (role === "HR") return "HR Sign In";
    return "Company Sign In";
  }, [role]);

  const subtitle = useMemo(() => {
    if (role === "EMPLOYEE") return "Login with username + company code + password";
    if (role === "HR") return "Login with HR username + company code + password";
    return "Login with company email + company code";
  }, [role]);

  const goBySelectedRole = () => {
    if (role === "COMPANY") navigate("/company/*");
    else if (role === "HR") navigate("/hr/dashboard");
    else navigate("/employee/dashboard");
  };

  // ✅ Auto-login (token exists -> /me)
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const me = await authApi.me(); // { user }
        if (me?.user?.role) {
          toast.info("You are already logged in");
          setShowLogin(false);

          const r = me.user.role;
          if (r === "SUPER_ADMIN" || r === "ADMIN") navigate("/admin/dashboard");
          else if (r === "HR") navigate("/hr/dashboard");
          else if (r === "COMPANY") navigate("/company/dashboard");
          else navigate("/employee/dashboard");
        }
      } catch {
        localStorage.removeItem("authToken");
      } finally {
        setCheckingSession(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // clean fields on role change
  useEffect(() => {
    setPassword("");
    setShowPassword(false);
    // keep companyCode as shared; you can reset if needed
  }, [role]);

  const validateCompanyLogin = () => {
    if (!companyEmail.trim()) return toast.error("Company email is required");
    if (!isEmail(companyEmail)) return toast.error("Enter a valid company email");

    if (!companyCode.trim()) return toast.error("Company code is required");
    if (!is3DigitCode(companyCode)) return toast.error("Company code must be exactly 3 digits");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ COMPANY (NO OTP)
    if (isCompany) {
      if (!validateCompanyLogin()) return;

      setIsLoading(true);
      try {
        // ✅ new backend route: POST /api/auth/company/login
        const data = await authApi.companyLogin({
          email: companyEmail.trim(),
          companyCode: Number(companyCode),
        } as any);

        if (!data?.token) {
          toast.error("Login failed: token not received");
          return;
        }

        localStorage.setItem("authToken", data.token);
        await updateUserState();

        toast.success(data?.message || "Company login successful");
        setShowLogin(false);
        goBySelectedRole();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.message || "Company login failed");
      } finally {
        setIsLoading(false);
      }

      return;
    }

    // EMPLOYEE / HR password based
    if (!username.trim()) return toast.error(isHr ? "HR username is required" : "Username is required");
    if (username.trim().length < 3) return toast.error("Username must be at least 3 characters long");

    if (!companyCode.trim()) return toast.error("Company code is required");
    if (!is3DigitCode(companyCode)) return toast.error("Company code must be exactly 3 digits");

    if (!password.trim()) return toast.error("Password is required");
    if (password.length < 6) return toast.error("Password must be at least 6 characters long");

    setIsLoading(true);
    try {
      const data = await authApi.login({
        username: username.trim(),
        password,
        companyCode: Number(companyCode),
      });

      if (!data?.token) {
        toast.error("Login failed: token not received");
        return;
      }

      localStorage.setItem("authToken", data.token);
      await updateUserState();

      toast.success(data?.message || "Login successful");
      setShowLogin(false);
      goBySelectedRole();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="w-[85vw] sm:w-[420px] max-w-[420px] mx-auto bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl shadow-2xl p-6 border border-blue-200/50">
        <div className="text-center text-blue-700 font-semibold">Checking session...</div>
      </div>
    );
  }

  return (
    <>
      {showForgot && <ForgotPasswordModal role={role} onClose={() => setShowForgot(false)} />}

      <div className="w-[85vw] sm:w-[420px] max-w-[420px] mx-auto bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl shadow-2xl p-6 border border-blue-200/50 backdrop-blur-sm relative">
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
            {icon}
          </div>
          <h2 className="text-xl font-bold text-blue-800 mb-1">{title}</h2>
          <p className="text-xs text-blue-600">{subtitle}</p>
        </div>

        {/* Role Tabs */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setRole("EMPLOYEE")}
            className={[
              "rounded-2xl px-3 py-3 font-extrabold text-xs sm:text-sm transition border",
              role === "EMPLOYEE"
                ? "bg-white/90 border-blue-300 text-blue-800 shadow"
                : "bg-white/50 border-blue-200 text-blue-700 hover:bg-white/70",
            ].join(" ")}
          >
            Employee
          </button>
          <button
            type="button"
            onClick={() => setRole("HR")}
            className={[
              "rounded-2xl px-3 py-3 font-extrabold text-xs sm:text-sm transition border",
              role === "HR"
                ? "bg-white/90 border-blue-300 text-blue-800 shadow"
                : "bg-white/50 border-blue-200 text-blue-700 hover:bg-white/70",
            ].join(" ")}
          >
            HR
          </button>
          <button
            type="button"
            onClick={() => setRole("COMPANY")}
            className={[
              "rounded-2xl px-3 py-3 font-extrabold text-xs sm:text-sm transition border",
              role === "COMPANY"
                ? "bg-white/90 border-blue-300 text-blue-800 shadow"
                : "bg-white/50 border-blue-200 text-blue-700 hover:bg-white/70",
            ].join(" ")}
          >
            Company
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* COMPANY: Email + Code (NO OTP) */}
          {isCompany ? (
            <>
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <FaEnvelope className="text-blue-500" />
                  Company Email
                </label>
                <input
                  type="email"
                  placeholder="Enter company email"
                  className="w-full p-3 bg-white/80 border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-blue-800 placeholder-blue-400 transition-all duration-300"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <FaBuilding className="text-blue-500" />
                  Company Code
                </label>
                <input
                  type="text"
                  placeholder="Enter company code (3 digits)"
                  className="w-full p-3 bg-white/80 border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-blue-800 placeholder-blue-400 transition-all duration-300"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  maxLength={3}
                  disabled={isLoading}
                />
              </div>

              {/* COMPANY actions */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors hover:underline"
                >
                  Forgot Access?
                </button>

                <div className="text-xs text-blue-600/70 font-semibold flex items-center gap-2">
                  <FaArrowLeft className="opacity-0" />
                  Company Portal
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </>
          ) : (
            <>
              {/* EMPLOYEE / HR username */}
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <FaUser className="text-blue-500" />
                  {isHr ? "HR Username" : "Username"}
                </label>
                <input
                  type="text"
                  placeholder={isHr ? "Enter HR username" : "Enter your username"}
                  className="w-full p-3 bg-white/80 border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-blue-800 placeholder-blue-400 transition-all duration-300"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Company code */}
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <FaBuilding className="text-blue-500" />
                  Company Code
                </label>
                <input
                  type="text"
                  placeholder="Enter company code (3 digits)"
                  className="w-full p-3 bg-white/80 border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-blue-800 placeholder-blue-400 transition-all duration-300"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  maxLength={3}
                  disabled={isLoading}
                />
              </div>

              {/* Password (only for EMPLOYEE/HR) */}
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-sm font-medium text-blue-700">
                  <FaLock className="text-blue-500" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="w-full p-3 pr-12 bg-white/80 border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-blue-800 placeholder-blue-400 transition-all duration-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors hover:underline"
                >
                  Forgot Password?
                </button>

                <div className="text-xs text-blue-600/70 font-semibold">
                  {role === "EMPLOYEE" ? "Employee Portal" : "HR Portal"}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl transition-all duration-300 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </>
          )}
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs text-blue-600/70">Your login is secured with enterprise-grade encryption</p>
        </div>
      </div>
    </>
  );
}
