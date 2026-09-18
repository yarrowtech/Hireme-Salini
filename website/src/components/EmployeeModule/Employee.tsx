import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import EmployeeSidebar, { type EmployeeTab } from "./EmployeeSidebar";
import { FaBars, FaClock } from "react-icons/fa";
import { formatISTTime } from "./employeeUi";

const cn = (...a: Array<string | false | undefined | null>) =>
  a.filter(Boolean).join(" ");

const EmployeeDashboard = lazy(() => import("./EmployeeDashboard"));
const EmployeeAttendance = lazy(() => import("./EmployeeAttendance"));
const EmployeeProfile = lazy(() => import("./EmployeeProfile"));
const EmployeeSalary = lazy(() => import("./EmployeeSalary"));
const EmployeeProgress = lazy(() => import("./EmployeeProgress"));

const TAB_TO_PATH: Record<EmployeeTab, string> = {
  dashboard: "/employee/dashboard",
  attendance: "/employee/attendance",
  salary: "/employee/salary",
  progress: "/employee/progress",
  profile: "/employee/profile",
};

const pathToTab = (path: string): EmployeeTab => {
  if (path.startsWith("/employee/attendance")) return "attendance";
  if (path.startsWith("/employee/salary")) return "salary";
  if (path.startsWith("/employee/progress")) return "progress";
  if (path.startsWith("/employee/profile")) return "profile";
  return "dashboard";
};

const getStoredRole = () => {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return "";
    return String(JSON.parse(raw)?.role || "").toUpperCase();
  } catch {
    return "";
  }
};

const PAGE_SUBTITLE: Record<EmployeeTab, string> = {
  dashboard: "Here's your workspace summary for today",
  attendance: "Track your check-ins and leave history",
  salary: "Review your compensation and payroll",
  progress: "Monitor your monthly performance trend",
  profile: "Manage your personal and job details",
};

export default function Employee() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [active, setActive] = useState<EmployeeTab>(() => pathToTab(pathname));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storedRole, setStoredRole] = useState(getStoredRole);
  const [now, setNow] = useState(new Date());
  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActive(pathToTab(pathname));
    setStoredRole(getStoredRole());
  }, [pathname]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [active]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const setTab = (t: EmployeeTab) => {
    setActive(t);
    navigate(TAB_TO_PATH[t]);
  };

  const pageTitle = useMemo(() => {
    switch (active) {
      case "dashboard":
        return "Dashboard";
      case "attendance":
        return "Attendance";
      case "salary":
        return "Salary";
      case "progress":
        return "Progress";
      case "profile":
        return "Personal Details";
      default:
        return "Employee";
    }
  }, [active]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 text-slate-900 relative">
      {/* Decorative background accents */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-0">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-sky-400/10 rounded-full blur-3xl" />
      </div>

      <EmployeeSidebar
        active={active}
        setActive={setTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="lg:ml-72 relative">
        {/* Topbar */}
        <div className="sticky top-0 z-40 border-b border-blue-200/70 bg-white/75 shadow-sm shadow-blue-900/5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
            <div className="flex items-center min-w-0">
              <button
                className="lg:hidden inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white/80 px-3 py-2 text-blue-800 hover:bg-blue-50 transition"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <FaBars />
              </button>

              <div className="ml-3 min-w-0 leading-tight">
                <div className="text-lg sm:text-xl font-extrabold text-slate-950 tracking-tight">{pageTitle}</div>
                <div className="text-xs text-slate-500 font-medium truncate">{PAGE_SUBTITLE[active]}</div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-blue-200/70 bg-white/80 px-3.5 py-2 shadow-sm">
              <FaClock className="text-blue-600 text-sm" />
              <span className="font-mono text-sm font-bold text-blue-950 tabular-nums">
                {formatISTTime(now, true)}
              </span>
              <span className="hidden md:inline text-xs text-slate-500 font-medium border-l border-slate-200 pl-2 ml-0.5">
                IST
              </span>
            </div>
          </div>
        </div>

        <main
          ref={mainRef}
          className={cn(
            "px-4 sm:px-6 py-6 relative",
            "min-h-[calc(100vh-72px)] overflow-x-hidden"
          )}
        >
          <Suspense
            fallback={
              <div className="rounded-3xl border border-blue-200/80 bg-white p-6 shadow-sm">
                <div className="h-5 w-48 bg-slate-200 rounded mb-4 animate-pulse" />
                <div className="h-4 w-full bg-slate-100 rounded mb-2 animate-pulse" />
                <div className="h-4 w-4/5 bg-slate-100 rounded mb-2 animate-pulse" />
                <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
              </div>
            }
          >
            {storedRole && storedRole !== "EMPLOYEE" ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
                <h2 className="text-lg font-extrabold">Employee login required</h2>
                <p className="mt-2 text-sm font-medium">
                  The backend rejected this session because the current account role is {storedRole}. Please log in with an employee username, password, and company code to use the employee dashboard.
                </p>
              </div>
            ) : (
              <>
                {active === "dashboard" && <EmployeeDashboard />}
                {active === "attendance" && <EmployeeAttendance />}
                {active === "salary" && <EmployeeSalary />}
                {active === "progress" && <EmployeeProgress />}
                {active === "profile" && <EmployeeProfile />}
              </>
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
