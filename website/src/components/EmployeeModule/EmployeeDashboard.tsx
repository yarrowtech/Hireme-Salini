import { useEffect, useMemo, useState } from "react";
import {
  FaBuilding,
  FaCalendarCheck,
  FaCheck,
  FaHourglassHalf,
  FaIdBadge,
  FaMapMarkerAlt,
  FaPlay,
  FaStop,
  FaSyncAlt,
} from "react-icons/fa";
import { toast } from "react-toastify";
import employeeApi from "../../api/employee.api";
import { cn, currentMonthKey, fallbackDashboard, formatDisplayTime, formatINR, formatIST24Time, formatISTTime, getISTMinutes } from "./employeeUi";

type DashboardData = any;

const parseHHMM = (value?: string) => {
  if (!value) return null;
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const greeting = (d: Date) => {
  const h = Math.floor(getISTMinutes(d) / 60);
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function EmployeeDashboard() {
  const [data, setData] = useState<DashboardData>(fallbackDashboard());
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [now, setNow] = useState(new Date());

  const load = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getDashboard({ month: currentMonthKey() });
      if (res?.success && res.data) setData({ ...fallbackDashboard(), ...res.data });
    } catch (err: any) {
      toast.info(err?.response?.data?.message || "Showing saved employee details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const employee = data.employee;
  const company = data.company;
  const today = data.todayAttendance;
  const monthly = data.monthlySummary;
  const salary = data.salary;

  const checkedIn = Boolean(today?.checkIn);
  const checkedOut = Boolean(today?.checkOut);

  const punch = async (type: "in" | "out") => {
    const time = formatIST24Time(now);
    try {
      setPunching(true);
      if (type === "in") {
        await employeeApi.checkIn({ time });
        toast.success("Attendance check-in recorded.");
      } else {
        await employeeApi.checkOut({ time });
        toast.success("Attendance check-out recorded.");
      }
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Unable to update attendance.");
    } finally {
      setPunching(false);
    }
  };

  const pay = useMemo(
    () => salary.latestPayroll?.netSalary || salary.structure?.netSalary || salary.structure?.grossSalary || 0,
    [salary]
  );

  return (
    <div className="space-y-6">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-8 shadow-xl shadow-blue-900/20">
        <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 w-56 h-56 rounded-full bg-sky-300/10 blur-3xl" />

        <div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur text-2xl font-black text-white ring-2 ring-white/25">
              {(employee.name || "E").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-100">{greeting(now)},</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{employee.name || "Employee"}</h1>
              <p className="mt-1 text-sm font-medium text-blue-100/90">
                {employee.designation || employee.role} &middot; {employee.department || "General"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            <HeroInfo label="Username" value={employee.employeeId || "Not set"} icon={<FaIdBadge />} />
            <HeroInfo label="Company Code" value={String(company?.code || "Not set")} icon={<FaBuilding />} />
            <HeroInfo label="Location" value={employee.workLocation || "Main Office"} icon={<FaMapMarkerAlt />} />
          </div>
        </div>
      </section>

      {/* ================= KPI STRIP ================= */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Attendance This Month" value={`${monthly.attendancePct || 0}%`} helper={`${monthly.presentDays || 0} present days`} tone="blue" />
        <Metric label="Absent Days" value={String(monthly.absentDays || 0)} helper="For selected payroll month" tone="rose" />
        <Metric label="Approved Leave" value={String(monthly.paidLeave || 0)} helper="Paid leave count" tone="amber" />
        <Metric label="Net Salary" value={pay ? formatINR(pay) : "Not set"} helper={salary.latestPayroll?.status || "Salary page"} tone="emerald" />
      </section>

      {/* ================= TIME CLOCK + WORK DETAILS ================= */}
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <TimeClockCard
          now={now}
          employee={employee}
          today={today}
          checkedIn={checkedIn}
          checkedOut={checkedOut}
          punching={punching}
          onPunch={punch}
          onRefresh={load}
          loading={loading}
        />

        <div className="rounded-3xl border border-blue-200/70 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-950">Work Details</h2>
          <div className="mt-4 space-y-3">
            <Row label="Shift" value={`${employee.shiftStart || "09:00"} - ${employee.shiftEnd || "18:00"}`} />
            <Row label="Weekly Off" value={employee.weeklyOff || "Sunday"} />
            <Row label="Location" value={employee.workLocation || "Main Office"} />
            <Row label="Company" value={company?.name || "Company"} />
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-700">
              <FaHourglassHalf /> Today&apos;s Status
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-700">
              {today.status ? today.status.replace(/_/g, " ") : "Not marked"}
            </div>
          </div>
        </div>
      </section>

      {/* ================= RECENT RECORDS ================= */}
      <section className="rounded-3xl border border-blue-200/70 bg-white p-5 sm:p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FaCalendarCheck className="text-blue-700" />
          <h2 className="text-lg font-extrabold text-slate-950">Recent Attendance Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Check In</th>
                <th className="px-3 py-3">Check Out</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentAttendance.slice(0, 6).map((row: any) => (
                <tr key={row.date} className="hover:bg-blue-50/50 transition">
                  <td className="px-3 py-3 font-bold text-slate-900">{row.date}</td>
                  <td className="px-3 py-3 text-slate-700">{formatDisplayTime(row.checkIn) || "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{formatDisplayTime(row.checkOut) || "-"}</td>
                  <td className="px-3 py-3"><Badge status={row.status} /></td>
                </tr>
              ))}
              {data.recentAttendance.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">No attendance records yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ================= Unique Time Clock Widget ================= */
function TimeClockCard({
  now,
  employee,
  today,
  checkedIn,
  checkedOut,
  punching,
  onPunch,
  onRefresh,
  loading,
}: {
  now: Date;
  employee: any;
  today: any;
  checkedIn: boolean;
  checkedOut: boolean;
  punching: boolean;
  onPunch: (t: "in" | "out") => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  const shiftStartMin = parseHHMM(employee.shiftStart) ?? 9 * 60;
  const shiftEndMin = parseHHMM(employee.shiftEnd) ?? 18 * 60;
  const totalShiftMin = Math.max(1, shiftEndMin - shiftStartMin);

  const checkInMin = parseHHMM(today?.checkIn);
  const checkOutMin = parseHHMM(today?.checkOut);
  const nowMin = getISTMinutes(now);

  let progressPct = 0;
  if (checkedOut) {
    progressPct = 100;
  } else if (checkedIn && checkInMin !== null) {
    const elapsed = nowMin - checkInMin;
    const remainingShift = Math.max(1, shiftEndMin - checkInMin);
    progressPct = Math.max(0, Math.min(100, (elapsed / remainingShift) * 100));
  }

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  const ringColorClass = checkedOut
    ? "stroke-emerald-500"
    : checkedIn
      ? "stroke-blue-500"
      : "stroke-slate-200";

  const statusLabel = checkedOut ? "Shift Complete" : checkedIn ? "Currently Working" : "Not Started";

  const startPct = 0;
  const checkOutPct = checkOutMin !== null ? Math.max(0, Math.min(100, ((checkOutMin - shiftStartMin) / totalShiftMin) * 100)) : null;
  const nowPct = Math.max(0, Math.min(100, ((nowMin - shiftStartMin) / totalShiftMin) * 100));
  const barFillPct = checkedOut ? (checkOutPct ?? 100) : checkedIn ? nowPct : startPct;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-200/70 bg-gradient-to-br from-white via-blue-50/50 to-white p-6 sm:p-8 shadow-xl shadow-blue-900/5">
      <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full bg-blue-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 w-48 h-48 rounded-full bg-indigo-400/10 blur-3xl" />

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-extrabold text-slate-950">Time Clock</h2>
          <p className="mt-1 text-sm text-slate-600">Tap once to start your shift, tap again to end it.</p>
        </div>
        <div className="flex items-center gap-2">
          {checkedIn && !checkedOut && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              LIVE
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100 transition"
          >
            <FaSyncAlt className={cn(loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-stretch sm:justify-center sm:gap-10">
        {/* Circular ring clock */}
        <div className="relative shrink-0 mx-auto sm:mx-0">
          <svg width="168" height="168" viewBox="0 0 168 168" className="-rotate-90">
            <circle cx="84" cy="84" r={radius} strokeWidth="10" className="fill-none stroke-slate-100" />
            <circle
              cx="84"
              cy="84"
              r={radius}
              strokeWidth="10"
              strokeLinecap="round"
              className={cn("fill-none clock-ring-progress", ringColorClass)}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: checkedIn || checkedOut ? dashOffset : circumference,
              }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="font-mono text-2xl font-black text-slate-950 tabular-nums leading-none">
                {formatISTTime(now)}
              </div>
              <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {statusLabel} - IST
              </div>
            </div>
          </div>
        </div>

        {/* Progress + actions */}
        <div className="flex-1 flex flex-col justify-center gap-5 min-w-0">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
              <span>{employee.shiftStart || "09:00"}</span>
              <span>Shift Progress</span>
              <span>{employee.shiftEnd || "18:00"}</span>
            </div>
            <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  checkedOut ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-blue-400 to-indigo-600"
                )}
                style={{ width: `${barFillPct}%` }}
              />
              {checkedIn && !checkedOut && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-blue-600 ring-4 ring-blue-200 animate-soft-bounce"
                  style={{ left: `calc(${barFillPct}% - 7px)` }}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PunchChip label="Check In" value={formatDisplayTime(today.checkIn)} tone="emerald" active={checkedIn} />
            <PunchChip label="Check Out" value={formatDisplayTime(today.checkOut)} tone="blue" active={checkedOut} />
          </div>

          <div className="pt-1">
            {!checkedOut ? (
              <button
                type="button"
                disabled={punching || (checkedIn && checkedOut)}
                onClick={() => onPunch(checkedIn ? "out" : "in")}
                className={cn(
                  "group relative w-full inline-flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-sm font-extrabold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60",
                  checkedIn
                    ? "bg-gradient-to-r from-rose-500 to-rose-600 shadow-rose-500/25 hover:shadow-rose-500/40"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/25 hover:shadow-emerald-500/40"
                )}
              >
                {!checkedIn && !punching && (
                  <span className="absolute inset-0 rounded-2xl animate-pulse-ring" />
                )}
                {checkedIn ? <FaStop /> : <FaPlay />}
                {punching ? "Please wait..." : checkedIn ? "Clock Out" : "Clock In"}
              </button>
            ) : (
              <div className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 px-6 py-4 text-sm font-extrabold text-emerald-700">
                <FaCheck /> Shift Completed for Today
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PunchChip({ label, value, tone, active }: { label: string; value?: string; tone: "emerald" | "blue"; active: boolean }) {
  const toneMap = {
    emerald: active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-400",
    blue: active ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-slate-50 text-slate-400",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-2.5", toneMap[tone])}>
      <div className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-0.5 text-base font-black tabular-nums">{value || "--:--"}</div>
    </div>
  );
}

function HeroInfo({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-100">{icon}{label}</div>
      <div className="mt-1 text-sm font-extrabold text-white truncate">{value}</div>
    </div>
  );
}

function Metric({ label, value, helper, tone = "blue" }: { label: string; value: string; helper: string; tone?: "blue" | "emerald" | "rose" | "amber" }) {
  const styles = {
    blue: { border: "border-blue-200", accent: "from-blue-400 to-blue-600" },
    emerald: { border: "border-emerald-200", accent: "from-emerald-400 to-emerald-600" },
    rose: { border: "border-rose-200", accent: "from-rose-400 to-rose-600" },
    amber: { border: "border-amber-200", accent: "from-amber-400 to-amber-600" },
  };
  const s = styles[tone];
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow", s.border)}>
      <span className={cn("absolute top-0 left-0 h-1 w-full bg-gradient-to-r", s.accent)} />
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 text-sm last:border-0">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-extrabold text-slate-900">{value}</span>
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
  return <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-extrabold", tone)}>{s.replace(/_/g, " ")}</span>;
}
