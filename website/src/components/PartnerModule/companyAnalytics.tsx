import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBarChart,
  RadialBar,
  ComposedChart,
} from "recharts";
import {
  FaUsers,
  FaBuilding,
  FaUserTie,
  FaIdBadge,
  FaBolt,
  FaChartPie,
  FaCalendarAlt,
  FaShieldAlt,
  FaRegCheckCircle,
  FaSyncAlt,
} from "react-icons/fa";
import companyApi from "../../api/company.api.js";
import { getCompanyLabel, getResolvedSubscription, loadCompanyBundle, normalizePlanKey, syncCompanyStorage } from "./companyHelpers";

type PiePoint = { name: string; value: number };
type EmpTrendPoint = { date: string; active: number; total: number; events: number };
type SubTrendPoint = { date: string; seatsUsed: number; seatsPurchased: number; utilizationPct: number };
type StackedPoint = { name: string; active: number; inactive: number };
type BackendCompany = {
  _id: string;
  CompanyName?: string;
  companyName?: string;
  name?: string;
  Contact?: string;
  Email?: string;
  Address?: string;
  companyCode?: number;
  planKey?: string;
  planPrice?: number;
  billingCycle?: string;
  status?: string;
  reviewedAt?: string | null;
  createdAt?: string;
  documents?: any[];
};
type BackendEmployee = {
  _id?: string;
  id?: string;
  employeeId?: string;
  name?: string;
  employeeName?: string;
  role?: string;
  designation?: string;
  department?: string;
  status?: string;
  createdAt?: string;
};
type BackendSubscription = {
  planKey?: string;
  plan?: string;
  planPrice?: number;
  amount?: number;
  billing?: string;
  billingCycle?: string;
  status?: string;
  startsAt?: string;
  endsAt?: string;
  expiresAt?: string;
  purchasedAt?: string;
};
type BackendBundle = {
  companyId: string;
  dashboard: any;
  analytics: any;
  employees: any;
  subscription: any;
  payroll: any;
};

const cn = (...a: Array<string | false | undefined | null>) => a.filter(Boolean).join(" ");

const AXIS_TICK = { fill: "#475569", fontSize: 11 };
const AXIS_TICK_DIM = { fill: "#64748b", fontSize: 10 };
const GRID_STROKE = "rgba(15,23,42,0.06)";
const AXIS_STROKE = "rgba(15,23,42,0.15)";

const COLORS = {
  cyan: "#0ea5e9",
  blue: "#2563eb",
  purple: "#7c3aed",
  emerald: "#10b981",
  whiteSoft: "#94a3b8",
  inactive: "#cbd5e1",
};

function safeDate(value?: string | null) {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function planSeatLimit(planKey?: string | null) {
  const plan = normalizePlanKey(planKey);
  if (plan === "STARTER") return 1;
  if (plan === "PROFESSIONAL") return 3;
  return 999;
}

function isActiveEmployee(emp: BackendEmployee) {
  return String(emp.status || "ACTIVE").toUpperCase() === "ACTIVE";
}

function MiniKpi({
  label,
  value,
  tone = "blue",
  icon,
}: {
  label: string;
  value: string;
  tone?: "blue" | "emerald" | "rose" | "amber" | "cyan" | "purple";
  icon?: React.ReactNode;
}) {
  const toneMap = {
    blue: "bg-blue-50/80 border-blue-200 text-blue-950",
    emerald: "bg-emerald-50/80 border-emerald-200 text-emerald-950",
    rose: "bg-rose-50/80 border-rose-200 text-rose-950",
    amber: "bg-amber-50/80 border-amber-200 text-amber-950",
    cyan: "bg-sky-50/80 border-sky-200 text-sky-950",
    purple: "bg-purple-50/80 border-purple-200 text-purple-950",
  };

  return (
    <div className={cn("rounded-2xl border px-3.5 py-3 text-center transition shadow-xs", toneMap[tone])}>
      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
        {icon && <span className="text-xs">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="text-lg font-black mt-1 tracking-tight">{value}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-blue-200/80 bg-white p-6 shadow-sm shadow-blue-900/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          {icon}
        </div>
        <div>
          <div className="text-slate-950 font-extrabold text-base leading-tight">{title}</div>
          {subtitle ? <div className="text-slate-500 text-xs mt-0.5">{subtitle}</div> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100/70 bg-blue-50/30 p-3">{children}</div>
    </div>
  );
}

function PrettyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-md shadow-blue-900/10">
      <div className="text-slate-500 mb-1 font-semibold">{label}</div>
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <span className="text-slate-600">{p.name}</span>
            <span className="font-bold text-slate-900">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function companyAnalyticsDashboard() {
  const { id } = useParams();
  const location = useLocation();
  const routeState = (location.state as any) || {};

  const companyId =
    id ||
    routeState.companyId ||
    routeState.id ||
    localStorage.getItem("companyId") ||
    localStorage.getItem("activeCompanyId") ||
    "";
  const companyFromState = routeState.company || null;
  const companyName = routeState.companyName || localStorage.getItem("companyName") || "Company";

  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const bundle = (await loadCompanyBundle(companyId)) as BackendBundle;
      const analyticsRes = bundle?.analytics || null;
      setAnalyticsData(analyticsRes?.analytics || null);
      syncCompanyStorage(
        {
          company: bundle?.dashboard?.company || companyFromState,
          subscription: bundle?.subscription || null,
          serviceAccess: bundle?.dashboard?.serviceAccess || null,
        },
        companyId
      );
    } catch (e) {
      console.error("Failed to load company analytics bundle", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [companyId]);

  const company: BackendCompany | null = analyticsData?.company || companyFromState || null;
  const subscription: BackendSubscription | null = getResolvedSubscription({
    analytics: analyticsData,
    company,
  });

  const employees: BackendEmployee[] = useMemo(() => {
    if (Array.isArray(analyticsData?.employees)) return analyticsData.employees;
    if (Array.isArray(analyticsData?.serviceAccess?.employees)) return analyticsData.serviceAccess.employees;
    return [];
  }, [analyticsData]);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(isActiveEmployee).length;
  const inactiveEmployees = totalEmployees - activeEmployees;

  const deptShare: PiePoint[] = useMemo(() => {
    if (Array.isArray(analyticsData?.departments) && analyticsData.departments.length) {
      return analyticsData.departments.map((d: any) => ({ name: d.name, value: Number(d.value || 0) }));
    }
    const counts = new Map<string, number>();
    for (const emp of employees) {
      const d = emp.department || "Unassigned";
      counts.set(d, (counts.get(d) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [analyticsData?.departments, employees]);

  const roleShare: PiePoint[] = useMemo(() => {
    if (Array.isArray(analyticsData?.roles) && analyticsData.roles.length) {
      return analyticsData.roles.map((r: any) => ({ name: r.name, value: Number(r.value || 0) }));
    }
    const counts = new Map<string, number>();
    for (const emp of employees) {
      const r = emp.role || emp.designation || "General";
      counts.set(r, (counts.get(r) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [analyticsData?.roles, employees]);

  const deptBar = useMemo(() => deptShare.map((d) => ({ name: d.name, employees: d.value })), [deptShare]);
  const roleBar = useMemo(() => roleShare.map((r) => ({ name: r.name, employees: r.value })), [roleShare]);

  const deptActiveStack: StackedPoint[] = useMemo(() => {
    const map = new Map<string, { active: number; inactive: number }>();
    for (const emp of employees) {
      const d = emp.department || "Unassigned";
      const cur = map.get(d) || { active: 0, inactive: 0 };
      if (isActiveEmployee(emp)) cur.active++;
      else cur.inactive++;
      map.set(d, cur);
    }
    return Array.from(map.entries()).map(([name, val]) => ({ name, ...val }));
  }, [employees]);

  const roleActiveStack: StackedPoint[] = useMemo(() => {
    const map = new Map<string, { active: number; inactive: number }>();
    for (const emp of employees) {
      const r = emp.role || emp.designation || "General";
      const cur = map.get(r) || { active: 0, inactive: 0 };
      if (isActiveEmployee(emp)) cur.active++;
      else cur.inactive++;
      map.set(r, cur);
    }
    return Array.from(map.entries()).map(([name, val]) => ({ name, ...val }));
  }, [employees]);

  const deptRadar = useMemo(
    () =>
      deptShare.map((d) => ({
        metric: d.name,
        score: Math.min(100, Math.round(40 + d.value * 3)),
      })),
    [deptShare]
  );

  const roleRadar = useMemo(
    () =>
      roleShare.map((r) => ({
        metric: r.name,
        score: Math.min(100, Math.round(38 + r.value * 2)),
      })),
    [roleShare]
  );

  const seatLimit = planSeatLimit(
    subscription?.planKey ||
      subscription?.plan ||
      subscription?.planPrice ||
      company?.planKey ||
      company?.planPrice ||
      analyticsData?.company?.planKey ||
      analyticsData?.company?.planPrice
  );
  const seatsUsed = totalEmployees;
  const latestUtil = seatLimit === 999 ? 100 : Math.min(100, Math.round((seatsUsed / Math.max(seatLimit, 1)) * 100));
  const empTrend: EmpTrendPoint[] = useMemo(() => {
    const startedAt =
      safeDate(subscription?.startsAt) ||
      safeDate(subscription?.purchasedAt) ||
      safeDate(company?.reviewedAt) ||
      safeDate(company?.createdAt) ||
      new Date();
    const days = 14;
    const points: EmpTrendPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(startedAt);
      d.setDate(d.getDate() + i);
      const date = toISODate(d);
      points.push({
        date,
        active: activeEmployees,
        total: totalEmployees,
        events: deptShare.reduce((sum, item) => sum + Number(item.value || 0), 0),
      });
    }
    return points;
  }, [activeEmployees, totalEmployees, subscription?.startsAt, subscription?.purchasedAt, company?.reviewedAt, company?.createdAt, deptShare]);

  const subTrend: SubTrendPoint[] = useMemo(() => {
    const startedAt =
      safeDate(subscription?.startsAt) ||
      safeDate(subscription?.purchasedAt) ||
      safeDate(company?.reviewedAt) ||
      safeDate(company?.createdAt) ||
      new Date();
    const days = 14;
    const points: SubTrendPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(startedAt);
      d.setDate(d.getDate() + i);
      const date = toISODate(d);
      points.push({
        date,
        seatsUsed,
        seatsPurchased: seatLimit === 999 ? seatsUsed : seatLimit,
        utilizationPct: latestUtil,
      });
    }
    return points;
  }, [company?.createdAt, company?.reviewedAt, latestUtil, seatLimit, seatsUsed, subscription?.endsAt, subscription?.expiresAt, subscription?.purchasedAt, subscription?.startsAt]);

  const utilizationGauge = useMemo(() => [{ name: "Utilization", value: latestUtil }], [latestUtil]);
  const companyLabel = getCompanyLabel(company || companyFromState || {}, companyName);

  const PIE_COLORS = ["#0284c7", "#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626"];

  return (
    <div className="space-y-6">
      {/* ================= HERO HEADER ================= */}
      <div className="rounded-3xl border border-blue-200/80 bg-white p-6 sm:p-8 shadow-sm shadow-blue-900/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950">
                {companyLabel} Analytics &amp; Insights
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Live metrics calculated across employee departments, roles, active status, and seat utilization.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchAnalytics}
            className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-900 text-sm font-bold shadow-xs transition"
          >
            <FaSyncAlt className={cn(loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ================= KPI RIBBON ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniKpi label="Company Status" value={String(company?.status || "APPROVED").toUpperCase()} tone="emerald" icon={<FaBuilding />} />
        <MiniKpi label="Subscription" value={String(subscription?.status || (analyticsData?.subscriptionActive ? "ACTIVE" : "ACTIVE")).toUpperCase()} tone="blue" icon={<FaShieldAlt />} />
        <MiniKpi label="Total Staff" value={String(totalEmployees)} tone="blue" icon={<FaUsers />} />
        <MiniKpi label="Active Staff" value={String(activeEmployees)} tone="emerald" icon={<FaRegCheckCircle />} />
        <MiniKpi label="Plan Seats" value={seatLimit === 999 ? "Unlimited" : String(seatLimit)} tone="cyan" icon={<FaCalendarAlt />} />
        <MiniKpi label="Seat Utilization" value={`${latestUtil}%`} tone="purple" icon={<FaIdBadge />} />
      </div>

      {/* ================= CHARTS GRID ================= */}
      <div className="space-y-6">
        {/* Department + Role Share */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Department Distribution" subtitle="Employees grouped by department" icon={<FaBuilding />}>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<PrettyTooltip />} />
                  <Legend wrapperStyle={{ color: "#1e293b", fontSize: 12 }} />
                  <Pie data={deptShare} dataKey="value" nameKey="name" outerRadius={110} isAnimationActive={false}>
                    {deptShare.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Role Distribution" subtitle="Employees grouped by role designation" icon={<FaUserTie />}>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<PrettyTooltip />} />
                  <Legend wrapperStyle={{ color: "#1e293b", fontSize: 12 }} />
                  <Pie data={roleShare} dataKey="value" nameKey="name" outerRadius={110} isAnimationActive={false}>
                    {roleShare.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Department Count + Role Count Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Staff Count by Department" subtitle="Total employees per department" icon={<FaBuilding />}>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptBar} margin={{ top: 12, right: 16, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="name" tick={AXIS_TICK} stroke={AXIS_STROKE} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={AXIS_TICK_DIM} stroke={AXIS_STROKE} />
                  <Tooltip content={<PrettyTooltip />} />
                  <Bar dataKey="employees" fill={COLORS.cyan} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Staff Count by Role" subtitle="Total employees per designation" icon={<FaUserTie />}>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleBar} margin={{ top: 12, right: 16, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="name" tick={AXIS_TICK} stroke={AXIS_STROKE} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={AXIS_TICK_DIM} stroke={AXIS_STROKE} />
                  <Tooltip content={<PrettyTooltip />} />
                  <Bar dataKey="employees" fill={COLORS.blue} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Stacked Active vs Inactive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Department Active Status" subtitle="Active vs Inactive breakdown" icon={<FaUsers />}>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptActiveStack} margin={{ top: 12, right: 16, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="name" tick={AXIS_TICK} stroke={AXIS_STROKE} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={AXIS_TICK_DIM} stroke={AXIS_STROKE} />
                  <Tooltip content={<PrettyTooltip />} />
                  <Legend wrapperStyle={{ color: "#1e293b", fontSize: 12 }} />
                  <Bar dataKey="active" name="Active" stackId="a" fill={COLORS.emerald} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="inactive" name="Inactive" stackId="a" fill={COLORS.inactive} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Role Active Status" subtitle="Active vs Inactive breakdown" icon={<FaUsers />}>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roleActiveStack} margin={{ top: 12, right: 16, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="name" tick={AXIS_TICK} stroke={AXIS_STROKE} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={AXIS_TICK_DIM} stroke={AXIS_STROKE} />
                  <Tooltip content={<PrettyTooltip />} />
                  <Legend wrapperStyle={{ color: "#1e293b", fontSize: 12 }} />
                  <Bar dataKey="active" name="Active" stackId="a" fill={COLORS.blue} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="inactive" name="Inactive" stackId="a" fill={COLORS.inactive} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Growth & Subscription Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Employee Headcount Trend" subtitle="Active vs Total employees over time" icon={<FaUsers />}>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={empTrend} margin={{ top: 12, right: 16, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="date" tick={AXIS_TICK} stroke={AXIS_STROKE} interval={2} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={AXIS_TICK_DIM} stroke={AXIS_STROKE} />
                  <Tooltip content={<PrettyTooltip />} />
                  <Legend wrapperStyle={{ color: "#1e293b", fontSize: 12 }} />
                  <Area type="monotone" dataKey="active" name="Active" stroke={COLORS.blue} fill="rgba(37,99,235,0.14)" />
                  <Area type="monotone" dataKey="total" name="Total" stroke={COLORS.cyan} fill="rgba(14,165,233,0.08)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Subscription Seats &amp; Utilization" subtitle={`Current utilization: ${latestUtil}%`} icon={<FaIdBadge />}>
            <div className="h-[320px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="55%" innerRadius="55%" outerRadius="85%" barSize={20} data={utilizationGauge} startAngle={180} endAngle={0}>
                  <Tooltip content={<PrettyTooltip />} />
                  <RadialBar dataKey="value" cornerRadius={12} fill={COLORS.blue} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="#0f172a" fontSize="36" fontWeight="900">
                    {latestUtil}%
                  </text>
                  <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fill="#64748b" fontSize="13" fontWeight="600">
                    Seat Utilization
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Footer info pill */}
        <div className="rounded-3xl border border-blue-200/80 bg-white p-6 shadow-sm shadow-blue-900/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-slate-950 font-bold">Data Synchronization Active</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Metrics derive in real time from Company Profile, Service Access, and Employee Records.
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1.5 text-emerald-800 text-xs font-bold">
              <FaRegCheckCircle />
              Synced &amp; Healthy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
