import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import EmployeeSidebar, { type EmployeeTab } from "./EmployeeSidebar";
import { FaBars } from "react-icons/fa";

const cn = (...a: Array<string | false | undefined | null>) =>
  a.filter(Boolean).join(" ");

const EmployeeDashboard = lazy(() => import("./EmployeeDashboard"));
 const EmployeeAttendance = lazy(() => import("./EmployeeAttendance"));
 const EmployeeProfile = lazy(() => import("./EmployeeProfile"));

const TAB_TO_PATH: Record<EmployeeTab, string> = {
  dashboard: "/employee/dashboard",
  attendance: "/employee/attendance",
  profile: "/employee/profile",
};

const pathToTab = (path: string): EmployeeTab => {
  if (path.startsWith("/employee/attendance")) return "attendance";
  if (path.startsWith("/employee/profile")) return "profile";
  return "dashboard";
};

export default function Employee() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [active, setActive] = useState<EmployeeTab>(() => pathToTab(pathname));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActive(pathToTab(pathname));
  }, [pathname]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [active]);

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
      case "profile":
        return "Profile";
      default:
        return "Employee";
    }
  }, [active]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white">
      <EmployeeSidebar
        active={active}
        setActive={setTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="lg:ml-72">
        {/* Topbar */}
        <div className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/60 backdrop-blur">
          <div className="flex items-center px-4 sm:px-6 py-4">
            <button
              className="lg:hidden inline-flex items-center justify-center rounded-xl bg-white/10 border border-white/10 px-3 py-2 hover:bg-white/15"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <FaBars />
            </button>

            <div className="ml-3 leading-tight">
              <div className="text-lg font-extrabold">{pageTitle}</div>
              <div className="text-xs text-slate-300">Employee Panel • HireMe</div>
            </div>
          </div>
        </div>

        <main
          ref={mainRef}
          className={cn(
            "px-4 sm:px-6 py-6",
            "h-[calc(100vh-72px)] overflow-y-auto",
            "min-h-[calc(100vh-72px)]"
          )}
        >
          <Suspense
            fallback={
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="h-5 w-48 bg-white/10 rounded mb-4 animate-pulse" />
                <div className="h-4 w-full bg-white/10 rounded mb-2 animate-pulse" />
                <div className="h-4 w-4/5 bg-white/10 rounded mb-2 animate-pulse" />
                <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
              </div>
            }
          >
            {active === "dashboard" && <EmployeeDashboard />}
            {active === "attendance" && <EmployeeAttendance />}
            {active === "profile" && <EmployeeProfile />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
