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

const AXIS_TICK = { fill: "rgba(255,255,255,0.92)", fontSize: 11 };
const AXIS_TICK_DIM = { fill: "rgba(255,255,255,0.72)", fontSize: 10 };
const GRID_STROKE = "rgba(255,255,255,0.08)";
const AXIS_STROKE = "rgba(255,255,255,0.20)";

const COLORS = {
  cyan: "rgba(34,211,238,0.95)",
  blue: "rgba(96,165,250,0.95)",
  purple: "rgba(167,139,250,0.95)",
  whiteSoft: "rgba(255,255,255,0.35)",
  inactive: "rgba(255,255,255,0.16)",
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
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white">
          {icon}
        </div>
        <div>
          <div className="text-white font-semibold">{title}</div>
          {subtitle ? <div className="text-slate-200/80 text-sm">{subtitle}</div> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">{children}</div>
    </div>
  );
}

function PrettyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/15 bg-slate-950/95 px-3 py-2 text-xs text-white shadow-xl">
      <div className="text-slate-200/80 mb-1">{label}</div>
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-8">
            <span className="text-slate-200/90">{p.name}</span>
            <span className="font-semibold">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function companyAnalyticsDashboard() {
  const { id } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [company, setCompany] = useState<BackendCompany | null>(null);
  const [subscription, setSubscription] = useState<BackendSubscription | null>(null);
  const [employeeList, setEmployeeList] = useState<BackendEmployee[]>([]);
  const companyFromState = (location.state as any)?.company;
  const [companyName, setCompanyName] = useState(
    companyFromState?.CompanyName || localStorage.getItem("companyName") || "Company"
  );

  useEffect(() => {
    const load = async () => {
      try {
        const companyIdToUse = id || (await companyApi.resolveCompanyId());
        if (!companyIdToUse) return;
        const bundle: BackendBundle = (await loadCompanyBundle(companyIdToUse)) as any;
        const dashboard = bundle?.dashboard || null;
        const analyticsRes = bundle?.analytics || null;
        const employeesRes = bundle?.employees || null;
        const subscriptionRes = bundle?.subscription || null;
        const serviceAccessRes = dashboard?.serviceAccess || analyticsRes?.analytics?.serviceAccess || null;

        setCompany(dashboard?.company || companyFromState || null);
        setSubscription(getResolvedSubscription({
          dashboard,
          subscription: subscriptionRes,
          serviceAccess: serviceAccessRes,
          company: dashboard?.company || companyFromState || null,
        }));
        const employees = Array.isArray(employeesRes?.employees)
          ? employeesRes.employees
          : Array.isArray(serviceAccessRes?.employees)
          ? serviceAccessRes.employees
          : [];
        setEmployeeList(employees);

        const nextAnalytics = analyticsRes?.analytics || dashboard || {};
        setAnalyticsData(nextAnalytics);

        const backendCompany: BackendCompany | null = dashboard?.company || companyFromState || null;
        if (backendCompany) {
          setCompanyName(getCompanyLabel(backendCompany, "Company"));
        }
        syncCompanyStorage(
          {
            company: backendCompany,
            subscription: subscriptionRes,
            serviceAccess: serviceAccessRes,
          },
          companyIdToUse
        );
      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, companyFromState]);

  const totalEmployees = employeeList.length || Number(analyticsData?.employees || 0);
  const activeEmployees = employeeList.filter(isActiveEmployee).length || Number(analyticsData?.employees || 0);
  const inactiveEmployees = Math.max(0, totalEmployees - activeEmployees);
  const departmentsRaw = Array.isArray(analyticsData?.departments) ? analyticsData.departments : [];
  const rolesRaw = Array.isArray(analyticsData?.roles) ? analyticsData.roles : [];

  const deptShare: PiePoint[] = useMemo(() => {
    if (departmentsRaw.length) {
      return departmentsRaw.map((item: any) => ({ name: item.name, value: Number(item.value || 0) }));
    }
    const tally = new Map<string, number>();
    employeeList.forEach((emp) => {
      const key = String(emp.department || "General");
      tally.set(key, (tally.get(key) || 0) + 1);
    });
    return Array.from(tally.entries()).map(([name, value]) => ({ name, value }));
  }, [departmentsRaw, employeeList]);

  const roleShare: PiePoint[] = useMemo(() => {
    if (rolesRaw.length) {
      return rolesRaw.map((item: any) => ({ name: item.name, value: Number(item.value || 0) }));
    }
    const tally = new Map<string, number>();
    employeeList.forEach((emp) => {
      const key = String(emp.role || "Employee");
      tally.set(key, (tally.get(key) || 0) + 1);
    });
    return Array.from(tally.entries()).map(([name, value]) => ({ name, value }));
  }, [rolesRaw, employeeList]);

  const deptBar = useMemo(() => deptShare.map((d) => ({ name: d.name, employees: d.value })), [deptShare]);
  const roleBar = useMemo(() => roleShare.map((r) => ({ name: r.name, employees: r.value })), [roleShare]);

  const deptActiveStack: StackedPoint[] = useMemo(
    () =>
      deptShare.map((d) => {
        const active = Math.max(0, Math.round(d.value * 0.7));
        return { name: d.name, active, inactive: Math.max(0, d.value - active) };
      }),
    [deptShare]
  );

  const roleActiveStack: StackedPoint[] = useMemo(
    () =>
      roleShare.map((r) => {
        const active = Math.max(0, Math.round(r.value * 0.7));
        return { name: r.name, active, inactive: Math.max(0, r.value - active) };
      }),
    [roleShare]
  );

  const deptRadar = useMemo(
    () =>
      deptShare.map((d) => ({
        metric: d.name,
        score: Math.min(100, Math.round(40 + d.value * 2)),
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="text-3xl md:text-4xl font-extrabold">
            {companyLabel}{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Analytics Charts
            </span>
          </div>
          <div className="mt-2 text-slate-200/80 text-sm">
            Live backend snapshot from company, subscription, employees, payroll, and service access data.
          </div>
          {loading ? <div className="mt-2 text-sm text-cyan-200">Loading analytics from backend…</div> : null}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="text-slate-300 text-sm">Company Status</div>
            <div className="mt-2 text-xl font-bold text-white inline-flex items-center gap-2">
              <FaBuilding />
              {String(company?.status || "UNKNOWN").toUpperCase()}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="text-slate-300 text-sm">Subscription</div>
            <div className="mt-2 text-xl font-bold text-white inline-flex items-center gap-2">
              <FaShieldAlt />
              {String((subscription?.status || (analyticsData?.subscriptionActive ? "ACTIVE" : "INACTIVE")) as string).toUpperCase()}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="text-slate-300 text-sm">Employees Managed</div>
            <div className="mt-2 text-xl font-bold text-white inline-flex items-center gap-2">
              <FaUsers />
              {totalEmployees}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="text-slate-300 text-sm">Employee Status</div>
            <div className="mt-2 text-xl font-bold text-white inline-flex items-center gap-2">
              <FaRegCheckCircle />
              {activeEmployees} active / {inactiveEmployees} inactive
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="text-slate-300 text-sm">Plan Seats</div>
            <div className="mt-2 text-xl font-bold text-white inline-flex items-center gap-2">
              <FaCalendarAlt />
              {seatLimit === 999 ? "Unlimited" : seatLimit}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="pb-2">
          {/* Department + Role */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Department Share" subtitle="Employees distribution by department" icon={<FaBuilding />}>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<PrettyTooltip />} />
                    <Legend wrapperStyle={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }} />
                    <Pie data={deptShare} dataKey="value" nameKey="name" outerRadius={120} isAnimationActive={false}>
                      {deptShare.map((_, i) => (
                        <Cell key={i} fill={`rgba(34,211,238,${0.22 + (i % 6) * 0.12})`} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Role Share" subtitle="Employees distribution by role" icon={<FaUserTie />}>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<PrettyTooltip />} />
                    <Legend wrapperStyle={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }} />
                    <Pie data={roleShare} dataKey="value" nameKey="name" outerRadius={120} isAnimationActive={false}>
                      {roleShare.map((_, i) => (
                        <Cell key={i} fill={`rgba(96,165,250,${0.2 + (i % 6) * 0.12})`} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Department Count" subtitle="Employees per department" icon={<FaBuilding />}>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptBar} margin={{ top: 12, right: 16, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="name"
                      tick={AXIS_TICK}
                      stroke={AXIS_STROKE}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis tick={AXIS_TICK_DIM} stroke={AXIS_STROKE} />
                    <Tooltip content={<PrettyTooltip />} />
                    <Bar dataKey="employees" fill={COLORS.cyan} radius={[10, 10, 0, 0]} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Role Count" subtitle="Employees per role" icon={<FaUserTie />}>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleBar} margin={{ top: 12, right: 16, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="name"
                      tick={AXIS_TICK}
                      stroke={AXIS_STROKE}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis tick={AXIS_TICK_DIM} stroke={AXIS_STROKE} />
                    <Tooltip content={<PrettyTooltip />} />
                    <Bar dataKey="employees" fill={COLORS.blue} radius={[10, 10, 0, 0]} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Department Activity" subtitle="Active vs inactive (stacked)" icon={<FaUsers />}>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptActiveStack} margin={{ top: 12, right: 16, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="name"
                      tick={AXIS_TICK}
                      stroke={AXIS_STROKE}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis tick={AXIS_TICK_DIM} stroke={AXIS_STROKE} />
                    <Tooltip content={<PrettyTooltip />} />
                    <Legend wrapperStyle={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }} />
                    <Bar dataKey="active" stackId="a" fill={COLORS.cyan} activeBar={false} />
                    <Bar dataKey="inactive" stackId="a" fill={COLORS.inactive} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Role Activity" subtitle="Active vs inactive (stacked)" icon={<FaUsers />}>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleActiveStack} margin={{ top: 12, right: 16, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="name"
                      tick={AXIS_TICK}
                      stroke={AXIS_STROKE}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis tick={AXIS_TICK_DIM} stroke={AXIS_STROKE} />
                    <Tooltip content={<PrettyTooltip />} />
                    <Legend wrapperStyle={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }} />
                    <Bar dataKey="active" stackId="a" fill={COLORS.blue} activeBar={false} />
                    <Bar dataKey="inactive" stackId="a" fill={COLORS.inactive} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Radar */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Department Radar" subtitle="Composite score by department" icon={<FaChartPie />}>
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={deptRadar} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                    <PolarGrid stroke={GRID_STROKE} />
                    <PolarAngleAxis dataKey="metric" tick={AXIS_TICK} />
                    <PolarRadiusAxis tick={AXIS_TICK_DIM} />
                    <Tooltip content={<PrettyTooltip />} />
                    <Radar dataKey="score" stroke={COLORS.cyan} fill="rgba(34,211,238,0.22)" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Role Radar" subtitle="Composite score by role" icon={<FaChartPie />}>
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={roleRadar} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                    <PolarGrid stroke={GRID_STROKE} />
                    <PolarAngleAxis dataKey="metric" tick={AXIS_TICK} />
                    <PolarRadiusAxis tick={AXIS_TICK_DIM} />
                    <Tooltip content={<PrettyTooltip />} />
                    <Radar dataKey="score" stroke={COLORS.blue} fill="rgba(96,165,250,0.22)" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Employee + Subscription */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Employee Active Trend" subtitle="Active vs total employees" icon={<FaUsers />}>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={empTrend} margin={{ top: 12, right: 16, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="date"
                      tick={AXIS_TICK}
                      stroke={AXIS_STROKE}
                      interval={2}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis tick={AXIS_TICK_DIM} stroke={AXIS_STROKE} />
                    <Tooltip content={<PrettyTooltip />} />
                    <Legend wrapperStyle={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }} />
                    <Area type="monotone" dataKey="active" stroke={COLORS.cyan} fill="rgba(34,211,238,0.18)" />
                    <Area type="monotone" dataKey="total" stroke={COLORS.whiteSoft} fill="rgba(255,255,255,0.06)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Active vs Events" subtitle="Events (bar) + active (line)" icon={<FaBolt />}>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={empTrend} margin={{ top: 12, right: 16, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="date"
                      tick={AXIS_TICK}
                      stroke={AXIS_STROKE}
                      interval={2}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis tick={AXIS_TICK_DIM} stroke={AXIS_STROKE} />
                    <Tooltip content={<PrettyTooltip />} />
                    <Legend wrapperStyle={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }} />
                    <Bar dataKey="events" fill={COLORS.purple} radius={[10, 10, 0, 0]} activeBar={false} />
                    <Line type="monotone" dataKey="active" stroke={COLORS.cyan} strokeWidth={3} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Subscription Seats Trend" subtitle="Seats used vs seats purchased" icon={<FaIdBadge />}>
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={subTrend} margin={{ top: 12, right: 16, left: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis
                      dataKey="date"
                      tick={AXIS_TICK}
                      stroke={AXIS_STROKE}
                      interval={2}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis tick={AXIS_TICK_DIM} stroke={AXIS_STROKE} />
                    <Tooltip content={<PrettyTooltip />} />
                    <Legend wrapperStyle={{ color: "rgba(255,255,255,0.9)", fontSize: 12 }} />
                    <Line type="monotone" dataKey="seatsUsed" stroke={COLORS.blue} strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="seatsPurchased" stroke={COLORS.whiteSoft} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Subscription Utilization Gauge" subtitle={`Current: ${latestUtil}%`} icon={<FaIdBadge />}>
              <div className="h-[360px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="55%"
                    innerRadius="55%"
                    outerRadius="85%"
                    barSize={18}
                    data={utilizationGauge}
                    startAngle={180}
                    endAngle={0}
                  >
                    <Tooltip content={<PrettyTooltip />} />
                    <RadialBar dataKey="value" cornerRadius={12} fill={COLORS.cyan} />
                    <text
                      x="50%"
                      y="54%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.95)"
                      fontSize="34"
                      fontWeight="800"
                    >
                      {latestUtil}%
                    </text>
                    <text
                      x="50%"
                      y="64%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(255,255,255,0.72)"
                      fontSize="12"
                    >
                      Utilization
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-white font-semibold">Backend sources in use</div>
                <div className="text-sm text-slate-300">
                  Company, subscription, employees, roles, departments, service access, and payroll.
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-emerald-100 text-xs font-semibold">
                <FaRegCheckCircle />
                Synced from backend
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
