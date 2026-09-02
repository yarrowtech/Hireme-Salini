import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTimes,
  FaTachometerAlt,
  FaCalendarCheck,
  FaSignOutAlt,
  FaUserTie,
  FaUserCircle,
} from "react-icons/fa";

export type EmployeeTab = "dashboard" | "attendance" | "profile";

const cn = (...a: Array<string | false | undefined | null>) =>
  a.filter(Boolean).join(" ");

const getEmployeeLoginId = () => localStorage.getItem("EmployeeLoginId") || "";

const generateEmployeeName = (loginId = "") => {
  if (!loginId) return "Employee";
  const name = loginId.replace(/\./g, " ");
  return name.charAt(0).toUpperCase() + name.slice(1);
};

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

  // ✅ same logic like your Waiter sidebar: Name generated from LoginId
  const [employeeLoginId, setEmployeeLoginId] = React.useState(getEmployeeLoginId);
  const [employeeName, setEmployeeName] = React.useState(() =>
    generateEmployeeName(getEmployeeLoginId())
  );

  React.useEffect(() => {
    const syncProfile = () => {
      const id = getEmployeeLoginId();
      setEmployeeLoginId(id);
      setEmployeeName(generateEmployeeName(id));
    };

    syncProfile();
    window.addEventListener("storage", syncProfile);
    window.addEventListener("focus", syncProfile); // ✅ same-tab refresh fix

    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("focus", syncProfile);
    };
  }, []);

  const items: Array<{ key: EmployeeTab; label: string; icon: React.ReactNode }> =
    [
      { key: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
      { key: "attendance", label: "Attendance", icon: <FaCalendarCheck /> },
      { key: "profile", label: "Profile", icon: <FaUserCircle /> },
    ];

  const navigateTab = (key: EmployeeTab) => {
    setActive(key);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    
    localStorage.removeItem("EmployeeLoginId");
    navigate("/"); // change to "/employee-login" if you have that route
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
                <FaUserTie />
              </div>
              <div className="leading-tight">
                <div className="text-white font-bold">{panelTitle}</div>
                <div className="text-xs text-slate-400">Employee Workspace</div>
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

          {/* Footer pill */}
          <SidebarFooterPill
            employeeName={employeeName}
            employeeLoginId={employeeLoginId}
            onLogout={handleLogout}
          />
        </div>
      </div>

      {/* ================= Desktop Sidebar ================= */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 bg-slate-950 border-r border-white/10">
        <div className="w-full flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white">
                <FaUserTie />
              </div>
              <div className="leading-tight">
                <div className="text-white font-extrabold text-lg">{panelTitle}</div>
                <div className="text-xs text-slate-400">Employee Workspace</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs text-slate-400">Status</div>
              <div className="text-sm text-white font-semibold">Active Employee</div>
              <div className="text-xs text-slate-400 mt-1">Access: Attendance</div>
            </div>
          </div>

          <SidebarNav items={items} active={active} onSelect={navigateTab} />

          <div className="mt-auto">
            <SidebarFooterPill
              employeeName={employeeName}
              employeeLoginId={employeeLoginId}
              onLogout={handleLogout}
            />
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
  items: { key: EmployeeTab; label: string; icon: React.ReactNode }[];
  active: EmployeeTab;
  onSelect: (key: EmployeeTab) => void;
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

function SidebarFooterPill({
  employeeName,
  employeeLoginId,
  onLogout,
}: {
  employeeName: string;
  employeeLoginId: string;
  onLogout: () => void;
}) {
  return (
    <div className="p-4 border-t border-white/10">
      <div className="flex items-center gap-3 rounded-full bg-gradient-to-r from-white/10 to-white/5 border border-white/10 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-slate-400">Profile</div>
          <div className="text-sm font-semibold text-white truncate">
            {employeeName}
          </div>
          <div className="text-xs text-slate-400 truncate">
            ID: {employeeLoginId || "—"}
          </div>
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
