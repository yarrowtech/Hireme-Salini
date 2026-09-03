import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import CompanySidebar from "./companySidebar";
import { FaBars } from "react-icons/fa";
import { getCompanyLabel, loadCompanyBundle } from "./companyHelpers";

export type CompanyTab = "dashboard" | "analytics" | "salary" | "service" | "subscription";

const cn = (...a: Array<string | false | undefined | null>) => a.filter(Boolean).join(" ");

const pathToTab = (path: string): CompanyTab => {
  if (path.includes("/company/analytics")) return "analytics";
  if (path.includes("/company/salary")) return "salary";
  if (path.includes("/company/service")) return "service";
  if (path.includes("/company/subscription")) return "subscription";
  return "dashboard";
};

export default function CompanyLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [active, setActive] = useState<CompanyTab>(() => pathToTab(pathname));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const [companyName, setCompanyName] = useState(() => localStorage.getItem("companyName") || "Company");
  const [companyStatus, setCompanyStatus] = useState("Loading");

  useEffect(() => {
    setActive(pathToTab(pathname));
  }, [pathname]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [active]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const bundle = await loadCompanyBundle();
        if (!alive || !bundle?.dashboard?.company) return;

        setCompanyName(getCompanyLabel(bundle.dashboard.company));
        setCompanyStatus(bundle.dashboard.subscriptionActive ? "Active" : "Inactive");
      } catch {
        if (!alive) return;
        setCompanyName(localStorage.getItem("companyName") || "Company");
        setCompanyStatus("Unknown");
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  const setTab = (t: CompanyTab) => {
    setActive(t);
    // ✅ IMPORTANT: use RELATIVE navigation inside /company route
    navigate(t === "dashboard" ? "dashboard" : t);
    setSidebarOpen(false);
  };

  const pageTitle = useMemo(() => {
    switch (active) {
      case "dashboard":
        return "Dashboard";
      case "analytics":
        return "Analytics";
      case "salary":
        return "Salary & Payments";
      case "service":
        return "Service Access";
      case "subscription":
        return "Subscription";
      default:
        return "Company";
    }
  }, [active]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white">
      <CompanySidebar
        active={active}
        setActive={setTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        companyName={companyName}
        companyStatus={companyStatus}
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
              <div className="text-xs text-slate-300">
                {companyName} • HireMe • {companyStatus}
              </div>
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
