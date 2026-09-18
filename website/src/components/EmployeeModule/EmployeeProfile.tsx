import { useEffect, useState } from "react";
import {
  FaUserTie,
  FaBuilding,
  FaBriefcase,
  FaMoneyBillWave,
  FaClock,
  FaMapMarkerAlt,
  FaKey,
} from "react-icons/fa";
import employeeApi from "../../api/employee.api";

/* ---------------- Types ---------------- */
type EmployeeData = {
  employeeId: string;
  companyId: string;
  name: string;
  role: string;
  department: string;
  designation?: string;
  email: string;
  phone: string;
  salary?: number;
  dateOfJoining?: string;
  shiftStart?: string;
  shiftEnd?: string;
  shiftName?: string;
  weeklyOff?: string;
  workLocation?: string;
  status?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  companyName?: string;
  companyCode?: string | number;
  username?: string;
  password?: string;
};

type View = "overview" | "payments" | "job";

/* ---------------- Utils ---------------- */
const cn = (...x: Array<string | false | null | undefined>) => x.filter(Boolean).join(" ");
const formatINR = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function EmployeeProfile() {
  const [view, setView] = useState<View>("overview");
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<EmployeeData | null>(null);
  const [salaryStructure, setSalaryStructure] = useState<any>(null);
  const [payrollHistory, setPayrollHistory] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await employeeApi.me();
        if (!alive) return;
        if (res?.data) {
          const { employee, user, company, salaryStructure: ss, recentPayroll } = res.data;
          setProfileData({
            employeeId: employee?.employeeId || user?.username || "EMP-001",
            companyId: String(company?.code || user?.companyCode || ""),
            username: user?.username || employee?.employeeId || "",
            password: user?.password || employee?.password || "",
            name: employee?.name || user?.username || "Employee",
            role: employee?.role || user?.role || "Employee",
            department: employee?.department || "General",
            designation: employee?.designation || employee?.role || "Employee",
            email: employee?.email || user?.email || "",
            phone: employee?.phone || employee?.contact || "",
            salary: ss?.netSalary || ss?.grossSalary || 0,
            dateOfJoining: employee?.joiningDate || "",
            shiftStart: employee?.shiftStart || "09:00",
            shiftEnd: employee?.shiftEnd || "18:00",
            shiftName: employee?.shiftName || "Standard Shift",
            weeklyOff: employee?.weeklyOff || "Sunday",
            workLocation: employee?.workLocation || "Main Office",
            status: employee?.status || "ACTIVE",
            companyName: company?.name || "Company",
            companyCode: company?.code || user?.companyCode || "",
          });
          setSalaryStructure(ss || null);
          setPayrollHistory(recentPayroll || []);
        }
      } catch {
        // fallback to localStorage or default
        if (!alive) return;
        try {
          const raw = localStorage.getItem("authUser");
          if (raw) {
            const u = JSON.parse(raw);
            setProfileData({
              employeeId: u.employeeId || u.username || "EMP-001",
              companyId: String(u.companyCode || ""),
              username: u.username || u.employeeId || "",
              password: u.password || "",
              name: u.name || u.username || "Employee",
              role: u.role || "Employee",
              department: "General",
              email: u.email || "",
              phone: "+91 98765 43210",
              status: "ACTIVE",
              companyName: localStorage.getItem("companyName") || "Company",
            });
          }
        } catch {}
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      alive = false;
    };
  }, []);

  const emp = profileData || {
    employeeId: "EMP-001",
    companyId: "101",
    username: "EMP-001",
    password: "",
    name: "Employee",
    role: "Employee",
    department: "General",
    email: "employee@hireme.com",
    phone: "+91 98765 43210",
    status: "ACTIVE",
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-blue-200/80 bg-white p-8 shadow-sm animate-pulse space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-200" />
          <div className="space-y-2">
            <div className="w-48 h-6 bg-slate-200 rounded" />
            <div className="w-32 h-4 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ================= HERO HEADER ================= */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-8 shadow-xl shadow-blue-900/20">
        <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-white/15 backdrop-blur grid place-items-center text-2xl font-black text-white ring-2 ring-white/25 shrink-0">
              {(emp.name || "E").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-extrabold text-white truncate">{emp.name}</h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-100 border border-emerald-300/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {emp.status || "ACTIVE"}
                </span>
              </div>
              <p className="text-sm font-semibold text-blue-100 mt-0.5">
                {emp.designation || emp.role} • {emp.department}
              </p>
              <p className="text-xs text-blue-100/80 mt-1">
                Employee ID: <strong className="text-white font-mono">{emp.employeeId}</strong>
                {emp.companyName && <> - Company: <strong className="text-white">{emp.companyName}</strong></>}
              </p>
            </div>
          </div>

          {/* Navigation Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setView("overview")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition",
                view === "overview"
                  ? "bg-white text-blue-800 shadow-md"
                  : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setView("payments")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition",
                view === "payments"
                  ? "bg-white text-blue-800 shadow-md"
                  : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
              )}
            >
              Compensation
            </button>
            <button
              onClick={() => setView("job")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold transition",
                view === "job"
                  ? "bg-white text-blue-800 shadow-md"
                  : "bg-white/10 border border-white/20 text-white hover:bg-white/20"
              )}
            >
              Job & Shift
            </button>
          </div>
        </div>
      </div>

      {/* ================= VIEW CONTENTS ================= */}
      {view === "overview" && (
        <div className="grid md:grid-cols-2 gap-6">
          <InfoCard title="Login Access" icon={<FaKey className="text-blue-600" />}>
            <Row label="Username" value={emp.username || emp.employeeId} />
            <Row label="Company Code" value={emp.companyCode || emp.companyId || "Not set"} />
            <Row label="Password" value={emp.password || "Hidden - ask company admin to reset"} />
            <Row label="Portal Status" value={emp.status || "ACTIVE"} />
          </InfoCard>

          <InfoCard title="Personal & Contact Information" icon={<FaUserTie className="text-blue-600" />}>
            <Row label="Full Name" value={emp.name} />
            <Row label="Email Address" value={emp.email || "-"} />
            <Row label="Phone Number" value={emp.phone || "-"} />
            <Row label="Employee Code" value={emp.employeeId} />
            <Row label="Account Status" value={emp.status || "ACTIVE"} />
          </InfoCard>

          <InfoCard title="Organization & Placement" icon={<FaBuilding className="text-blue-600" />}>
            <Row label="Company" value={emp.companyName || "HireMe Partner"} />
            <Row label="Company Code" value={emp.companyCode || "-"} />
            <Row label="Department" value={emp.department} />
            <Row label="Designation" value={emp.designation || emp.role} />
            <Row label="Joining Date" value={emp.dateOfJoining || "-"} />
            <Row label="Work Location" value={emp.workLocation || "Main Office"} />
          </InfoCard>
        </div>
      )}

      {view === "payments" && (
        <div className="grid md:grid-cols-2 gap-6">
          <InfoCard title="Salary Structure" icon={<FaMoneyBillWave className="text-emerald-600" />}>
            {salaryStructure ? (
              <>
                <Row label="Basic Salary" value={formatINR(salaryStructure.basic)} />
                <Row label="House Rent Allowance (HRA)" value={formatINR(salaryStructure.hra || 0)} />
                <Row label="Special Allowances" value={formatINR(salaryStructure.allowances || 0)} />
                <Row label="Gross Salary" value={formatINR(salaryStructure.grossSalary || 0)} />
                <Row label="Statutory Deductions" value={`-${formatINR(salaryStructure.statutoryDeductions || 0)}`} />
                <div className="pt-3 mt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-900">Net Monthly Salary</span>
                  <span className="text-xl font-black text-emerald-700">
                    {formatINR(salaryStructure.netSalary || salaryStructure.grossSalary || 0)}
                  </span>
                </div>
              </>
            ) : (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-sm text-blue-900">
                No confirmed salary structure is assigned yet. Please check the Salary page or contact HR.
              </div>
            )}
          </InfoCard>

          <InfoCard title="Recent Payroll Distributions" icon={<FaBriefcase className="text-blue-600" />}>
            {payrollHistory && payrollHistory.length > 0 ? (
              <div className="space-y-3">
                {payrollHistory.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{p.month}</div>
                      <div className="text-xs text-slate-500">Gross: {formatINR(p.grossSalary)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-700">{formatINR(p.netSalary)}</div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 text-center text-sm text-slate-500">
                No past payroll run logs found.
              </div>
            )}
          </InfoCard>
        </div>
      )}

      {view === "job" && (
        <div className="grid md:grid-cols-2 gap-6">
          <InfoCard title="Shift Schedule" icon={<FaClock className="text-blue-600" />}>
            <Row label="Shift Timing" value={`${emp.shiftStart || "09:00"} to ${emp.shiftEnd || "18:00"}`} />
            <Row label="Shift Name" value={emp.shiftName || "Standard Day Shift"} />
            <Row label="Weekly Off" value={emp.weeklyOff || "Sunday"} />
            <Row label="Attendance Mode" value="Self-Punch Portal" />
          </InfoCard>

          <InfoCard title="Work Location & Policy" icon={<FaMapMarkerAlt className="text-blue-600" />}>
            <Row label="Primary Workplace" value={emp.workLocation || "Main Office"} />
            <Row label="Employment Type" value="Full-Time" />
            <Row label="Notice Period" value="30 Days" />
            <Row label="Probation" value="Completed" />
          </InfoCard>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-blue-200/70 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
        {icon && (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-lg">{icon}</span>
        )}
        <h3 className="text-base font-extrabold text-slate-950">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-slate-100/80 last:border-0 hover:bg-blue-50/40 -mx-2 px-2 rounded-lg transition">
      <span className="text-slate-600 font-medium">{label}</span>
      <span className="text-slate-900 font-bold text-right">{value}</span>
    </div>
  );
}
