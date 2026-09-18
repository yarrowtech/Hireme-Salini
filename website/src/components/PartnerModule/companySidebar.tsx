
import React from "react";
import {
  FaHandshake,
  FaTimes,
  FaTachometerAlt,
  FaChartLine,
  FaUsers,
  FaFileAlt,
  FaSignOutAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

type companyTab = "dashboard" | "analytics" | "salary" | "service" | "subscription";

const cn = (...a: Array<string | false | undefined | null>) =>
  a.filter(Boolean).join(" ");

function getCompanyName(): string {
  const direct = localStorage.getItem("companyName");
  if (direct && direct.trim()) return direct.trim();

  try {
    const companyRaw = localStorage.getItem("company");
    if (companyRaw) {
      const p = JSON.parse(companyRaw);
      const name =
        p?.companyName ||
        p?.company?.name ||
        p?.organizationName ||
        p?.orgName ||
        p?.company_name;
      if (typeof name === "string" && name.trim()) return name.trim();
    }
  } catch {}

  return "Company";
}

export default function companySidebar({
  active,
  setActive,
  sidebarOpen,
  setSidebarOpen,
  panelTitle = "Company Panel",
  companyName,
  companyStatus,
}: {
  active: companyTab;
  setActive: (t: companyTab) => void;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  panelTitle?: string;
  companyName?: string;
  companyStatus?: string;
}) {
  const navigate = useNavigate();

  const [localCompanyName, setLocalCompanyName] = React.useState(getCompanyName());

  React.useEffect(() => {
    const refresh = () => setLocalCompanyName(getCompanyName());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const resolvedCompanyName = companyName || localCompanyName;
  const resolvedCompanyStatus = companyStatus || "Verified";

  const items: Array<{ key: companyTab; label: string; icon: React.ReactNode }> =
    [
      { key: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
      { key: "service", label: "Employee Management", icon: <FaUsers /> },
      { key: "analytics", label: "Analytics", icon: <FaChartLine /> },
      { key: "salary", label: "Salary & Payments", icon: <FaUsers /> },
      { key: "subscription", label: "Subscription Management", icon: <FaFileAlt /> },
    ];

  const navigateTab = (key: companyTab) => {
    setActive(key);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <>
      {/* ================= Mobile Sidebar ================= */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-[60]",
          sidebarOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/60 transition-opacity",
            sidebarOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setSidebarOpen(false)}
        />

        <div
          className={cn(
            "absolute left-0 top-0 h-full w-[86%] max-w-[320px] bg-blue-100 border-r border-blue-300/70 shadow-2xl transition-transform",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-blue-300/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <FaHandshake />
              </div>
              <div className="leading-tight">
                <div className="text-blue-950 font-bold">{panelTitle}</div>
                <div className="text-xs text-slate-600">Company Dashboard</div>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="px-3 py-2 rounded-xl bg-blue-50/90 border border-blue-300/70 text-blue-800 hover:bg-blue-100"
              aria-label="Close sidebar"
            >
              <FaTimes />
            </button>
          </div>

          <SidebarNav items={items} active={active} onSelect={navigateTab} />

          {/* Footer */}
          <SidebarFooterPill companyName={resolvedCompanyName} onLogout={handleLogout} />
        </div>
      </div>

      {/* ================= Desktop Sidebar ================= */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 bg-blue-100 border-r border-blue-300/70 shadow-xl shadow-blue-900/5">
        <div className="w-full flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-blue-300/70">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <FaHandshake />
              </div>
              <div className="leading-tight">
                <div className="text-blue-950 font-extrabold text-lg">{panelTitle}</div>
                <div className="text-xs text-slate-600">Company Dashboard</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-blue-50/90 border border-blue-300/70 p-3 shadow-sm">
              <div className="text-xs text-slate-500">Status</div>
              <div className="text-sm text-blue-950 font-semibold">{resolvedCompanyStatus} company</div>
              <div className="text-xs text-slate-500 mt-1">Access: Full</div>
            </div>
          </div>

          <SidebarNav items={items} active={active} onSelect={navigateTab} />

          <div className="mt-auto">
            {/* Footer */}
            <SidebarFooterPill companyName={resolvedCompanyName} onLogout={handleLogout} />
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarNav({
  items,
  active,
  onSelect,
}: {
  items: { key: companyTab; label: string; icon: React.ReactNode }[];
  active: companyTab;
  onSelect: (key: companyTab) => void;
}) {
  return (
    <nav className="p-4">
      <div className="text-xs uppercase tracking-wider text-blue-800/70 px-3 mb-3">
        Navigation
      </div>

      <div className="space-y-2">
        {items.map((it) => {
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onSelect(it.key)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition",
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white border-blue-500 shadow-md shadow-blue-500/20"
                  : "bg-blue-50/90 border-blue-300/60 text-slate-700 hover:bg-blue-200/60 hover:text-blue-950"
              )}
            >
              <span className={isActive ? "text-white" : "text-blue-600"}>{it.icon}</span>
              <span className="font-semibold">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Bottom panel with company name and logout icon. */
function SidebarFooterPill({
  companyName,
  onLogout,
}: {
  companyName: string;
  onLogout: () => void;
}) {
  return (
    <div className="p-4 border-t border-blue-300/70">
      <div className="flex items-center gap-3 rounded-2xl bg-blue-50/90 border border-blue-300/70 px-4 py-3 shadow-sm">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-slate-500">Company</div>
          <div className="text-sm font-semibold text-blue-950 truncate">{companyName}</div>
        </div>

        <button
          onClick={onLogout}
          className="grid place-items-center w-11 h-11 rounded-full bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-200 transition"
          aria-label="Logout"
          title="Logout"
        >
          <FaSignOutAlt />
        </button>
      </div>
    </div>
  );
}





