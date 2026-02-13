import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { FaBars } from "react-icons/fa";

const cn = (...a: Array<string | false | undefined | null>) =>
  a.filter(Boolean).join(" ");

 const AdminDashboard = lazy(() => import("./AdminDashboard"));
 const AdminUserManagement = lazy(() => import("./AdminUserManagement"));
 const AdminSubscription = lazy(() => import("./AdminSubscription"));

/* tab -> path */
const TAB_TO_PATH: Record<AdminTab, string> = {
  dashboard: "/admin/dashboard",
  users: "/admin/users",
  subscription: "/admin/subscription",
};

const pathToTab = (path: string): AdminTab => {
  if (path.startsWith("/admin/users")) return "users";
  if (path.startsWith("/admin/subscription")) return "subscription";
  return "dashboard";
};

export default function Admin() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [active, setActive] = useState<AdminTab>(() => pathToTab(pathname));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActive(pathToTab(pathname));
  }, [pathname]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [active]);

  const setTab = (t: AdminTab) => {
    setActive(t);
    navigate(TAB_TO_PATH[t]);
  };

  const pageTitle = useMemo(() => {
    switch (active) {
      case "dashboard":
        return "Dashboard";
      case "users":
        return "User Management";
      case "subscription":
        return "Subscription";
      default:
        return "Admin";
    }
  }, [active]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white">
      <AdminSidebar
        active={active}
        setActive={setTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* same spacing pattern as Employee.tsx */}
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
              <div className="text-xs text-slate-300">Admin Panel • HireMe</div>
            </div>
          </div>
        </div>

        {/* Scroll container (same as Employee.tsx) */}
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
            {active === "dashboard" && <AdminDashboard />}
            {active === "users" && <AdminUserManagement />}
            {active === "subscription" && <AdminSubscription />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
