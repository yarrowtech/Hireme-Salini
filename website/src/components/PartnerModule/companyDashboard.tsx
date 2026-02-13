import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendar,
  FaUsers,
  FaUserTie,
  FaPlus,
  FaTrash,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaChevronRight,
  FaCrown,
  FaShieldAlt,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBed,
} from "react-icons/fa";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

/** -----------------------------
 * Types
 ------------------------------*/
type Plan = "Starter" | "Professional" | "Enterprise";

type Company = {
  id: string;
  name: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
  status: "active" | "pending" | "inactive";

  subscriptionPlan: Plan;
  planAmount: number;
  planFrom: string;
  planTo: string;
};

type HRUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
};

type Employee = {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  role: string;
  salary: number;
  email: string;
  phone: string;
  joinDate: string;
  status: "active" | "on-leave" | "inactive";
};

type EmployeeAttendance = {
  employeeId: string;
  present: number;
  absent: number;
  leave: number;
  totalDays: number;
};

type AnalyticsRow = {
  id: string;
  department: string;
  employees: number;
  payroll: number;
  attendance: number;
};

/** -----------------------------
 * Utils
 ------------------------------*/
const cn = (...a: Array<string | false | undefined | null>) =>
  a.filter(Boolean).join(" ");

const fmtINR = (n: number) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function Pill({
  label,
  tone = "info",
}: {
  label: string;
  tone?: "success" | "warning" | "info" | "inactive" | "danger";
}) {
  const map = {
    success: "bg-green-500/15 border-green-500/30 text-green-200",
    warning: "bg-amber-500/15 border-amber-500/30 text-amber-200",
    info: "bg-cyan-500/15 border-cyan-500/30 text-cyan-200",
    inactive: "bg-slate-500/15 border-slate-500/30 text-slate-300",
    danger: "bg-rose-500/15 border-rose-500/30 text-rose-200",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        map[tone]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon,
  delta,
  deltaLabel,
  onClick,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  delta?: { dir: "up" | "down"; value: string };
  deltaLabel?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full text-left overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition",
        onClick &&
          "hover:bg-white/10 hover:border-cyan-500/30 hover:-translate-y-[1px] active:translate-y-0"
      )}
    >
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-purple-500/20 blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-300">{title}</div>
            <div className="mt-2 text-3xl font-extrabold text-white">
              {value}
            </div>

            {(delta || deltaLabel) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
                {delta && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1",
                      delta.dir === "up"
                        ? "border-green-500/30 bg-green-500/15 text-green-200"
                        : "border-red-500/30 bg-red-500/15 text-red-200"
                    )}
                  >
                    {delta.dir === "up" ? <FaArrowUp /> : <FaArrowDown />}
                    {delta.value}
                  </span>
                )}
                {deltaLabel && <span>{deltaLabel}</span>}
              </div>
            )}
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
            {icon}
          </div>
        </div>

        {onClick && (
          <div className="mt-4 text-xs text-cyan-200/80 font-semibold">
            Click to open →
          </div>
        )}
      </div>
    </button>
  );
}

/** ✅ FIXED PANEL (NO CLICK ISSUE) */
function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-bold text-white">{title}</div>

        {/* IMPORTANT FIX: right element must not block clicks */}
        {right && (
          <div className="shrink-0 pointer-events-none select-none">
            {right}
          </div>
        )}
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

/** -----------------------------
 * MAIN
 ------------------------------*/
export default function companyDashboardOneCompany() {
  type Page = "dashboard" | "hr" | "employees";
  const [page, setPage] = useState<Page>("dashboard");

  /** COMPANY */
  const [company, setCompany] = useState<Company>({
    id: "c1",
    name: "TechCorp Solutions",
    industry: "IT Services",
    location: "Mumbai",
    email: "hr@techcorp.com",
    phone: "+91 90000 10001",
    status: "active",
    subscriptionPlan: "Starter",
    planAmount: 999,
    planFrom: "2026-01-01",
    planTo: "2026-12-31",
  });

  /** EMPLOYEES */
  const employeesData: Employee[] = [
    {
      id: "e1",
      employeeId: "EMP001",
      name: "Rajesh Kumar",
      department: "Tech",
      role: "Developer",
      salary: 65000,
      email: "rajesh.k@techcorp.com",
      phone: "+91 98765 43210",
      joinDate: "2023-01-15",
      status: "active",
    },
    {
      id: "e2",
      employeeId: "EMP002",
      name: "Sneha Roy",
      department: "HR",
      role: "HR Executive",
      salary: 45000,
      email: "sneha.roy@techcorp.com",
      phone: "+91 98765 43211",
      joinDate: "2023-02-20",
      status: "active",
    },
    {
      id: "e3",
      employeeId: "EMP003",
      name: "Amit Patel",
      department: "Operations",
      role: "Manager",
      salary: 85000,
      email: "amit.p@techcorp.com",
      phone: "+91 98765 43212",
      joinDate: "2022-11-10",
      status: "active",
    },
    {
      id: "e4",
      employeeId: "EMP004",
      name: "Meera Nair",
      department: "Support",
      role: "Support",
      salary: 28000,
      email: "meera.n@techcorp.com",
      phone: "+91 98765 43213",
      joinDate: "2023-05-20",
      status: "on-leave",
    },
    {
      id: "e5",
      employeeId: "EMP005",
      name: "Rohit Verma",
      department: "Sales",
      role: "Sales Rep",
      salary: 42000,
      email: "rohit.v@techcorp.com",
      phone: "+91 98765 43214",
      joinDate: "2023-06-10",
      status: "active",
    },
  ];

  /** EMPLOYEE ATTENDANCE */
  const [attendanceMap] = useState<Record<string, EmployeeAttendance>>({
    EMP001: { employeeId: "EMP001", present: 22, absent: 2, leave: 1, totalDays: 25 },
    EMP002: { employeeId: "EMP002", present: 23, absent: 1, leave: 1, totalDays: 25 },
    EMP003: { employeeId: "EMP003", present: 20, absent: 3, leave: 2, totalDays: 25 },
    EMP004: { employeeId: "EMP004", present: 18, absent: 4, leave: 3, totalDays: 25 },
    EMP005: { employeeId: "EMP005", present: 21, absent: 2, leave: 2, totalDays: 25 },
  });

  const attendanceOf = useCallback(
    (employeeId: string) => {
      return (
        attendanceMap[employeeId] || {
          employeeId,
          present: 0,
          absent: 0,
          leave: 0,
          totalDays: 0,
        }
      );
    },
    [attendanceMap]
  );

  const attendancePct = (a: EmployeeAttendance) => {
    if (!a.totalDays) return 0;
    return Math.round((a.present / a.totalDays) * 100);
  };

  /** PLAN -> HR LIMIT */
  const planHrLimit = useMemo(() => {
    if (company.subscriptionPlan === "Starter") return 1;
    if (company.subscriptionPlan === "Professional") return 3;
    return 999;
  }, [company.subscriptionPlan]);

  const [enterpriseCustomLimit, setEnterpriseCustomLimit] = useState<number>(8);

  const finalHrLimit =
    company.subscriptionPlan === "Enterprise" ? enterpriseCustomLimit : planHrLimit;

  /** HR USERS */
  const [hrUsers, setHrUsers] = useState<HRUser[]>([
    {
      id: "hr1",
      name: "Priya Sharma",
      email: "priya.hr@techcorp.com",
      phone: "+91 98765 00001",
      createdAt: "2026-02-01",
    },
  ]);

  /** ADD HR FORM */
  const [hrName, setHrName] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [hrPhone, setHrPhone] = useState("");
  const [hrError, setHrError] = useState<string>("");

  const hrNameRef = useRef<HTMLInputElement | null>(null);
  const hrEmailRef = useRef<HTMLInputElement | null>(null);
  const hrPhoneRef = useRef<HTMLInputElement | null>(null);

  const limitReached = hrUsers.length >= finalHrLimit;

  const isValidEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
  const isValidPhone = (v: string) => v.replace(/\D/g, "").length >= 10;

  /** addHR */
  const addHR = useCallback(() => {
    setHrError("");

    if (company.status !== "active") {
      setHrError("Your subscription is not active. Please renew or upgrade plan.");
      return;
    }

    if (limitReached) {
      setHrError(
        `HR limit reached! Your plan allows only ${finalHrLimit} HR accounts. Please upgrade plan.`
      );
      return;
    }

    const n = hrName.trim();
    const e = hrEmail.trim().toLowerCase();
    const p = hrPhone.trim();

    if (!n) {
      setHrError("HR Name is required.");
      hrNameRef.current?.focus();
      return;
    }

    if (!e || !isValidEmail(e)) {
      setHrError("Please enter a valid HR email.");
      hrEmailRef.current?.focus();
      return;
    }

    if (!p || !isValidPhone(p)) {
      setHrError("Please enter a valid phone number.");
      hrPhoneRef.current?.focus();
      return;
    }

    const exists = hrUsers.some((x) => x.email.toLowerCase() === e);
    if (exists) {
      setHrError("This HR email already exists.");
      hrEmailRef.current?.focus();
      return;
    }

    const newHR: HRUser = {
      id: `hr_${Date.now()}`,
      name: n,
      email: e,
      phone: p,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setHrUsers((prev) => [newHR, ...prev]);

    setHrName("");
    setHrEmail("");
    setHrPhone("");

    setTimeout(() => hrNameRef.current?.focus(), 50);
  }, [company.status, limitReached, finalHrLimit, hrName, hrEmail, hrPhone, hrUsers]);

  const deleteHR = useCallback((id: string) => {
    setHrUsers((p) => p.filter((x) => x.id !== id));
    setHrError("");
  }, []);

  const handleHRKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, field: "name" | "email" | "phone") => {
      if (e.key !== "Enter") return;

      if (field === "name") hrEmailRef.current?.focus();
      if (field === "email") hrPhoneRef.current?.focus();
      if (field === "phone") addHR();
    },
    [addHR]
  );

  /** Analytics */
  const analytics: AnalyticsRow[] = [
    { id: "a1", department: "Tech", employees: 18, payroll: 980000, attendance: 92 },
    { id: "a2", department: "Operations", employees: 10, payroll: 520000, attendance: 88 },
    { id: "a3", department: "Sales", employees: 8, payroll: 280000, attendance: 90 },
    { id: "a4", department: "Support", employees: 9, payroll: 320000, attendance: 94 },
  ];

  const totals = useMemo(() => {
    const employees = analytics.reduce((s, r) => s + r.employees, 0);
    const payroll = analytics.reduce((s, r) => s + r.payroll, 0);
    const avgAttendance = analytics.length
      ? Math.round(analytics.reduce((s, r) => s + r.attendance, 0) / analytics.length)
      : 0;
    return { employees, payroll, avgAttendance };
  }, [analytics]);

  /** Attendance Summary */
  const attendanceSummary = useMemo(() => {
    const list = employeesData.map((e) => attendanceOf(e.employeeId));
    const totalDays = list.reduce((s, a) => s + (a.totalDays || 0), 0);
    const present = list.reduce((s, a) => s + (a.present || 0), 0);
    const absent = list.reduce((s, a) => s + (a.absent || 0), 0);
    const leave = list.reduce((s, a) => s + (a.leave || 0), 0);

    const pct = totalDays ? Math.round((present / totalDays) * 100) : 0;

    return { totalDays, present, absent, leave, pct };
  }, [employeesData, attendanceOf]);

  /** Upgrade Modal */
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<Plan>("Professional");

  const planCatalog = useMemo(() => {
    return [
      { plan: "Starter" as const, amount: 999, hr: 1 },
      { plan: "Professional" as const, amount: 9999, hr: 3 },
      { plan: "Enterprise" as const, amount: 24999, hr: "Custom" },
    ];
  }, []);

  const applyUpgrade = useCallback(() => {
    const selected = planCatalog.find((p) => p.plan === upgradePlan);
    if (!selected) return;

    setCompany((prev) => ({
      ...prev,
      subscriptionPlan: selected.plan,
      planAmount: selected.amount,
      status: "active",
      planFrom: new Date().toISOString().slice(0, 10),
      planTo: "2026-12-31",
    }));

    setUpgradeOpen(false);
    setHrError("");
  }, [planCatalog, upgradePlan]);

  /** Charts */
  const departmentAttendanceChart = useMemo(() => {
    return analytics.map((r) => ({
      department: r.department,
      attendance: r.attendance,
    }));
  }, [analytics]);

  const employeeAttendanceChart = useMemo(() => {
    return employeesData.map((e) => {
      const a = attendanceOf(e.employeeId);
      return {
        name: e.name.split(" ")[0],
        attendance: attendancePct(a),
      };
    });
  }, [employeesData, attendanceOf]);

  /** -----------------------------
   * DASHBOARD PAGE
   ------------------------------*/
  const DashboardPage = () => (
    <div className="space-y-6">
      {/* TOP COMPANY */}
      <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/10 p-8 backdrop-blur-xl">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/30 to-blue-500/20 border border-white/10 text-white">
                  <FaBuilding className="text-2xl" />
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-white">{company.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                    <span>{company.industry}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-2">
                      <FaMapMarkerAlt /> {company.location}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill
                      label={company.status.toUpperCase()}
                      tone={
                        company.status === "active"
                          ? "success"
                          : company.status === "pending"
                          ? "warning"
                          : "inactive"
                      }
                    />
                    <Pill label={`Plan: ${company.subscriptionPlan}`} tone="info" />
                    <Pill label={`₹${fmtINR(company.planAmount)}`} tone="success" />
                    <Pill label={`From: ${company.planFrom}`} tone="inactive" />
                    <Pill label={`To: ${company.planTo}`} tone="inactive" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setPage("hr")}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-white hover:opacity-95 transition"
              >
                <FaShieldAlt />
                Open HR Page
                <FaChevronRight />
              </button>
            </div>

            {/* DETAILS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-white font-bold mb-3">Company Full Details</div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-slate-300 inline-flex items-center gap-2">
                      <FaEnvelope /> Email
                    </span>
                    <span className="font-semibold text-white">{company.email}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-slate-300 inline-flex items-center gap-2">
                      <FaPhone /> Phone
                    </span>
                    <span className="font-semibold text-white">{company.phone}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-slate-300 inline-flex items-center gap-2">
                      <FaCrown /> Purchase Plan
                    </span>
                    <span className="font-semibold text-white">
                      {company.subscriptionPlan} (₹{fmtINR(company.planAmount)})
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-slate-300 inline-flex items-center gap-2">
                      <FaCalendar /> Plan Duration
                    </span>
                    <span className="font-semibold text-white">
                      {company.planFrom} → {company.planTo}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-white font-bold">HR Accounts Summary</div>
                  <Pill
                    label={`${hrUsers.length} / ${finalHrLimit}`}
                    tone={limitReached ? "warning" : "success"}
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Starter</span>
                    <span className="text-white font-semibold">1 HR</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span>Professional</span>
                    <span className="text-white font-semibold">3 HR</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span>Enterprise</span>
                    <span className="text-white font-semibold">Custom HR</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => setPage("hr")}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 transition"
                  >
                    Manage HR
                    <FaChevronRight />
                  </button>

                  <button
                    onClick={() => setUpgradeOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-semibold text-white hover:opacity-95 transition"
                  >
                    Upgrade Plan
                    <FaChevronRight />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={employeesData.length.toString()}
          icon={<FaUsers className="text-xl" />}
          onClick={() => setPage("employees")}
        />

        <StatCard
          title="Employee Attendance"
          value={`${attendanceSummary.pct}%`}
          icon={<FaChartLine className="text-xl" />}
          deltaLabel={`${attendanceSummary.present} Present • ${attendanceSummary.absent} Absent • ${attendanceSummary.leave} Leave`}
        />

        <StatCard
          title="Company Payroll (Departments)"
          value={`₹${fmtINR(totals.payroll)}`}
          icon={<FaCheckCircle className="text-xl" />}
          delta={{ dir: "up", value: "Auto" }}
          deltaLabel="Calculated from analytics"
        />

        <StatCard
          title="HR Accounts"
          value={`${hrUsers.length}/${finalHrLimit}`}
          icon={<FaUserTie className="text-xl" />}
          onClick={() => setPage("hr")}
        />
      </div>

      {/* GRAPHS */}
      <Panel title="Analytics Graphs + Summary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-white font-bold mb-4">Department Attendance %</div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentAttendanceChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="attendance" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-white font-bold mb-4">Employee Attendance %</div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={employeeAttendanceChart}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="attendance" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );

  /** -----------------------------
   * EMPLOYEE PAGE
   ------------------------------*/
  const EmployeePage = () => (
    <div className="space-y-6">
      <div className="rounded-[2.25rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-extrabold text-white">Employee List</div>
            <div className="text-sm text-slate-300">
              All employees under {company.name} (with attendance)
            </div>
          </div>

          <button
            onClick={() => setPage("dashboard")}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 transition"
          >
            Back Dashboard
          </button>
        </div>
      </div>

      <Panel title="Employees Full Details + Attendance">
        <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
          <div data-scrollbox="true" className="max-h-[650px] overflow-auto">
            <table className="min-w-full w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/70 backdrop-blur text-slate-200">
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3">Employee</th>
                  <th className="text-left px-4 py-3">Department</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Salary</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Join Date</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Present</th>
                  <th className="text-left px-4 py-3">Absent</th>
                  <th className="text-left px-4 py-3">Leave</th>
                  <th className="text-left px-4 py-3">Attendance</th>
                </tr>
              </thead>

              <tbody className="text-white">
                {employeesData.map((emp) => {
                  const a = attendanceOf(emp.employeeId);
                  const pct = attendancePct(a);

                  return (
                    <tr key={emp.id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                            <FaUserTie />
                          </div>
                          <div>
                            <div className="font-semibold">{emp.name}</div>
                            <div className="text-xs text-slate-400">{emp.employeeId}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">{emp.department}</td>
                      <td className="px-4 py-4 font-semibold">{emp.role}</td>
                      <td className="px-4 py-4">₹{fmtINR(emp.salary)}</td>
                      <td className="px-4 py-4 text-slate-200">{emp.email}</td>
                      <td className="px-4 py-4 text-slate-200">{emp.phone}</td>
                      <td className="px-4 py-4 text-slate-300">{emp.joinDate}</td>

                      <td className="px-4 py-4">
                        <Pill
                          label={emp.status.toUpperCase().replace("-", " ")}
                          tone={
                            emp.status === "active"
                              ? "success"
                              : emp.status === "on-leave"
                              ? "warning"
                              : "inactive"
                          }
                        />
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
                          <FaCheckCircle className="text-green-200" />
                          {a.present}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
                          <FaExclamationTriangle className="text-amber-200" />
                          {a.absent}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
                          <FaBed className="text-cyan-200" />
                          {a.leave}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <Pill
                          label={`${pct}%`}
                          tone={pct >= 90 ? "success" : pct >= 80 ? "warning" : "danger"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!employeesData.length && (
              <div className="py-10 text-center text-slate-300">No employees found.</div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );

  /** -----------------------------
   * HR PAGE
   ------------------------------*/
  const HRPage = () => (
    <div className="space-y-6">
      <div className="rounded-[2.25rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-extrabold text-white">HR Management</div>
            <div className="text-sm text-slate-300">
              Enter works: Name → Email → Phone → Add
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setPage("dashboard")}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 transition"
            >
              Back Dashboard
            </button>

            <button
              onClick={() => setUpgradeOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-semibold text-white hover:opacity-95 transition"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>

      <Panel
        title="Subscription Verification"
        right={
          <Pill
            label={company.status === "active" ? "Verified" : "Not Active"}
            tone={company.status === "active" ? "success" : "warning"}
          />
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-300">Current Plan</div>
            <div className="mt-1 text-2xl font-extrabold text-white">
              {company.subscriptionPlan}
            </div>
            <div className="mt-2 text-sm text-slate-300">
              Amount: <b className="text-white">₹{fmtINR(company.planAmount)}</b>
            </div>
            <div className="mt-2 text-sm text-slate-300">
              Valid:{" "}
              <b className="text-white">
                {company.planFrom} → {company.planTo}
              </b>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-300">HR Limit (Plan Wise)</div>
            <div className="mt-1 text-2xl font-extrabold text-white">
              {hrUsers.length} / {finalHrLimit}
            </div>

            <div className="mt-2 text-sm text-slate-300">
              Status:{" "}
              <b className={limitReached ? "text-rose-200" : "text-green-200"}>
                {limitReached ? "Limit Reached" : "Available"}
              </b>
            </div>

            {company.subscriptionPlan === "Enterprise" && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-400 mb-2">
                  Enterprise Custom HR Limit
                </div>
                <input
                  type="number"
                  value={enterpriseCustomLimit}
                  min={1}
                  onChange={(e) =>
                    setEnterpriseCustomLimit(Math.max(1, Number(e.target.value || 1)))
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel
        title="Add HR Account"
        right={
          limitReached ? (
            <Pill label="Upgrade Required" tone="warning" />
          ) : (
            <Pill label="Allowed" tone="success" />
          )
        }
      >
        {/* IMPORTANT: z-20 makes sure inputs always clickable */}
        <div className="relative z-20 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <input
            ref={hrNameRef}
            value={hrName}
            onChange={(e) => setHrName(e.target.value)}
            onKeyDown={(e) => handleHRKeyDown(e, "name")}
            placeholder="HR Name"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none placeholder:text-slate-500"
          />

          <input
            ref={hrEmailRef}
            value={hrEmail}
            onChange={(e) => setHrEmail(e.target.value)}
            onKeyDown={(e) => handleHRKeyDown(e, "email")}
            placeholder="HR Email"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none placeholder:text-slate-500"
          />

          <input
            ref={hrPhoneRef}
            value={hrPhone}
            onChange={(e) => setHrPhone(e.target.value)}
            onKeyDown={(e) => handleHRKeyDown(e, "phone")}
            placeholder="HR Phone"
            autoComplete="off"
            spellCheck={false}
            inputMode="numeric"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none placeholder:text-slate-500"
          />
        </div>

        {hrError && (
          <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {hrError}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={addHR}
            disabled={limitReached || company.status !== "active"}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition",
              limitReached || company.status !== "active"
                ? "bg-white/10 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-400 to-blue-500 text-white hover:opacity-95"
            )}
          >
            <FaPlus /> Add HR
          </button>

          {(limitReached || company.status !== "active") && (
            <button
              onClick={() => setUpgradeOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-95 transition"
            >
              Upgrade Subscription
              <FaChevronRight />
            </button>
          )}
        </div>
      </Panel>

      <Panel title="HR Accounts List">
        <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
          <div data-scrollbox="true" className="max-h-[520px] overflow-auto">
            <table className="min-w-full w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/70 backdrop-blur text-slate-200">
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3">HR Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Created</th>
                  <th className="text-left px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="text-white">
                {hrUsers.map((h) => (
                  <tr key={h.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="px-4 py-4 font-semibold">{h.name}</td>
                    <td className="px-4 py-4 text-slate-200">{h.email}</td>
                    <td className="px-4 py-4 text-slate-200">{h.phone}</td>
                    <td className="px-4 py-4 text-slate-300">{h.createdAt}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => deleteHR(h.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/15 transition"
                      >
                        <FaTrash /> Remove
                      </button>
                    </td>
                  </tr>
                ))}

                {!hrUsers.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-300">
                      No HR accounts added.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  );

  /** -----------------------------
   * UPGRADE MODAL
   ------------------------------*/
  const UpgradeModal = () => {
    if (!upgradeOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={() => setUpgradeOpen(false)} />

        <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-extrabold text-white">Upgrade Subscription</div>
              <div className="text-sm text-slate-300">
                Choose a plan to unlock more HR accounts.
              </div>
            </div>

            <button
              onClick={() => setUpgradeOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
            >
              <FaTimes />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {planCatalog.map((p) => {
              const active = upgradePlan === p.plan;
              const current = company.subscriptionPlan === p.plan;

              return (
                <button
                  key={p.plan}
                  onClick={() => setUpgradePlan(p.plan)}
                  className={cn(
                    "rounded-3xl border p-5 text-left transition",
                    active
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-white font-extrabold">{p.plan}</div>
                    {current && <Pill label="Current" tone="success" />}
                  </div>

                  <div className="mt-3 text-2xl font-extrabold text-white">
                    ₹{fmtINR(p.amount)}
                  </div>

                  <div className="mt-2 text-sm text-slate-300">
                    HR Limit:{" "}
                    <b className="text-white">
                      {typeof p.hr === "string" ? p.hr : `${p.hr} HR`}
                    </b>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              onClick={() => setUpgradeOpen(false)}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 transition"
            >
              Cancel
            </button>

            <button
              onClick={applyUpgrade}
              className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-95 transition"
            >
              Confirm Upgrade
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {page === "dashboard" ? <DashboardPage /> : page === "hr" ? <HRPage /> : <EmployeePage />}
      <UpgradeModal />
    </>
  );
}
