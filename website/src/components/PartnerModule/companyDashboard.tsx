// src/pages/company/CompanyDashboard.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendar,
  FaUsers,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaChevronRight,
  FaCrown,
  FaShieldAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBed,
  FaFilePdf,
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

import { useLocation, useNavigate, useParams } from "react-router-dom";
import companyApi from "../../api/company.api.js";
import {
  getCompanyLabel,
  getResolvedPlanPrice,
  getResolvedSubscription,
  loadCompanyBundle,
  normalizePlanKey,
  syncCompanyStorage,
} from "./companyHelpers";

/** -----------------------------
 * Types
 ------------------------------*/
type Plan = "Starter" | "Professional" | "Enterprise";
type CompanyStatusUI = "active" | "pending" | "inactive";

type BackendCompany = {
  _id: string;
  CompanyName: string;
  Contact: string;
  Email: string;
  Address: string;
  CIN: string;
  PAN_No: string;

  planKey: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  billingCycle: "MONTHLY" | "YEARLY";
  planPrice?: number | null;

  companyCode: number;
  documents: Array<{
    key: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
  }>;

  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedAt?: string | null;
  rejectReason?: string | null;

  createdAt: string;
  updatedAt: string;
};

type Company = {
  id: string;
  name: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
  status: CompanyStatusUI;

  subscriptionPlan: Plan;
  planAmount: number;
  planFrom: string;
  planTo: string;

  companyCode?: number;
  cin?: string;
  pan?: string;

  billingCycle?: "MONTHLY" | "YEARLY";
  documents?: BackendCompany["documents"];
  subscriptionActive: boolean;
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

type SubscriptionMeta = {
  planKey: string;
  billing: string;
  status: string;
  startsAt: string;
  expiresAt: string;
};

/** -----------------------------
 * Utils
 ------------------------------*/
const cn = (...a: Array<string | false | undefined | null>) => a.filter(Boolean).join(" ");
const fmtINR = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

function safeDate(d: any) {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addMonthsSafe(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}
function addYearsSafe(date: Date, years: number) {
  const d = new Date(date);
  const month = d.getMonth();
  d.setFullYear(d.getFullYear() + years);
  if (d.getMonth() !== month) d.setDate(0);
  return d;
}
function formatDisplayDate(value?: string | null) {
  if (!value || value === "-") return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}
function backendPlanToUI(planKey: BackendCompany["planKey"]): Plan {
  if (planKey === "PROFESSIONAL") return "Professional";
  if (planKey === "ENTERPRISE") return "Enterprise";
  return "Starter";
}
function backendStatusToUI(status: BackendCompany["status"]): CompanyStatusUI {
  if (status === "APPROVED") return "active";
  if (status === "PENDING") return "pending";
  return "inactive";
}

function normalizeEmployeeRecord(emp: any, index: number): Employee {
  return {
    id: String(emp?._id || emp?.id || `${emp?.employeeId || "emp"}-${index}`),
    employeeId: String(emp?.employeeId || `EMP-${index + 1}`),
    name: String(emp?.name || emp?.employeeName || "Employee"),
    department: String(emp?.department || "General"),
    role: String(emp?.designation || emp?.role || "Employee"),
    salary: Number(emp?.salary || emp?.netPay || 0),
    email: String(emp?.email || emp?.contact || "-"),
    phone: String(emp?.phone || "-"),
    joinDate: emp?.createdAt ? new Date(emp.createdAt).toISOString().slice(0, 10) : "-",
    status: String(emp?.status || "active").toLowerCase() as Employee["status"],
  };
}

/**
 * backend doesn't store planFrom/planTo
 * start = reviewedAt (if APPROVED) else createdAt
 * end   = start + (MONTHLY => 1 month, YEARLY => 1 year)
 */
function computePlanDates(row: BackendCompany) {
  const startRaw =
    row?.status === "APPROVED" ? row?.reviewedAt || row?.createdAt : row?.createdAt;

  const startDt = safeDate(startRaw) || safeDate(row?.createdAt);
  const startISO = startDt ? toISODate(startDt) : "";

  const bc = row?.billingCycle === "YEARLY" ? "YEARLY" : "MONTHLY";
  const endDt = startDt
    ? bc === "YEARLY"
      ? addYearsSafe(startDt, 1)
      : addMonthsSafe(startDt, 1)
    : null;

  const endISO = endDt ? toISODate(endDt) : "";
  return { startISO, endISO };
}

function Pill({
  label,
  tone = "info",
}: {
  label: string;
  tone?: "success" | "warning" | "info" | "inactive" | "danger";
}) {
  const map = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    info: "bg-sky-50 border-sky-200 text-sky-700",
    inactive: "bg-slate-100 border-slate-200 text-slate-600",
    danger: "bg-rose-50 border-rose-200 text-rose-700",
  } as const;

  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", map[tone])}>
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
        "relative w-full text-left overflow-hidden rounded-2xl border border-blue-100 bg-white p-6 shadow-sm shadow-blue-900/5 transition",
        onClick && "hover:shadow-md hover:shadow-blue-900/10 hover:border-blue-300 hover:-translate-y-[1px] active:translate-y-0"
      )}
    >
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-blue-200/40 via-sky-100/40 to-blue-100/30 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">{title}</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-950">{value}</div>

            {(delta || deltaLabel) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                {delta && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1",
                      delta.dir === "up"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
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

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-500/20">
            {icon}
          </div>
        </div>

        {onClick && <div className="mt-4 text-xs text-blue-700 font-semibold">Click to open →</div>}
      </div>
    </button>
  );
}

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
    <div className="relative rounded-2xl border border-blue-100 bg-white p-6 shadow-sm shadow-blue-900/5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg font-bold text-slate-950">{title}</div>
        {right && <div className="shrink-0 pointer-events-none select-none">{right}</div>}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
      <span className="text-slate-500 inline-flex items-center gap-2">
        {icon} {label}
      </span>
      <span className="font-semibold text-slate-900 text-right">{value}</span>
    </div>
  );
}

/** -----------------------------
 * MAIN
 ------------------------------*/
export default function CompanyDashboardOneCompany() {
  type Page = "dashboard" | "employees";
  const location = useLocation();
  const navigate = useNavigate();
  const resolvePage = (): Page => "dashboard";
  const [page, setPage] = useState<Page>(resolvePage);

  useEffect(() => {
    setPage(resolvePage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ? FIX: accept multiple possible param names
  const params = useParams();
  const requestId =
    (params as any)?.requestId ||
    (params as any)?.id ||
    (params as any)?.requestID ||
    "";

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  const [company, setCompany] = useState<Company>({
    id: "",
    name: "Loading�",
    industry: "-",
    location: "-",
    email: "-",
    phone: "-",
    status: "pending",
    subscriptionPlan: "Starter",
    planAmount: 0,
    planFrom: "-",
    planTo: "-",
    subscriptionActive: false,
  });

  const [employeesData, setEmployeesData] = useState<Employee[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, EmployeeAttendance>>({});
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [liveSubscriptionActive, setLiveSubscriptionActive] = useState(false);
  const [subscriptionMeta, setSubscriptionMeta] = useState<SubscriptionMeta | null>(null);

  const refreshCompanyBundle = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      let row: BackendCompany | null = null;
      let bundleCompanyId = await companyApi.resolveCompanyId();

      if (bundleCompanyId) {
        const sessionBundle = await loadCompanyBundle(bundleCompanyId);
        const sessionDashboard = sessionBundle?.dashboard || null;
        if (sessionDashboard?.company) {
          row = sessionDashboard.company as BackendCompany;
        }
        if (!row?._id && sessionBundle?.companyId) {
          bundleCompanyId = sessionBundle.companyId;
        }
      }

      if (!row?._id) {
        if (requestId) {
          const res = await companyApi.getRequestById(requestId);
          row = (res?.request || null) as BackendCompany | null;
        } else {
          const rawUser =
            localStorage.getItem("user") ||
            localStorage.getItem("authUser") ||
            localStorage.getItem("currentUser") ||
            "";

          let email = "";
          try {
            const parsed = rawUser ? JSON.parse(rawUser) : null;
            email = parsed?.Email || parsed?.email || parsed?.user?.Email || parsed?.user?.email || "";
          } catch {
            email = "";
          }

          if (email) {
            const res = await companyApi.listMyRequests({ email });
            const list = (res?.requests || []) as BackendCompany[];
            row = list?.[0] || null;
          }
        }
      }

      if (!row?._id) {
        setLoadError(requestId ? "Company not found for this requestId." : "No company request found for the logged-in user.");
        return;
      }

      const bundle = await loadCompanyBundle(bundleCompanyId || row._id);
      const dashboardRes = bundle?.dashboard || null;
      const analyticsRes = bundle?.analytics || null;
      const payrollRes = bundle?.payroll || null;
      const employeesRes = bundle?.employees || null;
      const subscription = getResolvedSubscription({
        dashboard: dashboardRes,
        subscription: bundle?.subscription,
        serviceAccess: dashboardRes?.serviceAccess || analyticsRes?.analytics?.serviceAccess || null,
        company: dashboardRes?.company || row,
      });

      const resolvedPlanKey = normalizePlanKey(
        subscription?.planKey ||
          subscription?.plan ||
          subscription?.planPrice ||
          subscription?.amount ||
          dashboardRes?.company?.planKey ||
          dashboardRes?.company?.planPrice ||
          row.planKey ||
          row.planPrice
      );
      const resolvedBilling = String(subscription?.billing || dashboardRes?.company?.billingCycle || row.billingCycle || "MONTHLY").toUpperCase();
      const resolvedPlanAmount = Number(
        getResolvedPlanPrice(
          {
            dashboard: dashboardRes,
            subscription: bundle?.subscription,
            serviceAccess: dashboardRes?.serviceAccess || analyticsRes?.analytics?.serviceAccess || null,
            company: dashboardRes?.company || row,
          },
          resolvedPlanKey,
          resolvedBilling
        ) || subscription?.planPrice || dashboardRes?.company?.planPrice || row.planPrice
      );

      setSubscriptionMeta(
        subscription
          ? {
              planKey: resolvedPlanKey,
              billing: resolvedBilling,
              status: String(subscription.status || dashboardRes?.subscription?.status || "ACTIVE").toUpperCase(),
              startsAt:
                subscription.startsAt ||
                subscription.purchasedAt ||
                subscription.createdAt ||
                row.reviewedAt ||
                row.createdAt ||
                "",
              expiresAt: subscription.expiresAt || subscription.endsAt || "",
            }
          : null
      );

      const fallbackDates = computePlanDates(row);
      const startDt =
        safeDate(subscription?.startsAt) ||
        safeDate(subscription?.purchasedAt) ||
        safeDate(row?.reviewedAt) ||
        safeDate(row?.createdAt);
      const endDt = safeDate(subscription?.expiresAt) || safeDate(subscription?.endsAt);
      const startISO = startDt ? toISODate(startDt) : fallbackDates.startISO;
      const endISO = endDt ? toISODate(endDt) : fallbackDates.endISO;

      const employees = Array.isArray(employeesRes?.employees)
        ? employeesRes.employees
        : Array.isArray(dashboardRes?.serviceAccess?.employees)
        ? dashboardRes.serviceAccess.employees
        : Array.isArray(analyticsRes?.analytics?.serviceAccess?.employees)
        ? analyticsRes.analytics.serviceAccess.employees
        : [];
      const payrollRows = Array.isArray(payrollRes?.payroll?.rows) ? payrollRes.payroll.rows : [];
      const analyticRows = Array.isArray(analyticsRes?.analytics?.departments)
        ? analyticsRes.analytics.departments.map((item: any, index: number) => ({
            id: `${item.name}-${index}`,
            department: item.name,
            employees: Number(item.value || 0),
            payroll: payrollRows.reduce((sum: number, row: any) => sum + Number(row.netPay || 0), 0),
            attendance: 0,
          }))
        : [];

      const backendCompanyRow = dashboardRes?.company || row;
      const backendSubscriptionActive = Boolean(
        dashboardRes?.subscriptionActive ??
          (String(subscription?.status || "").toUpperCase() === "ACTIVE" &&
            (!subscription?.expiresAt || new Date(String(subscription.expiresAt)).getTime() >= Date.now()))
      );

      setCompany({
        id: row._id,
        name: getCompanyLabel(backendCompanyRow, "Company"),
        industry: "-",
        location: backendCompanyRow?.Address || row.Address || "-",
        email: backendCompanyRow?.Email || row.Email || "-",
        phone: backendCompanyRow?.Contact || row.Contact || "-",
        status: backendStatusToUI(row.status),
        subscriptionActive: backendSubscriptionActive,
        subscriptionPlan: backendPlanToUI(resolvedPlanKey as BackendCompany["planKey"]),
        planAmount: resolvedPlanAmount,
        planFrom: startISO || "-",
        planTo: endISO || "-",
        companyCode: backendCompanyRow?.companyCode || row.companyCode,
        cin: backendCompanyRow?.CIN || row.CIN,
        pan: backendCompanyRow?.PAN_No || row.PAN_No,
        billingCycle: backendCompanyRow?.billingCycle || row.billingCycle,
        documents: backendCompanyRow?.documents || row.documents || [],
      });
      setLiveSubscriptionActive(backendSubscriptionActive);
      syncCompanyStorage(
        {
          company: backendCompanyRow,
          subscription: bundle?.subscription || dashboardRes?.subscription || null,
          serviceAccess: dashboardRes?.serviceAccess || analyticsRes?.analytics?.serviceAccess || null,
        },
        row._id
      );
      setAnalytics(analyticRows);

      setEmployeesData(employees.map(normalizeEmployeeRecord));
      setAttendanceMap({});
    } catch (e: any) {
      console.error("? Company dashboard load error:", e);

      const msg =
        e?.response?.data?.message ||
        (typeof e?.response?.data === "string" ? e.response.data : "") ||
        e?.message ||
        "Failed to load company data";

      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  /** ? Fetch ONLY company from backend */
  useEffect(() => {
    refreshCompanyBundle();
  }, [refreshCompanyBundle]);

  /** ? Docs URL helper */
  const docUrl = useCallback(
    (docKey: string) => {
      if (!company?.id) return "#";
      return companyApi.getDocUrl(company.id, docKey);
    },
    [company?.id]
  );

  /** Attendance helpers (mock) */
  const attendanceOf = useCallback(
    (employeeId: string) =>
      attendanceMap[employeeId] || { employeeId, present: 0, absent: 0, leave: 0, totalDays: 0 },
    [attendanceMap]
  );

  const attendancePct = (a: EmployeeAttendance) => (!a.totalDays ? 0 : Math.round((a.present / a.totalDays) * 100));

  const effectiveSubscriptionActive = Boolean(
    company.subscriptionActive ||
      liveSubscriptionActive ||
      (String(subscriptionMeta?.status || "").toUpperCase() === "ACTIVE" &&
        (!subscriptionMeta?.expiresAt || new Date(String(subscriptionMeta.expiresAt)).getTime() >= Date.now()))
  );

  const openDashboard = useCallback(() => {
    navigate("/company/dashboard");
    setPage("dashboard");
  }, [navigate]);

  /** Totals + charts (mock analytics) */
  const totals = useMemo(() => {
    const employees = analytics.reduce((s, r) => s + r.employees, 0);
    const payroll = analytics.reduce((s, r) => s + r.payroll, 0);
    const avgAttendance = analytics.length ? Math.round(analytics.reduce((s, r) => s + r.attendance, 0) / analytics.length) : 0;
    return { employees, payroll, avgAttendance };
  }, [analytics]);

  const attendanceSummary = useMemo(() => {
    const list = employeesData.map((e) => attendanceOf(e.employeeId));
    const totalDays = list.reduce((s, a) => s + (a.totalDays || 0), 0);
    const present = list.reduce((s, a) => s + (a.present || 0), 0);
    const absent = list.reduce((s, a) => s + (a.absent || 0), 0);
    const leave = list.reduce((s, a) => s + (a.leave || 0), 0);
    const pct = totalDays ? Math.round((present / totalDays) * 100) : 0;
    return { totalDays, present, absent, leave, pct };
  }, [employeesData, attendanceOf]);

  const departmentAttendanceChart = useMemo(
    () => analytics.map((r) => ({ department: r.department, attendance: r.attendance })),
    [analytics]
  );

  const employeeAttendanceChart = useMemo(() => {
    return employeesData.map((e) => {
      const a = attendanceOf(e.employeeId);
      return { name: e.name.split(" ")[0] || e.name, attendance: attendancePct(a) };
    });
  }, [employeesData, attendanceOf]);

  /** -----------------------------
   * DASHBOARD PAGE
   ------------------------------*/
  const DashboardPage = () => (
    <div className="space-y-6">
      {(loading || loadError) && (
        <div
          className={cn(
            "rounded-2xl border p-4",
            loadError ? "border-rose-200 bg-rose-50 text-rose-700" : "border-blue-100 bg-white text-slate-600 shadow-sm shadow-blue-900/5"
          )}
        >
          {loading ? "Loading company data from backend…" : loadError}
          {!loading && loadError && (
            <div className="mt-2 text-xs text-slate-500">
              Debug tips: Open DevTools → Console and Network, check what URL is being called and the status code.
            </div>
          )}
        </div>
      )}

      {/* TOP COMPANY */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-sky-50/60 to-blue-50/60 p-8 shadow-sm shadow-blue-900/5">
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-200/25 blur-3xl" />
        <div className="absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-sky-200/25 blur-3xl" />

        <div className="relative">
          <div className="flex flex-col gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-500/20">
                  <FaBuilding className="text-2xl" />
                </div>

                <div>
                  <div className="text-3xl font-extrabold text-slate-950">{company.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <span>{company.industry}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-2">
                      <FaMapMarkerAlt /> {company.location}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate("/company/service")}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-400 hover:to-blue-600 transition"
              >
                <FaShieldAlt />
                Manage Employees
                <FaChevronRight />
              </button>
            </div>

            {/* DETAILS */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-900/5 xl:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-slate-950 font-bold">Company Details</div>
                    <div className="text-xs text-slate-500 mt-1">Loaded directly from the backend company bundle.</div>
                  </div>
                  <Pill label={company.status.toUpperCase()} tone={company.status === "active" ? "success" : company.status === "pending" ? "warning" : "inactive"} />
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <InfoRow icon={<FaEnvelope />} label="Email" value={company.email} />
                  <InfoRow icon={<FaPhone />} label="Phone" value={company.phone} />
                  <InfoRow icon={<FaMapMarkerAlt />} label="Location" value={company.location} />
                  <InfoRow icon={<FaBuilding />} label="Company Code" value={company.companyCode ? String(company.companyCode) : "-"} />
                  <InfoRow icon={<FaCrown />} label="CIN" value={company.cin || "-"} />
                  <InfoRow icon={<FaShieldAlt />} label="PAN" value={company.pan || "-"} />
                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="text-sm font-semibold text-slate-950 mb-3">Documents</div>
                  {company.documents?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {company.documents.map((d) => (
                        <a
                          key={d.key}
                          href={docUrl(d.key)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-blue-100 transition"
                        >
                          <FaFilePdf />
                          {d.key}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">No documents available</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-900/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-slate-950 font-bold">Subscription Status</div>
                    <div className="text-xs text-slate-500 mt-1">Live subscription details from the backend.</div>
                  </div>
                  <Pill label={effectiveSubscriptionActive ? "ACTIVE" : "INACTIVE"} tone={effectiveSubscriptionActive ? "success" : "danger"} />
                </div>

                <div className="mt-4 space-y-3">
                  <InfoRow icon={<FaCrown />} label="Plan" value={company.subscriptionPlan} />
                  <InfoRow icon={<FaFilePdf />} label="Plan Price" value={`₹${fmtINR(company.planAmount)}`} />
                  <InfoRow icon={<FaCalendar />} label="Billing Cycle" value={subscriptionMeta?.billing || company.billingCycle || "MONTHLY"} />
                  <InfoRow icon={<FaShieldAlt />} label="Subscription Status" value={subscriptionMeta?.status || (effectiveSubscriptionActive ? "ACTIVE" : "EXPIRED")} />
                  <InfoRow icon={<FaCalendar />} label="Start Date" value={formatDisplayDate(subscriptionMeta?.startsAt || company.planFrom)} />
                  <InfoRow icon={<FaCalendar />} label="End Date" value={formatDisplayDate(subscriptionMeta?.expiresAt || company.planTo)} />
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate("/company/service")}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100 transition"
                  >
                    Manage Employees
                    <FaChevronRight />
                  </button>

                  <button
                    onClick={() => navigate("/company/subscription")}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-400 hover:to-blue-600 transition"
                  >
                    View Subscription
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
        <StatCard title="Total Employees" value={employeesData.length.toString()} icon={<FaUsers className="text-xl" />} onClick={() => setPage("employees")} />
        <StatCard
          title="Employee Attendance"
          value={`${attendanceSummary.pct}%`}
          icon={<FaChartLine className="text-xl" />}
          deltaLabel={`${attendanceSummary.present} Present � ${attendanceSummary.absent} Absent � ${attendanceSummary.leave} Leave`}
        />
        <StatCard
          title="Company Payroll (Departments)"
          value={`?${fmtINR(totals.payroll)}`}
          icon={<FaCheckCircle className="text-xl" />}
          delta={{ dir: "up", value: "Auto" }}
          deltaLabel="Calculated from analytics"
        />
        <StatCard title="Manage Employees" value={employeesData.length.toString()} icon={<FaUsers className="text-xl" />} onClick={() => navigate("/company/service")} />
      </div>

      {/* GRAPHS */}
      <Panel title="Analytics Graphs + Summary">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5">
            <div className="text-slate-950 font-bold mb-4">Department Attendance %</div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentAttendanceChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.1)" />
                  <XAxis dataKey="department" tick={{ fill: "#475569", fontSize: 12 }} stroke="rgba(15,23,42,0.15)" />
                  <YAxis tick={{ fill: "#475569", fontSize: 12 }} stroke="rgba(15,23,42,0.15)" />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#bfdbfe", fontSize: 12 }} />
                  <Bar dataKey="attendance" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5">
            <div className="text-slate-950 font-bold mb-4">Employee Attendance %</div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={employeeAttendanceChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.1)" />
                  <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 12 }} stroke="rgba(15,23,42,0.15)" />
                  <YAxis tick={{ fill: "#475569", fontSize: 12 }} stroke="rgba(15,23,42,0.15)" />
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: "#bfdbfe", fontSize: 12 }} />
                  <Legend />
                  <Line type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );

  /** EMPLOYEE PAGE */
  const EmployeePage = () => (
    <div className="space-y-6">
      <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm shadow-blue-900/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-extrabold text-slate-950">Employee List</div>
            <div className="text-sm text-slate-600">All employees under {company.name} (with attendance)</div>
          </div>

          <button
            onClick={openDashboard}
            className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800 hover:bg-blue-100 transition"
          >
            Back Dashboard
          </button>
        </div>
      </div>

      <Panel title="Employees Full Details + Attendance">
        <div className="rounded-xl border border-blue-100 overflow-hidden">
          <div data-scrollbox="true" className="max-h-[650px] overflow-auto">
            <table className="min-w-full w-full text-sm">
              <thead className="sticky top-0 z-10 bg-blue-50 text-slate-600">
                <tr className="border-b border-blue-100">
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

              <tbody className="text-slate-900">
                {employeesData.map((emp) => {
                  const a = attendanceOf(emp.employeeId);
                  const pct = attendancePct(a);

                  return (
                    <tr key={emp.id} className="border-t border-blue-100 hover:bg-blue-50/60">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                            <FaUsers />
                          </div>
                          <div>
                            <div className="font-semibold">{emp.name}</div>
                            <div className="text-xs text-slate-500">{emp.employeeId}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">{emp.department}</td>
                      <td className="px-4 py-4 font-semibold">{emp.role}</td>
                      <td className="px-4 py-4">₹{fmtINR(emp.salary)}</td>
                      <td className="px-4 py-4 text-slate-600">{emp.email}</td>
                      <td className="px-4 py-4 text-slate-600">{emp.phone}</td>
                      <td className="px-4 py-4 text-slate-500">{emp.joinDate}</td>

                      <td className="px-4 py-4">
                        <Pill
                          label={emp.status.toUpperCase().replace("-", " ")}
                          tone={emp.status === "active" ? "success" : emp.status === "on-leave" ? "warning" : "inactive"}
                        />
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                          <FaCheckCircle className="text-emerald-600" />
                          {a.present}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          <FaExclamationTriangle className="text-amber-600" />
                          {a.absent}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                          <FaBed className="text-sky-600" />
                          {a.leave}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <Pill label={`${pct}%`} tone={pct >= 90 ? "success" : pct >= 80 ? "warning" : "danger"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!employeesData.length && <div className="py-10 text-center text-slate-500">No employees found.</div>}
          </div>
        </div>
      </Panel>
    </div>
  );

    /* Legacy account-management UI retained temporarily to avoid a large unrelated dashboard rewrite.
  const HRPage = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-extrabold text-white">HR Management</div>
            <div className="mt-1 text-sm text-slate-300">Add and manage HR accounts for {company.name}.</div>
          </div>
          <button
            onClick={openDashboard}
            className="self-start rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 md:self-auto"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <div className="text-sm text-slate-300">HR Accounts Used</div>
            <div className="mt-2 text-2xl font-extrabold text-white">
              {hrUsers.length} / {finalHrLimit}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <div className="text-sm text-slate-300">Subscription</div>
            <div className={cn("mt-2 text-2xl font-extrabold", effectiveSubscriptionActive ? "text-emerald-300" : "text-rose-300")}>
              {effectiveSubscriptionActive ? "Active" : "Inactive"}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <div className="text-sm text-slate-300">Seats</div>
            <div className={cn("mt-2 text-2xl font-extrabold", limitReached ? "text-amber-300" : "text-cyan-300")}>
              {limitReached ? "Full" : "Available"}
            </div>
          </div>
        </div>

        <Panel
          title="Add HR Account"
          right={limitReached ? <Pill label="Limit Reached" tone="warning" /> : <Pill label="Ready" tone="success" />}
        >
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Name</label>
                <input
                  ref={hrNameRef}
                  value={hrName}
                  onChange={(e) => setHrName(e.target.value)}
                  onKeyDown={(e) => handleHRKeyDown(e, "name")}
                  placeholder="HR name"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</label>
                <input
                  ref={hrEmailRef}
                  value={hrEmail}
                  onChange={(e) => setHrEmail(e.target.value)}
                  onKeyDown={(e) => handleHRKeyDown(e, "email")}
                  placeholder="HR email"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Phone</label>
                <input
                  ref={hrPhoneRef}
                  value={hrPhone}
                  onChange={(e) => setHrPhone(e.target.value)}
                  onKeyDown={(e) => handleHRKeyDown(e, "phone")}
                  placeholder="HR phone"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              This just creates the HR record. Open the account's details afterwards to set up their login and assign employees.
            </p>

            {hrError && (
              <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {hrError}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={addHR}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-95"
              >
                <FaPlus /> Add HR
              </button>
            </div>
        </Panel>

        <Panel title="HR Accounts" right={<Pill label={`${hrUsers.length} of ${finalHrLimit} used`} tone={limitReached ? "warning" : "success"} />}>
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <div data-scrollbox="true" className="max-h-[560px] overflow-auto">
              <table className="min-w-full w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur text-slate-200">
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-4 text-left font-semibold">Name</th>
                    <th className="px-4 py-4 text-left font-semibold">Contact</th>
                    <th className="px-4 py-4 text-left font-semibold">Username</th>
                    <th className="px-4 py-4 text-left font-semibold">Added</th>
                    <th className="px-4 py-4 text-left font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {hrUsers.map((h) => (
                    <tr
                      key={h.id}
                      className="cursor-pointer border-t border-white/10 transition hover:bg-white/5"
                      onClick={() => setDetailHrId(h.id)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/25 to-blue-500/20 text-cyan-100 ring-1 ring-white/10">
                            {h.name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase())
                              .join("") || <FaUserTie />}
                          </div>
                          <div className="font-semibold text-white">{h.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-slate-200">{h.email}</div>
                        <div className="mt-1 text-xs text-slate-400">{h.phone}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-slate-200">{h.username}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {h.hasLogin ? "Password set" : "Login not configured"}
                          {(h.loginUpdatedAt || h.passwordUpdatedAt)
                            ? ` � Updated ${new Date(String(h.loginUpdatedAt || h.passwordUpdatedAt)).toLocaleDateString()}`
                            : ""}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-400">{h.createdAt}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailHrId(h.id);
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!hrUsers.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-14 text-center">
                        <div className="mx-auto max-w-md rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 py-8">
                          <div className="text-lg font-semibold text-white">No HR accounts yet</div>
                          <div className="mt-2 text-sm leading-6 text-slate-400">
                            Add your first HR account using the form above.
                          </div>
                        </div>
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
  };

  */

  return (
    page === "dashboard" ? DashboardPage() : EmployeePage()
  );
}

