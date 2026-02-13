
import React from "react";
import {
  FaHandshake,
  FaTimes,
  FaTachometerAlt,
  FaChartLine,
  FaUsers,
  FaKey,
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
}: {
  active: companyTab;
setActive: (t: companyTab) => void;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  panelTitle?: string;
}) {
  const navigate = useNavigate();

  const [companyName, setCompanyName] = React.useState(getCompanyName());

  React.useEffect(() => {
    const refresh = () => setCompanyName(getCompanyName());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const items: Array<{ key: companyTab; label: string; icon: React.ReactNode }> =
    [
      { key: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
      { key: "analytics", label: "Analytics", icon: <FaChartLine /> },
      { key: "salary", label: "Salary & Payments", icon: <FaUsers /> },
      { key: "service", label: "Service Access", icon: <FaKey /> },
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
            "absolute left-0 top-0 h-full w-[86%] max-w-[320px] bg-slate-950 border-r border-white/10 shadow-2xl transition-transform",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white">
                <FaHandshake />
              </div>
              <div className="leading-tight">
                <div className="text-white font-bold">{panelTitle}</div>
                <div className="text-xs text-slate-400">Company Dashboard</div>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white"
              aria-label="Close sidebar"
            >
              <FaTimes />
            </button>
          </div>

          <SidebarNav items={items} active={active} onSelect={navigateTab} />

          {/* ✅ New style footer */}
          <SidebarFooterPill companyName={companyName} onLogout={handleLogout} />
        </div>
      </div>

      {/* ================= Desktop Sidebar ================= */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 bg-slate-950 border-r border-white/10">
        <div className="w-full flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white">
                <FaHandshake />
              </div>
              <div className="leading-tight">
                <div className="text-white font-extrabold text-lg">{panelTitle}</div>
                <div className="text-xs text-slate-400">Company Dashboard</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs text-slate-400">Status</div>
              <div className="text-sm text-white font-semibold">Verified company</div>
              <div className="text-xs text-slate-400 mt-1">Access: Full</div>
            </div>
          </div>

          <SidebarNav items={items} active={active} onSelect={navigateTab} />

          <div className="mt-auto">
            {/* ✅ New style footer */}
            <SidebarFooterPill companyName={companyName} onLogout={handleLogout} />
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
      <div className="text-xs uppercase tracking-wider text-slate-400 px-3 mb-3">
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
                "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition",
                isActive
                  ? "bg-gradient-to-r from-cyan-500/25 to-blue-500/10 border-cyan-400/30 text-white"
                  : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
              )}
            >
              <span className="text-cyan-300">{it.icon}</span>
              <span className="font-semibold">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** ✅ Another style: bottom "pill" with company name + logout icon */
function SidebarFooterPill({
  companyName,
  onLogout,
}: {
  companyName: string;
  onLogout: () => void;
}) {
  return (
    <div className="p-4 border-t border-white/10">
      <div className="flex items-center gap-3 rounded-full bg-gradient-to-r from-white/10 to-white/5 border border-white/10 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-slate-400">Company</div>
          <div className="text-sm font-semibold text-white truncate">{companyName}</div>
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





