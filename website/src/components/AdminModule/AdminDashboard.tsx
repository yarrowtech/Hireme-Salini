import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  FaUsers,
  FaCrown,
  FaClock,
  FaMoneyBillWave,
  FaChartLine,
  FaSpinner,
} from "react-icons/fa";
import { toast } from "react-toastify";

import {
  getPendingCompanyRequests,
  getApprovedCompanyRequests,
  getRejectedCompanyRequests,
  
} from "../../api/admin.api.js";

const COLORS = ["#22d3ee", "#3b82f6", "#6366f1", "#10b981"];
const cn = (...x: Array<string | false | null | undefined>) => x.filter(Boolean).join(" ");

const tooltipStyle: React.CSSProperties = {
  background: "rgba(2,6,23,0.88)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  color: "#fff",
};

const MONTHS = [
  { key: 0, name: "Jan" },
  { key: 1, name: "Feb" },
  { key: 2, name: "Mar" },
  { key: 3, name: "Apr" },
  { key: 4, name: "May" },
  { key: 5, name: "Jun" },
  { key: 6, name: "Jul" },
  { key: 7, name: "Aug" },
  { key: 8, name: "Sep" },
  { key: 9, name: "Oct" },
  { key: 10, name: "Nov" },
  { key: 11, name: "Dec" },
];

function safeDate(d: any) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// your endpoints return: { success:true, data:[...] }
function pickRows(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function getPlanName(row: any) {
  return (
    row?.subscription?.planName ||
    row?.subscription?.plan ||
    row?.planKey || // ✅ your real field
    row?.selectedPlan ||
    row?.planName ||
    row?.plan ||
    ""
  );
}

function getPlanAmount(row: any) {
  const raw =
    row?.subscription?.amount ??
    row?.planPrice ?? // ✅ your real field
    row?.amount ??
    row?.planAmount ??
    row?.pricing?.amount ??
    0;

  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

function hasSubscription(row: any) {
  return Boolean(getPlanName(row));
}

/**
 * Pick the year that appears most in createdAt (so charts don't become all-zero)
 */
function resolveDatasetYear(allRows: any[]) {
  const yearCount: Record<number, number> = {};
  for (const r of allRows) {
    const dt = safeDate(r?.createdAt);
    if (!dt) continue;
    const y = dt.getFullYear();
    yearCount[y] = (yearCount[y] || 0) + 1;
  }
  const entries = Object.entries(yearCount).sort((a, b) => Number(b[1]) - Number(a[1]));
  if (entries.length) return Number(entries[0][0]);
  return new Date().getFullYear();
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const [approvedRows, setApprovedRows] = useState<any[]>([]);
  const [rejectedRows, setRejectedRows] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
          getPendingCompanyRequests(),
          getApprovedCompanyRequests(),
          getRejectedCompanyRequests(),
        ]);

        if (!alive) return;

        setPendingRows(pickRows(pendingRes));
        setApprovedRows(pickRows(approvedRes));
        setRejectedRows(pickRows(rejectedRes));
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Failed to load dashboard data");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const all = useMemo(
    () => [...pendingRows, ...approvedRows, ...rejectedRows],
    [pendingRows, approvedRows, rejectedRows]
  );

  const datasetYear = useMemo(() => resolveDatasetYear(all), [all]);

  const kpi = useMemo(() => {
    const totalPartners = all.length;
    const activePartners = approvedRows.length;
    const pendingRequests = pendingRows.length;

    const approvedWithPlan = approvedRows.filter(hasSubscription);
    const totalSubs = approvedWithPlan.length;
    const totalPayments = approvedWithPlan.reduce((sum, r) => sum + getPlanAmount(r), 0);

    return { totalPartners, activePartners, pendingRequests, totalSubs, totalPayments };
  }, [all, approvedRows, pendingRows]);

  const charts = useMemo(() => {
    // ✅ Monthly arrays (Jan–Dec), start with zeros
    const partnerGrowth = MONTHS.map((m) => ({ name: m.name, partners: 0 }));
    const partnerSubscriptions = MONTHS.map((m) => ({ name: m.name, subs: 0 }));
    const partnerPayments = MONTHS.map((m) => ({ name: m.name, amount: 0 }));

    // ✅ REGISTRATIONS: from ALL rows (createdAt)
    for (const r of all) {
      const dt = safeDate(r?.createdAt);
      if (!dt) continue;
      if (dt.getFullYear() !== datasetYear) continue;
      partnerGrowth[dt.getMonth()].partners += 1;
    }

    // ✅ SUBS + PAYMENTS: only APPROVED with plan
    for (const r of approvedRows) {
      const dt = safeDate(r?.createdAt);
      if (!dt) continue;
      if (dt.getFullYear() !== datasetYear) continue;
      if (!hasSubscription(r)) continue;

      partnerSubscriptions[dt.getMonth()].subs += 1;
      partnerPayments[dt.getMonth()].amount += getPlanAmount(r);
    }

    // ✅ plan split
    const planCounts: Record<string, number> = {};
    for (const r of approvedRows) {
      const plan = getPlanName(r);
      if (!plan) continue;
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    }

    const planSplit = Object.entries(planCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    return { partnerGrowth, partnerSubscriptions, partnerPayments, planSplit };
  }, [all, approvedRows, datasetYear]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2 text-white">
            <FaChartLine className="text-cyan-300" />
            <h2 className="text-xl font-extrabold">Admin Dashboard</h2>

            <span className="ml-2 text-xs text-slate-400">({datasetYear})</span>

            {loading && (
              <span className="ml-2 inline-flex items-center gap-2 text-xs text-slate-400">
                <FaSpinner className="animate-spin" /> Loading…
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Stat icon={<FaUsers />} label="Partners" value={kpi.totalPartners} />
            <Stat icon={<FaUsers />} label="Active" value={kpi.activePartners} />
            <Stat icon={<FaClock />} label="Pending Requests" value={kpi.pendingRequests} />
            <Stat icon={<FaCrown />} label="Subscriptions" value={kpi.totalSubs} />
            <Stat
              icon={<FaMoneyBillWave />}
              label="Total Payments"
              value={`₹ ${kpi.totalPayments.toLocaleString()}`}
              wide
            />
          </div>
        </div>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card title="Partner Growth (Monthly Jan–Dec)">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.partnerGrowth}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="partners" name="Partners" fill="#22d3ee" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Subscriptions Trend (Monthly Jan–Dec)">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.partnerSubscriptions}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="subs"
                  name="Subscriptions"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Plan Split (Approved)">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.planSplit.length ? charts.planSplit : [{ name: "No Data", value: 1 }]}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label
                >
                  {(charts.planSplit.length ? charts.planSplit : [{ name: "No Data", value: 1 }]).map(
                    (_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    )
                  )}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card
          title="Partner Payments (₹) Monthly Jan–Dec"
          rightBadge={
            <span className="text-[11px] font-extrabold px-3 py-1.5 rounded-full border border-cyan-400/30 bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-indigo-500/20 text-white">
              Revenue View
            </span>
          }
        >
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.partnerPayments}>
                <defs>
                  <linearGradient id="payFill" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.18} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(v) => `₹${Math.round(Number(v) / 1000)}k`} />
                <Tooltip
                  formatter={(v: any) => `₹ ${Number(v).toLocaleString()}`}
                  contentStyle={tooltipStyle}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Payments"
                  stroke="#22d3ee"
                  strokeWidth={2.5}
                  fill="url(#payFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Quick Insights">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MiniKpi
              title="Active Partners"
              value={`${kpi.activePartners}`}
              tag="Live"
              tagClass="border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
            />
            <MiniKpi
              title="Pending Requests"
              value={`${kpi.pendingRequests}`}
              tag="Action"
              tagClass="border-amber-400/20 bg-amber-500/10 text-amber-200"
            />
            <MiniKpi
              title="Subscriptions"
              value={`${kpi.totalSubs}`}
              tag="Plans"
              tagClass="border-indigo-400/20 bg-indigo-500/10 text-indigo-200"
            />
            <MiniKpi
              title="Payments Total"
              value={`₹ ${kpi.totalPayments.toLocaleString()}`}
              tag="Revenue"
              tagClass="border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
            />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4" />
        </Card>
      </div>
    </div>
  );
}

/* -------------------- UI PARTS -------------------- */

function Stat({
  icon,
  label,
  value,
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-black/30 px-4 py-3 min-w-[120px]",
        wide && "min-w-[170px]"
      )}
    >
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <span className="text-cyan-300">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="text-lg font-extrabold text-white leading-tight mt-1">{value}</div>
    </div>
  );
}

function Card({
  title,
  children,
  rightBadge,
}: {
  title: string;
  children: React.ReactNode;
  rightBadge?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-3xl border border-white/10 bg-white/5 p-6"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-white font-extrabold">{title}</div>
        {rightBadge}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">{children}</div>
    </motion.div>
  );
}

function MiniKpi({
  title,
  value,
  tag,
  tagClass,
}: {
  title: string;
  value: string;
  tag: string;
  tagClass: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="text-lg font-extrabold text-white mt-1">{value}</div>
      <div
        className={cn(
          "mt-2 inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-extrabold border",
          tagClass
        )}
      >
        {tag}
      </div>
    </div>
  );
}
