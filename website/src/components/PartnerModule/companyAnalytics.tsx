import React, { useMemo } from "react";
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
} from "react-icons/fa";

type PiePoint = { name: string; value: number };
type EmpTrendPoint = { date: string; active: number; total: number; events: number };
type SubTrendPoint = { date: string; seatsUsed: number; seatsPurchased: number; utilizationPct: number };
type StackedPoint = { name: string; active: number; inactive: number };

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

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function makeSeries(fromISO: string, toISO: string, base: number, wobble: number) {
  const start = new Date(fromISO);
  const end = new Date(toISO);

  const totalDays = Math.max(
    14,
    Math.min(30, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  );

  const out: Array<{ date: string; count: number }> = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    const count = Math.max(
      0,
      Math.round(base + Math.sin(i / 2) * wobble + (Math.random() - 0.5) * wobble)
    );
    out.push({ date, count });
  }
  return out;
}

function makeEmpTrend(fromISO: string, toISO: string): EmpTrendPoint[] {
  const total = 120;
  const activeSeries = makeSeries(fromISO, toISO, 72, 18);
  const eventsSeries = makeSeries(fromISO, toISO, 210, 65);

  return activeSeries.map((p, i) => ({
    date: p.date,
    active: p.count,
    total,
    events: eventsSeries[i]?.count ?? 0,
  }));
}

function makeSubscriptionTrend(fromISO: string, toISO: string): SubTrendPoint[] {
  const seatsPurchased = 120;
  const seatsUsedSeries = makeSeries(fromISO, toISO, 88, 10);

  return seatsUsedSeries.map((p) => {
    const seatsUsed = Math.min(seatsPurchased + 8, Math.max(0, p.count));
    const utilizationPct = Math.round((seatsUsed / seatsPurchased) * 100);
    return { date: p.date, seatsUsed, seatsPurchased, utilizationPct };
  });
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

  const companyId = String(id || "N/A");
  const companyFromState = (location.state as any)?.company;
  const companyName = companyFromState?.CompanyName || `company `;

  const from = useMemo(() => daysAgoISO(14), []);
  const to = useMemo(() => todayISO(), []);

  const empTrend = useMemo(() => makeEmpTrend(from, to), [from, to]);
  const subTrend = useMemo(() => makeSubscriptionTrend(from, to), [from, to]);

  const deptShare: PiePoint[] = useMemo(
    () => [
      { name: "Sales", value: 30 },
      { name: "Support", value: 22 },
      { name: "Engineering", value: 35 },
      { name: "HR", value: 10 },
      { name: "Operations", value: 18 },
    ],
    []
  );

  const roleShare: PiePoint[] = useMemo(
    () => [
      { name: "Manager", value: 18 },
      { name: "Executive", value: 28 },
      { name: "Analyst", value: 16 },
      { name: "Developer", value: 32 },
      { name: "Intern", value: 12 },
    ],
    []
  );

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

  const latestUtil = subTrend[subTrend.length - 1]?.utilizationPct ?? 0;
  const utilizationGauge = useMemo(() => [{ name: "Utilization", value: latestUtil }], [latestUtil]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="text-3xl md:text-4xl font-extrabold">
            {companyName}{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Analytics Charts
            </span>
          </div>
          <div className="mt-2 text-slate-200/80 text-sm">
            Range: <span className="text-white/90 font-semibold">{from}</span> →{" "}
            <span className="text-white/90 font-semibold">{to}</span>
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
        </div>
      </div>
    </div>
  );
}
