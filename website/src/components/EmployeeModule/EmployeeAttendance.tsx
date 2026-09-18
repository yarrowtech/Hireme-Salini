import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaSignInAlt,
  FaSignOutAlt,
  FaTimes,
  FaUmbrellaBeach,
} from "react-icons/fa";
import employeeApi from "../../api/employee.api";
import { formatDisplayTime, formatIST24Time } from "./employeeUi";

type Status = "check-in" | "check-out" | "absent" | "leave";
type AttendanceRecord = {
  status?: Status;
  checkIn?: string;
  checkOut?: string;
  reason?: string;
};

type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  date: Date | null;
};

const STORAGE_KEY = "employee-attendance";
const FIXED_YEAR = 2026;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const cn = (...a: Array<string | false | undefined | null>) => a.filter(Boolean).join(" ");
const pad2 = (n: number) => String(n).padStart(2, "0");

const formatDate = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const getCurrentTime = () => formatIST24Time();

const isToday = (date: Date) => {
  const t = new Date();
  return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
};

const isPast = (date: Date) => {
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  return date.getTime() < today0.getTime();
};

function daysInMonth(monthIndex0: number) {
  return new Date(FIXED_YEAR, monthIndex0 + 1, 0).getDate();
}

function countSundays(monthIndex0: number) {
  let sundays = 0;
  for (let day = 1; day <= daysInMonth(monthIndex0); day++) {
    if (new Date(FIXED_YEAR, monthIndex0, day).getDay() === 0) sundays++;
  }
  return sundays;
}

function makeMonthCells(monthIndex0: number) {
  const blanks = new Date(FIXED_YEAR, monthIndex0, 1).getDay();
  const cells: Array<Date | null> = Array.from({ length: blanks }, () => null);
  for (let day = 1; day <= daysInMonth(monthIndex0); day++) {
    cells.push(new Date(FIXED_YEAR, monthIndex0, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function EmployeeAttendance() {
  const [employeeName] = useState(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (raw) {
        const user = JSON.parse(raw);
        return user.name || user.username || "Employee";
      }
    } catch {}
    return "Employee";
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeMonth, setActiveMonth] = useState(() => new Date().getMonth());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, date: null });
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const contextMenuRef = useRef<HTMLUListElement | null>(null);

  const loadRecords = async (month = activeMonth) => {
    try {
      setLoading(true);
      setApiError("");
      const res = await employeeApi.getAttendance({ month: `${FIXED_YEAR}-${pad2(month + 1)}` });
      if (res?.data?.records) {
        const map: Record<string, AttendanceRecord> = {};
        for (const r of res.data.records) {
          map[r.date] = {
            status: r.status === "PRESENT" || r.status === "LATE" || r.status === "HALF_DAY"
              ? (r.checkOut ? "check-out" : "check-in")
              : r.status === "ON_LEAVE"
                ? "leave"
                : "absent",
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            reason: r.correctionRequests?.[r.correctionRequests.length - 1]?.reason || r.notes || "",
          };
        }
        setAttendanceRecords(map);
      }
    } catch (err: any) {
      setApiError(err?.response?.data?.message || "Could not load attendance from backend.");
      setAttendanceRecords({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords(activeMonth);
  }, [activeMonth]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu.visible && contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu.visible]);

  const monthDays = daysInMonth(activeMonth);
  const sundays = countSundays(activeMonth);
  const workingDays = monthDays - sundays;
  const monthPrefix = `${FIXED_YEAR}-${pad2(activeMonth + 1)}`;
  const calendarCells = useMemo(() => makeMonthCells(activeMonth), [activeMonth]);
  const selectedDateKey = formatDate(selectedDate);
  const dayData = attendanceRecords[selectedDateKey] || {};

  const summary = useMemo(() => {
    const data = { present: 0, absent: 0, leave: 0 };
    for (const date in attendanceRecords) {
      if (!date.startsWith(monthPrefix)) continue;
      const status = attendanceRecords[date]?.status;
      if (status === "check-in" || status === "check-out") data.present++;
      if (status === "absent") data.absent++;
      if (status === "leave") data.leave++;
    }
    return data;
  }, [attendanceRecords, monthPrefix]);

  const openMenuForDate = (date: Date, event?: React.MouseEvent) => {
    if (isPast(date)) {
      setSelectedDate(date);
      return;
    }
    setSelectedDate(date);
    setContextMenu({
      visible: true,
      x: event?.clientX ?? Math.round(window.innerWidth / 2 - 90),
      y: event?.clientY ?? Math.round(window.innerHeight / 2 - 90),
      date,
    });
  };

  const handleOptionSelect = async (option: "check-in" | "check-out" | "request-leave") => {
    if (!contextMenu.date) return;
    const time = getCurrentTime();

    if (option === "request-leave") {
      setShowLeaveDialog(true);
      return;
    }

    if (!isToday(contextMenu.date) && (option === "check-in" || option === "check-out")) {
      toast.warn("Check-in and check-out are only permitted for today.");
      return;
    }

    try {
      if (option === "check-in") await employeeApi.checkIn({ time });
      if (option === "check-out") await employeeApi.checkOut({ time });
      if (option === "check-in" || option === "check-out") toast.success("Attendance updated.");
      await loadRecords(activeMonth);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not update attendance.");
    }

    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const submitLeaveRequest = async () => {
    if (!contextMenu.date) return;
    if (!leaveReason.trim()) {
      toast.error("Please enter a leave reason.");
      return;
    }
    const dateKey = formatDate(contextMenu.date);
    try {
      await employeeApi.leaveRequest({ date: dateKey, reason: leaveReason.trim() });
      toast.success("Leave request submitted.");
      await loadRecords(activeMonth);
    } catch {
      toast.error("Could not submit leave request.");
    }
    setLeaveReason("");
    setShowLeaveDialog(false);
    setContextMenu({ visible: false, x: 0, y: 0, date: null });
  };

  const statusClass = (status?: Status) => {
    if (status === "check-in") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "check-out") return "bg-sky-50 text-sky-700 border-sky-200";
    if (status === "absent") return "bg-rose-50 text-rose-700 border-rose-200";
    if (status === "leave") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  const tileClass = (status?: Status) => {
    if (status === "check-in") return "bg-emerald-100 text-emerald-900 hover:bg-emerald-200/80";
    if (status === "check-out") return "bg-sky-100 text-sky-900 hover:bg-sky-200/80";
    if (status === "absent") return "bg-rose-100 text-rose-900 hover:bg-rose-200/80";
    if (status === "leave") return "bg-amber-100 text-amber-900 hover:bg-amber-200/80";
    return "bg-white text-slate-800 hover:bg-blue-50";
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-200/70 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 sm:p-8 shadow-xl shadow-blue-900/20">
        <div className="pointer-events-none absolute -top-16 -right-10 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-100 text-xs font-bold uppercase tracking-wide">
              <FaCalendarAlt /> Attendance
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{employeeName}</h2>
            <p className="mt-1 text-sm text-blue-100/90">Month: <strong className="text-white">{MONTHS[activeMonth]} {FIXED_YEAR}</strong> - times shown in IST</p>
          </div>
          <p className="rounded-xl border border-white/20 bg-white/10 backdrop-blur px-4 py-2.5 text-xs font-bold text-white">
            Select today to check in/out, or request leave for a date.
          </p>
        </div>
        {apiError && (
          <div className="relative mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {apiError}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <MiniKpi label="Month Days" value={monthDays} />
        <MiniKpi label="Sundays" value={sundays} tone="amber" />
        <MiniKpi label="Working" value={workingDays} tone="emerald" />
        <MiniKpi label="Present" value={summary.present} tone="emerald" />
        <MiniKpi label="Absent" value={summary.absent} tone="rose" />
        <MiniKpi label="Leave" value={summary.leave} tone="amber" />
        <MiniKpi label="Year" value={FIXED_YEAR} tone="cyan" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-blue-200/70 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-950">
            <FaCalendarAlt className="text-blue-700" />
            Attendance Calendar
          </div>

          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" disabled={activeMonth === 0} onClick={() => setActiveMonth((m) => Math.max(0, m - 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 disabled:opacity-40 transition">
                <FaChevronLeft />
              </button>
              <div className="font-extrabold text-slate-950">{MONTHS[activeMonth]} {FIXED_YEAR}</div>
              <button type="button" disabled={activeMonth === 11} onClick={() => setActiveMonth((m) => Math.min(11, m + 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 disabled:opacity-40 transition">
                <FaChevronRight />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold uppercase text-slate-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((date, index) => {
                if (!date) return <div key={`blank-${index}`} className="aspect-square rounded-xl bg-slate-50" />;
                const key = formatDate(date);
                const disabled = isPast(date);
                return (
                  <button
                    type="button"
                    key={key}
                    disabled={disabled}
                    onClick={(event) => openMenuForDate(date, event)}
                    className={cn(
                      "aspect-square rounded-xl border text-sm font-extrabold transition-all duration-150",
                      tileClass(attendanceRecords[key]?.status),
                      key === selectedDateKey ? "border-blue-500 ring-2 ring-blue-200 scale-105" : "border-slate-100",
                      isToday(date) && "outline outline-2 outline-blue-600 outline-offset-[-2px]",
                      disabled ? "cursor-not-allowed opacity-45" : "hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-sm"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-500">
              <LegendDot color="bg-emerald-400" label="Checked In" />
              <LegendDot color="bg-sky-400" label="Checked Out" />
              <LegendDot color="bg-rose-400" label="Absent" />
              <LegendDot color="bg-amber-400" label="Leave" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-blue-200/70 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-extrabold text-slate-950">{selectedDate.toDateString()}</h3>
            <span className={cn("mt-3 inline-flex rounded-xl border px-3 py-1.5 text-sm font-bold", statusClass(dayData.status))}>
              {dayData.status === "check-in" && "Present (Checked In)"}
              {dayData.status === "check-out" && "Checked Out"}
              {dayData.status === "absent" && "Absent"}
              {dayData.status === "leave" && "Leave Requested"}
              {!dayData.status && "No attendance marked yet"}
            </span>

            <div className="mt-5 space-y-2 text-sm">
              <Detail label="Check In Time" value={formatDisplayTime(dayData.checkIn)} />
              <Detail label="Check Out Time" value={formatDisplayTime(dayData.checkOut)} />
              <Detail label="Leave Reason" value={dayData.reason} />
            </div>
          </div>

          <div className="rounded-3xl border border-blue-200/70 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-extrabold text-slate-950">Recorded Punches</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {Object.entries(attendanceRecords)
                .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                .slice(0, 15)
                .map(([date, rec]) => (
                  <div key={date} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm hover:bg-blue-50/60 transition">
                    <span className="font-mono font-bold text-slate-800">{date}</span>
                    <span className={cn("rounded-lg border px-3 py-1 text-xs font-bold", statusClass(rec.status))}>
                      {rec.status === "check-in" && `Present ${formatDisplayTime(rec.checkIn) || ""}`}
                      {rec.status === "check-out" && `Out ${formatDisplayTime(rec.checkOut) || ""}`}
                      {rec.status === "absent" && "Absent"}
                      {rec.status === "leave" && "Leave"}
                    </span>
                  </div>
                ))}
              {Object.keys(attendanceRecords).length === 0 && <p className="py-4 text-center text-sm text-slate-500">No records found for this period.</p>}
              {loading && <p className="py-4 text-center text-sm text-slate-500">Loading backend records...</p>}
            </div>
          </div>
        </div>
      </section>

      {contextMenu.visible && contextMenu.date && (
        <ul
          ref={contextMenuRef}
          className="fixed z-[9999] w-56 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur py-2 text-sm text-slate-900 shadow-2xl overflow-hidden"
          style={{ top: `${Math.min(contextMenu.y, window.innerHeight - 220)}px`, left: `${Math.min(contextMenu.x, window.innerWidth - 230)}px` }}
        >
          {isToday(contextMenu.date) ? (
            <>
              <MenuItem onClick={() => handleOptionSelect("check-in")} label="Check In" icon={<FaSignInAlt className="text-emerald-600" />} />
              <MenuItem onClick={() => handleOptionSelect("check-out")} label="Check Out" icon={<FaSignOutAlt className="text-blue-600" />} />
            </>
          ) : (
            <>
              <DisabledItem label="Check In (today only)" />
              <DisabledItem label="Check Out (today only)" />
            </>
          )}
          <MenuItem onClick={() => handleOptionSelect("request-leave")} label="Request Leave" icon={<FaUmbrellaBeach className="text-amber-600" />} />
        </ul>
      )}

      {showLeaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-blue-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-950">
                <FaUmbrellaBeach className="text-amber-500" />
                Leave Request
              </h3>
              <button type="button" onClick={() => setShowLeaveDialog(false)} className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
                <FaTimes />
              </button>
            </div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{contextMenu.date?.toDateString()}</p>
            <textarea
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-400/30"
              rows={4}
              placeholder="Reason for leave"
              value={leaveReason}
              onChange={(event) => setLeaveReason(event.target.value)}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setShowLeaveDialog(false)} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">Cancel</button>
              <button type="button" onClick={submitLeaveRequest} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 transition">Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniKpi({ label, value, tone = "blue" }: { label: string; value: number; tone?: "blue" | "emerald" | "rose" | "amber" | "cyan" }) {
  const toneMap = {
    blue: "bg-blue-50 border-blue-200 text-blue-950",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-950",
    rose: "bg-rose-50 border-rose-200 text-rose-950",
    amber: "bg-amber-50 border-amber-200 text-amber-950",
    cyan: "bg-sky-50 border-sky-200 text-sky-950",
  };
  return (
    <div className={cn("rounded-2xl border px-3 py-2.5 text-center shadow-sm hover:shadow-md transition-shadow", toneMap[tone])}>
      <div className="text-[11px] font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-black">{value}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      {label}
    </span>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <p className="flex justify-between border-b border-slate-100 py-1">
      <span className="text-slate-500">{label}:</span>
      <strong className="text-slate-900">{value}</strong>
    </p>
  );
}

function MenuItem({ label, onClick, icon }: { label: string; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <li className="flex cursor-pointer select-none items-center gap-2.5 px-4 py-2.5 font-medium text-slate-800 hover:bg-blue-50 transition" onClick={onClick}>
      {icon}
      {label}
    </li>
  );
}

function DisabledItem({ label }: { label: string }) {
  return <li className="cursor-not-allowed select-none px-4 py-2.5 text-xs text-slate-400">{label}</li>;
}
