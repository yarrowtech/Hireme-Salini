import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTimes,
  FaTachometerAlt,
  FaCalendarCheck,
  FaSignOutAlt,
  FaUserTie,
  FaUserCircle,
  FaMoneyBillWave,
  FaChartLine,
} from "react-icons/fa";

export type EmployeeTab = "dashboard" | "attendance" | "salary" | "progress" | "profile";

const cn = (...a: Array<string | false | undefined | null>) =>
  a.filter(Boolean).join(" ");

function getStoredEmployee() {
  try {
    const raw = localStorage.getItem("authUser");
    if (raw) {
      const u = JSON.parse(raw);
      const name = u.name || u.employeeName || u.username || "Employee";
      const id = u.employeeId || u.username || (u.companyCode ? `EMP-${u.companyCode}` : "");
      return {
        name: typeof name === "string" ? name.replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Employee",
        id: String(id || ""),
      };
    }
  } catch {}
  const legacyId = localStorage.getItem("EmployeeLoginId") || "";
  if (legacyId) {
    const n = legacyId.replace(/\./g, " ");
    return {
      name: n.charAt(0).toUpperCase() + n.slice(1),
      id: legacyId,
    };
  }
  return { name: "Employee", id: "" };
}

export default function EmployeeSidebar({
  active,
  setActive,
  sidebarOpen,
  setSidebarOpen,
  panelTitle = "Employee Panel",
}: {
  active: EmployeeTab;
  setActive: (t: EmployeeTab) => void;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  panelTitle?: string;
}) {
  const navigate = useNavigate();

  const [employeeInfo, setEmployeeInfo] = React.useState(getStoredEmployee);

  React.useEffect(() => {
    const syncProfile = () => {
      setEmployeeInfo(getStoredEmployee());
    };

    syncProfile();
    window.addEventListener("storage", syncProfile);
    window.addEventListener("focus", syncProfile);

    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("focus", syncProfile);
    };
  }, []);

  const items: Array<{ key: EmployeeTab; label: string; icon: React.ReactNode }> = [
    { key: "dashboard", label: "Overview", icon: <FaTachometerAlt /> },
    { key: "attendance", label: "Attendance", icon: <FaCalendarCheck /> },
    { key: "salary", label: "Salary", icon: <FaMoneyBillWave /> },
    { key: "progress", label: "Progress", icon: <FaChartLine /> },
    { key: "profile", label: "Personal Details", icon: <FaUserCircle /> },
  ];

  const navigateTab = (key: EmployeeTab) => {
    setActive(key);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
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
            "absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300",
            sidebarOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setSidebarOpen(false)}
        />

        <div
          className={cn(
            "absolute left-0 top-0 h-full w-[86%] max-w-[320px] bg-gradient-to-b from-white via-blue-50 to-blue-100/80 border-r border-blue-200/70 shadow-2xl transition-transform duration-300 flex flex-col",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarHeader panelTitle={panelTitle} onClose={() => setSidebarOpen(false)} />
          <SidebarNav items={items} active={active} onSelect={navigateTab} />
          <div className="mt-auto">
            <SidebarFooterPill
              employeeName={employeeInfo.name}
              employeeLoginId={employeeInfo.id}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>

      {/* ================= Desktop Sidebar ================= */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 bg-gradient-to-b from-white via-blue-50/80 to-blue-100/60 border-r border-blue-200/70 shadow-xl shadow-blue-900/5 backdrop-blur-xl">
        <div className="w-full flex flex-col">
          <div className="p-5 border-b border-blue-200/70">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <FaUserTie className="text-xl" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
              </div>
              <div className="leading-tight">
                <div className="text-blue-950 font-extrabold text-lg tracking-tight">{panelTitle}</div>
                <div className="text-xs text-slate-500 font-medium">Employee Workspace</div>
              </div>
            </div>

            <div className="mt-4 relative overflow-hidden rounded-2xl bg-white/80 border border-blue-200/70 p-3 shadow-sm">
              <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-blue-400/10 blur-xl" />
              <div className="relative flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <div className="text-sm text-blue-950 font-bold">Active Employee</div>
              </div>
              <div className="relative text-xs text-slate-500 mt-1">Access: Self Service</div>
            </div>
          </div>

          <SidebarNav items={items} active={active} onSelect={navigateTab} />

          <div className="mt-auto">
            <SidebarFooterPill
              employeeName={employeeInfo.name}
              employeeLoginId={employeeInfo.id}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarHeader({ panelTitle, onClose }: { panelTitle: string; onClose: () => void }) {
  return (
    <div className="p-4 flex items-center justify-between border-b border-blue-200/70">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
          <FaUserTie />
        </div>
        <div className="leading-tight">
          <div className="text-blue-950 font-bold">{panelTitle}</div>
          <div className="text-xs text-slate-500">Employee Workspace</div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="px-3 py-2 rounded-xl bg-white/80 border border-blue-200/70 text-blue-800 hover:bg-blue-50 transition"
        aria-label="Close sidebar"
      >
        <FaTimes />
      </button>
    </div>
  );
}

function SidebarNav({
  items,
  active,
  onSelect,
}: {
  items: { key: EmployeeTab; label: string; icon: React.ReactNode }[];
  active: EmployeeTab;
  onSelect: (key: EmployeeTab) => void;
}) {
  return (
    <nav className="p-4">
      <div className="text-[11px] uppercase tracking-wider font-bold text-blue-800/60 px-3 mb-3">
        Navigation
      </div>

      <div className="space-y-1.5">
        {items.map((it) => {
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onSelect(it.key)}
              className={cn(
                "group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-600 hover:bg-white hover:text-blue-950 hover:shadow-sm"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-white/90" />
              )}
              <span
                className={cn(
                  "grid place-items-center w-8 h-8 rounded-lg text-base shrink-0 transition",
                  isActive
                    ? "bg-white/15 text-white"
                    : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
                )}
              >
                {it.icon}
              </span>
              <span className="font-semibold text-sm">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SidebarFooterPill({
  employeeName,
  employeeLoginId,
  onLogout,
}: {
  employeeName: string;
  employeeLoginId: string;
  onLogout: () => void;
}) {
  const initials = (employeeName || "E")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "E";

  return (
    <div className="p-4 border-t border-blue-200/70">
      <div className="flex items-center gap-3 rounded-2xl bg-white/85 border border-blue-200/70 px-3.5 py-3 shadow-sm">
        <div className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm shadow-md shadow-blue-500/25">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-blue-950 truncate">
            {employeeName}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {employeeLoginId ? `ID: ${employeeLoginId}` : "Active"}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="grid place-items-center w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition hover:scale-105"
          aria-label="Logout"
          title="Logout"
        >
          <FaSignOutAlt />
        </button>
      </div>
    </div>
  );
}
