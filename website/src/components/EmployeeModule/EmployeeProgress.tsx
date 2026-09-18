import { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt, FaChartLine, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import employeeApi from "../../api/employee.api";
import { cn, currentMonthKey, fallbackDashboard, formatDisplayTime } from "./employeeUi";

export default function EmployeeProgress() {
  const [data, setData] = useState<any>(fallbackDashboard());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await employeeApi.getDashboard({ month: currentMonthKey() });
        if (alive && res?.success && res.data) setData({ ...fallbackDashboard(), ...res.data });
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, []);

  const summary = data.monthlySummary;
  const recent = data.recentAttendance || [];
  const remaining = Math.max(0, (summary.workingDays || 0) - (summary.presentDays || 0) - (summary.absentDays || 0) - (summary.paidLeave || 0));

  const message = useMemo(() => {
    const pct = Number(summary.attendancePct || 0);
    if (pct >= 95) return "Excellent attendance. Keep the same rhythm.";
    if (pct >= 80) return "Good progress. A few more present days will improve the score.";
    if (pct > 0) return "Attendance needs attention this month.";
    return "No progress data recorded for this month yet.";
  }, [summary.attendancePct]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-8 shadow-xl shadow-blue-900/20">
        <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur text-2xl text-white ring-2 ring-white/25">
            <FaChartLine />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Progress</h1>
            <p className="text-sm text-blue-100/90 mt-1">Monthly attendance performance and recent work record.</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-blue-200/70 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-sm font-bold uppercase text-slate-500">Attendance Score</p>
            <p className="mt-2 text-5xl font-black text-gradient-blue">{summary.attendancePct || 0}%</p>
            <p className="mt-2 text-sm font-semibold text-slate-600">{message}</p>
          </div>
          <div className="w-full lg:max-w-md">
            <div className="h-4 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-600 transition-all duration-700" style={{ width: `${Math.min(100, summary.attendancePct || 0)}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Small label="Working Days" value={summary.workingDays || 0} />
              <Small label="Remaining" value={remaining} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Tile icon={<FaCheckCircle />} label="Present" value={summary.presentDays || 0} tone="emerald" />
        <Tile icon={<FaTimesCircle />} label="Absent" value={summary.absentDays || 0} tone="rose" />
        <Tile icon={<FaCalendarAlt />} label="Paid Leave" value={summary.paidLeave || 0} tone="amber" />
        <Tile icon={<FaChartLine />} label="Recorded Days" value={(summary.presentDays || 0) + (summary.absentDays || 0) + (summary.paidLeave || 0)} />
      </section>

      <section className="rounded-3xl border border-blue-200/70 bg-white p-5 sm:p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-extrabold text-slate-950">Recent Attendance Trend</h2>
        <div className="space-y-3">
          {recent.slice(0, 10).map((row: any) => (
            <div key={row.date} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center hover:bg-blue-50/50 transition">
              <div className="font-extrabold text-slate-950">{row.date}</div>
              <div className="text-slate-600">In: <strong>{formatDisplayTime(row.checkIn) || "-"}</strong></div>
              <div className="text-slate-600">Out: <strong>{formatDisplayTime(row.checkOut) || "-"}</strong></div>
              <Badge status={row.status} />
            </div>
          ))}
          {recent.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              {loading ? "Loading progress..." : "No attendance trend available yet."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Tile({ icon, label, value, tone = "blue" }: { icon: React.ReactNode; label: string; value: number; tone?: "blue" | "emerald" | "rose" | "amber" }) {
  const style = {
    blue: { border: "border-blue-200", bg: "bg-white text-blue-800", accent: "from-blue-400 to-blue-600" },
    emerald: { border: "border-emerald-200", bg: "bg-emerald-50 text-emerald-800", accent: "from-emerald-400 to-emerald-600" },
    rose: { border: "border-rose-200", bg: "bg-rose-50 text-rose-800", accent: "from-rose-400 to-rose-600" },
    amber: { border: "border-amber-200", bg: "bg-amber-50 text-amber-800", accent: "from-amber-400 to-amber-600" },
  };
  const s = style[tone];
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow", s.border, s.bg)}>
      <span className={cn("absolute top-0 left-0 h-1 w-full bg-gradient-to-r", s.accent)} />
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">{icon}{label}</div>
      <div className="mt-2 text-3xl font-black">{value}</div>
    </div>
  );
}

function Small({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const s = String(status || "NOT_MARKED").toUpperCase();
  const tone = s.includes("PRESENT")
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : s.includes("LEAVE")
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : s.includes("ABSENT")
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-slate-50 text-slate-600 border-slate-200";
  return <span className={cn("inline-flex w-fit rounded-full border px-3 py-1 text-xs font-extrabold", tone)}>{s.replace(/_/g, " ")}</span>;
}
