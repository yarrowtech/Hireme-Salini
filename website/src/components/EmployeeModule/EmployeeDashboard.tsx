import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ================= TYPES ================= */
type EmployeeData = {
  employeeId: string;
  companyId: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  salary: number;
};

type PaymentRow = {
  month: string;
  year: number;
  basic: number;
  allowances: number;
  deductions: number;
};

type AttendanceRow = {
  month: string;
  year: number;
  present: number;
  absent: number;
  leaves: number;
};

type PerformanceRow = {
  month: string;
  year: number;
  productivity: number; // 0-100
  punctuality: number; // 0-100
  taskCompletion: number; // 0-100
  rating: number; // 1-5
};

/* ================= CONSTANTS ================= */
const LOGIN_KEY = "EmployeeLoginId";
const FIXED_YEAR = 2026;

const MONTH_INDEX: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ================= UTILS ================= */
const cn = (...x: Array<string | false | null | undefined>) => x.filter(Boolean).join(" ");
const formatINR = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const generateEmployeeName = (id = "") =>
  id ? id.replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Employee";

/* ================= 2026 CALENDAR (UTC SAFE) ================= */
function daysInMonth2026(month: string) {
  const m = MONTH_INDEX[month] ?? 0;
  return new Date(Date.UTC(FIXED_YEAR, m + 1, 0)).getUTCDate();
}
function countSundays2026(month: string) {
  const m = MONTH_INDEX[month] ?? 0;
  const totalDays = daysInMonth2026(month);
  let sundays = 0;
  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(Date.UTC(FIXED_YEAR, m, day));
    if (d.getUTCDay() === 0) sundays++;
  }
  return sundays;
}
function workingDays2026(month: string) {
  return daysInMonth2026(month) - countSundays2026(month);
}
function keyOf(month: string, year: number) {
  return `${month}-${year}`;
}

/* ================= MOCK DATA (replace with API) ================= */
const employeeMock: EmployeeData = {
  employeeId: "EMP-001",
  companyId: "COMP-001",
  name: "Rahul Sharma",
  role: "Developer",
  department: "IT",
  email: "rahul@example.com",
  phone: "+91 9876543210",
  salary: 18000,
};

const payments: PaymentRow[] = [
  { month: "Jan", year: 2026, basic: 18000, allowances: 2000, deductions: 500 },
  { month: "Feb", year: 2026, basic: 18000, allowances: 2200, deductions: 500 },
  { month: "Mar", year: 2026, basic: 18000, allowances: 2500, deductions: 500 },
];

const attendance: AttendanceRow[] = [
  { month: "Jan", year: 2026, present: 22, absent: 2, leaves: 1 },
  { month: "Feb", year: 2026, present: 20, absent: 3, leaves: 2 },
  { month: "Mar", year: 2026, present: 23, absent: 1, leaves: 1 },
];

// ✅ Performance demo (replace with API)
const performance: PerformanceRow[] = [
  { month: "Jan", year: 2026, productivity: 78, punctuality: 86, taskCompletion: 74, rating: 4.0 },
  { month: "Feb", year: 2026, productivity: 82, punctuality: 84, taskCompletion: 79, rating: 4.1 },
  { month: "Mar", year: 2026, productivity: 88, punctuality: 90, taskCompletion: 86, rating: 4.6 },
];

function monthYearOptionsFromData(p: PaymentRow[], a: AttendanceRow[], perf: PerformanceRow[]) {
  const map = new Map<string, { month: string; year: number }>();
  for (const x of p) map.set(keyOf(x.month, x.year), { month: x.month, year: x.year });
  for (const x of a) map.set(keyOf(x.month, x.year), { month: x.month, year: x.year });
  for (const x of perf) map.set(keyOf(x.month, x.year), { month: x.month, year: x.year });

  return Array.from(map.values()).sort((u, v) => {
    if (u.year !== v.year) return u.year - v.year;
    return MONTH_ORDER.indexOf(u.month) - MONTH_ORDER.indexOf(v.month);
  });
}

/* ================= COMPONENT ================= */
export default function EmployeeDashboard() {
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState(() => localStorage.getItem(LOGIN_KEY) || "");
  useEffect(() => {
    const sync = () => setLoginId(localStorage.getItem(LOGIN_KEY) || "");
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const employee = useMemo<EmployeeData>(() => {
    if (!loginId) return employeeMock;
    return { ...employeeMock, employeeId: loginId, name: generateEmployeeName(loginId) };
  }, [loginId]);

  const paymentNet = useMemo(() => payments.map((p) => ({ ...p, net: p.basic + p.allowances - p.deductions })), []);
  const monthOptions = useMemo(() => monthYearOptionsFromData(payments, attendance, performance), []);
  const latest = monthOptions[monthOptions.length - 1] || { month: "Mar", year: 2026 };

  const [selectedKey, setSelectedKey] = useState<string>(() => keyOf(latest.month, latest.year));

  const selectedMonthYear = useMemo(() => {
    const found = monthOptions.find((o) => keyOf(o.month, o.year) === selectedKey);
    return found || latest;
  }, [monthOptions, selectedKey, latest]);

  const selectedPayment = useMemo(
    () => paymentNet.find((p) => p.month === selectedMonthYear.month && p.year === selectedMonthYear.year),
    [paymentNet, selectedMonthYear.month, selectedMonthYear.year]
  );

  const selectedAttendance = useMemo(
    () => attendance.find((a) => a.month === selectedMonthYear.month && a.year === selectedMonthYear.year),
    [selectedMonthYear.month, selectedMonthYear.year]
  );

  const selectedPerf = useMemo(
    () => performance.find((p) => p.month === selectedMonthYear.month && p.year === selectedMonthYear.year),
    [selectedMonthYear.month, selectedMonthYear.year]
  );

  const monthDays = useMemo(() => daysInMonth2026(selectedMonthYear.month), [selectedMonthYear.month]);
  const monthSundays = useMemo(() => countSundays2026(selectedMonthYear.month), [selectedMonthYear.month]);
  const monthWorkingDays = useMemo(() => workingDays2026(selectedMonthYear.month), [selectedMonthYear.month]);

  const present = selectedAttendance?.present ?? 0;
  const absent = selectedAttendance?.absent ?? 0;
  const leaves = selectedAttendance?.leaves ?? 0;

  const attendancePct = useMemo(() => {
    if (!monthWorkingDays) return 0;
    return selectedAttendance ? Math.round((present / monthWorkingDays) * 100) : 0;
  }, [selectedAttendance, present, monthWorkingDays]);

  const perfScore = useMemo(() => {
    if (!selectedPerf) return 0;
    // simple weighted score (you can change)
    const v =
      selectedPerf.productivity * 0.45 +
      selectedPerf.taskCompletion * 0.35 +
      selectedPerf.punctuality * 0.2;
    return Math.round(v);
  }, [selectedPerf]);

  const perfTrend = useMemo(() => {
    // show last 3 months trend bars
    const last3 = [...performance]
      .sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month))
      .slice(-3);
    return last3.map((x) => ({
      key: `${x.month}`,
      score: Math.round(x.productivity * 0.45 + x.taskCompletion * 0.35 + x.punctuality * 0.2),
    }));
  }, []);

  return (
    <div className="space-y-6">
      {/* ================= HEADER ================= */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/10 grid place-items-center text-xl font-extrabold text-white">
              {(employee.name || "E").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold text-white truncate">Employee Dashboard</h2>
              <p className="text-sm text-slate-300 truncate">
                {employee.name} • {employee.role} • {employee.department}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {employee.employeeId} • {employee.companyId}
              </p>
            </div>
          </div>

          {/* ✅ removed Open Attendance / Open Profile buttons (as requested) */}
          
        </div>
      </div>

      {/* ================= STICKY ANALYTICS ================= */}
      <div className="sticky top-0 z-50">
        <div className="rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-xl p-4">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-[11px] text-slate-400 mb-1">Select Month</div>
                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="bg-transparent text-white text-sm font-semibold outline-none"
                >
                  {monthOptions.map((o) => {
                    const k = keyOf(o.month, o.year);
                    return (
                      <option key={k} value={k} className="bg-slate-900 text-white">
                        {o.month} {o.year}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="hidden sm:block">
                <div className="text-xs text-slate-400">Attendance %</div>
                <div className="text-xl font-extrabold text-white">{selectedAttendance ? `${attendancePct}%` : "—"}</div>
              </div>

              <div className="hidden sm:block">
                <div className="text-xs text-slate-400">Performance Score</div>
                <div className="text-xl font-extrabold text-white">{selectedPerf ? `${perfScore}/100` : "—"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full xl:w-auto">
              <MiniKpi label="Month Days" value={String(monthDays)} tone="cyan" />
              <MiniKpi label="Sundays" value={String(monthSundays)} tone="amber" />
              <MiniKpi label="Working" value={String(monthWorkingDays)} tone="emerald" />
              <MiniKpi label="Present" value={String(present)} tone="emerald" />
              <MiniKpi label="Absent" value={String(absent)} tone="rose" />
              <MiniKpi label="Leave" value={String(leaves)} tone="amber" />
            </div>
          </div>
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Attendance card */}
        <InfoCard title="Attendance Performance (Monthly)">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-slate-400">Attendance %</div>
              <div className="text-3xl font-extrabold text-white">{selectedAttendance ? `${attendancePct}%` : "—"}</div>
              <div className="mt-1 text-xs text-slate-500">
                Present {present} / Working Days {monthWorkingDays} (Sunday excluded)
              </div>
            </div>
            <div className="text-right text-xs text-slate-400">
              {selectedMonthYear.month} {FIXED_YEAR}
            </div>
          </div>

          <div className="mt-4">
            <Bar label="Present" value={present} max={monthWorkingDays || 1} color="bg-emerald-500" />
            <div className="mt-3" />
            <Bar label="Absent" value={absent} max={monthWorkingDays || 1} color="bg-rose-500" />
            <div className="mt-3" />
            <Bar label="Leave" value={leaves} max={monthWorkingDays || 1} color="bg-amber-500" />
          </div>
        </InfoCard>

        {/* Salary card */}
        <InfoCard title="Salary Summary (Monthly)">
          {selectedPayment ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-slate-400">Net Pay</div>
                <div className="text-2xl font-extrabold text-white">{formatINR((selectedPayment as any).net)}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {selectedPayment.month} {selectedPayment.year}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MiniKpi label="Basic" value={formatINR(selectedPayment.basic)} tone="cyan" />
                <MiniKpi label="Allowances" value={formatINR(selectedPayment.allowances)} tone="emerald" />
                <MiniKpi label="Deductions" value={formatINR(selectedPayment.deductions)} tone="rose" />
              </div>
            </>
          ) : (
            <EmptyState text="No salary data for selected month." />
          )}
        </InfoCard>

        {/* ✅ Employee Performance */}
        <InfoCard title="Employee Performance (Monthly)">
          {selectedPerf ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-400">Performance Score</div>
                    <div className="text-3xl font-extrabold text-white">{perfScore}/100</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Rating: <span className="text-white font-semibold">{selectedPerf.rating.toFixed(1)}/5</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    {selectedPerf.month} {selectedPerf.year}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <Bar label="Productivity" value={selectedPerf.productivity} max={100} color="bg-cyan-500" />
                <Bar label="Task Completion" value={selectedPerf.taskCompletion} max={100} color="bg-indigo-500" />
                <Bar label="Punctuality" value={selectedPerf.punctuality} max={100} color="bg-emerald-500" />
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-400 font-semibold">Last 3 Months Trend</div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {perfTrend.map((t) => (
                    <div key={t.key} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                      <div className="text-xs text-slate-400">{t.key}</div>
                      <div className="text-lg font-extrabold text-white mt-1">{t.score}</div>
                      <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-2 bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, t.score)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </>
          ) : (
            <EmptyState text="No performance data for selected month." />
          )}
        </InfoCard>
      </div>
    </div>
  );
}

/* ================= UI ================= */

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-sm font-bold text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-white">
          {value} • {pct}%
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={cn("h-2 rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center">
      <div className="text-sm font-semibold text-white">No Data</div>
      <div className="mt-1 text-xs text-slate-400">{text}</div>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  tone = "cyan",
}: {
  label: string;
  value: string;
  tone?: "cyan" | "emerald" | "rose" | "amber";
}) {
  const ring =
    tone === "emerald"
      ? "border-emerald-400/20"
      : tone === "rose"
      ? "border-rose-400/20"
      : tone === "amber"
      ? "border-amber-400/20"
      : "border-cyan-400/20";

  const glow =
    tone === "emerald"
      ? "bg-[radial-gradient(circle_at_30%_10%,rgba(34,197,94,0.18),transparent_55%)]"
      : tone === "rose"
      ? "bg-[radial-gradient(circle_at_30%_10%,rgba(244,63,94,0.18),transparent_55%)]"
      : tone === "amber"
      ? "bg-[radial-gradient(circle_at_30%_10%,rgba(245,158,11,0.18),transparent_55%)]"
      : "bg-[radial-gradient(circle_at_30%_10%,rgba(56,189,248,0.18),transparent_55%)]";

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border bg-white/5 px-4 py-3", ring)}>
      <div className={cn("absolute inset-0 opacity-80", glow)} />
      <div className="relative">
        <div className="text-xs text-slate-300">{label}</div>
        <div className="mt-1 text-lg font-extrabold text-white truncate">{value}</div>
      </div>
    </div>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/15 text-white text-sm font-semibold transition"
    >
      {children}
    </button>
  );
}
