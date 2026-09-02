// import React, { useEffect, useMemo, useRef, useState } from "react";
// import Calendar from "react-calendar";
// import "react-calendar/dist/Calendar.css";

// type Status = "check-in" | "check-out" | "absent" | "leave";
// type AttendanceRecord = {
//   status?: Status;
//   checkIn?: string;
//   checkOut?: string;
//   reason?: string;
// };

// type ContextMenuState = {
//   visible: boolean;
//   x: number;
//   y: number;
//   date: Date | null;
// };

// const STORAGE_KEY = "employee-attendance";
// const LOGIN_KEY = "EmployeeLoginId";

// const cn = (...a: Array<string | false | undefined | null>) =>
//   a.filter(Boolean).join(" ");

// const pad2 = (n: number) => String(n).padStart(2, "0");

// /** ✅ Local date key (prevents timezone “today not marked” bugs) */
// const formatDate = (date: Date) => {
//   const y = date.getFullYear();
//   const m = pad2(date.getMonth() + 1);
//   const d = pad2(date.getDate());
//   return `${y}-${m}-${d}`;
// };

// const generateName = (loginId: string) => {
//   if (!loginId) return "Employee";
//   const namePart = loginId.replace(/\./g, " ");
//   return namePart.charAt(0).toUpperCase() + namePart.slice(1);
// };

// const getCurrentTime = () =>
//   new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// const isToday = (date: Date) => {
//   const t = new Date();
//   return (
//     date.getDate() === t.getDate() &&
//     date.getMonth() === t.getMonth() &&
//     date.getFullYear() === t.getFullYear()
//   );
// };

// const isPast = (date: Date) => {
//   const today0 = new Date();
//   today0.setHours(0, 0, 0, 0);
//   return date.getTime() < today0.getTime();
// };

// /** ✅ Only Saturday should be forced white (Sunday unchanged) */
// const isSaturday = (date: Date) => date.getDay() === 6;

// export default function EmployeeAttendance() {
//   const employeeLoginId = localStorage.getItem(LOGIN_KEY) || "";
//   const employeeName = generateName(employeeLoginId);

//   const [selectedDate, setSelectedDate] = useState<Date>(new Date());
//   const [contextMenu, setContextMenu] = useState<ContextMenuState>({
//     visible: false,
//     x: 0,
//     y: 0,
//     date: null,
//   });

//   const [showLeaveDialog, setShowLeaveDialog] = useState(false);
//   const [leaveReason, setLeaveReason] = useState("");
//   const [attendanceRecords, setAttendanceRecords] = useState<
//     Record<string, AttendanceRecord>
//   >({});

//   const contextMenuRef = useRef<HTMLUListElement | null>(null);

//   /* ---- Load ---- */
//   useEffect(() => {
//     const saved = localStorage.getItem(STORAGE_KEY);
//     if (!saved) return;
//     try {
//       setAttendanceRecords(JSON.parse(saved));
//     } catch {
//       setAttendanceRecords({});
//     }
//   }, []);

//   /* ---- Save ---- */
//   useEffect(() => {
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(attendanceRecords));
//   }, [attendanceRecords]);

//   /* ---- Close menu on outside click ---- */
//   useEffect(() => {
//     const handleClickOutside = (e: MouseEvent) => {
//       if (
//         contextMenu.visible &&
//         contextMenuRef.current &&
//         !contextMenuRef.current.contains(e.target as Node)
//       ) {
//         setContextMenu((p) => ({ ...p, visible: false }));
//       }
//     };
//     window.addEventListener("mousedown", handleClickOutside);
//     return () => window.removeEventListener("mousedown", handleClickOutside);
//   }, [contextMenu.visible]);

//   /** ✅ Open context menu */
//   const openMenuForDate = (date: Date, e?: React.MouseEvent) => {
//     if (isPast(date)) return;

//     setSelectedDate(date);

//     const clientX =
//       (e as any)?.clientX ?? Math.round(window.innerWidth / 2 - 90);
//     const clientY =
//       (e as any)?.clientY ?? Math.round(window.innerHeight / 2 - 90);

//     setContextMenu({
//       visible: true,
//       x: clientX,
//       y: clientY,
//       date,
//     });
//   };

//   const handleOptionSelect = (
//     option: "check-in" | "check-out" | "absent" | "clear" | "request-leave"
//   ) => {
//     if (!contextMenu.date) return;

//     const dateKey = formatDate(contextMenu.date);
//     const time = getCurrentTime();

//     if (option === "request-leave") {
//       setShowLeaveDialog(true);
//       return;
//     }

//     // ✅ Check-in/out only today
//     if (
//       !isToday(contextMenu.date) &&
//       (option === "check-in" || option === "check-out")
//     ) {
//       alert("✅ Check-in/Check-out only allowed for today's date.");
//       return;
//     }

//     setAttendanceRecords((prev) => {
//       const existing = prev[dateKey] || {};
//       const updated: Record<string, AttendanceRecord> = { ...prev };

//       // ✅ Block check-in/out if absent/leave already set
//       if (
//         (existing.status === "absent" || existing.status === "leave") &&
//         (option === "check-in" || option === "check-out")
//       ) {
//         alert("❗ Cannot mark check-in/out on a day marked absent or leave.");
//         return prev;
//       }

//       switch (option) {
//         case "check-in":
//           if (existing.checkIn) {
//             alert("🔁 Already checked in.");
//             return prev;
//           }
//           updated[dateKey] = { ...existing, checkIn: time, status: "check-in" };
//           break;

//         case "check-out":
//           if (existing.checkOut) {
//             alert("🔁 Already checked out.");
//             return prev;
//           }
//           updated[dateKey] = {
//             ...existing,
//             checkOut: time,
//             status: "check-out",
//           };
//           break;

//         case "absent":
//           updated[dateKey] = { status: "absent" };
//           break;

//         case "clear":
//           if (!updated[dateKey]) return prev;
//           delete updated[dateKey];
//           break;

//         default:
//           break;
//       }

//       setContextMenu((p) => ({ ...p, visible: false }));
//       return updated;
//     });
//   };

//   const submitLeaveRequest = () => {
//     if (!contextMenu.date) return;

//     const dateKey = formatDate(contextMenu.date);
//     if (!leaveReason.trim()) {
//       alert("Please enter a leave reason.");
//       return;
//     }

//     setAttendanceRecords((prev) => ({
//       ...prev,
//       [dateKey]: { status: "leave", reason: leaveReason.trim() },
//     }));

//     setLeaveReason("");
//     setShowLeaveDialog(false);
//     setContextMenu({ visible: false, x: 0, y: 0, date: null });
//   };

//   /** Monthly summary */
//   const monthlySummary = useMemo(() => {
//     const now = new Date();
//     const currentMonth = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
//     const summary = { present: 0, absent: 0, leave: 0 };

//     for (const date in attendanceRecords) {
//       if (!date.startsWith(currentMonth)) continue;
//       const status = attendanceRecords[date]?.status;
//       if (status === "check-in" || status === "check-out") summary.present++;
//       if (status === "absent") summary.absent++;
//       if (status === "leave") summary.leave++;
//     }
//     return summary;
//   }, [attendanceRecords]);

//   const summaryData = useMemo(() => {
//     const todayKey = formatDate(new Date());
//     const todayStatus = attendanceRecords[todayKey]?.status || "not-marked";

//     const now = new Date();
//     const currentMonth = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
//     const currentYear = now.getFullYear();

//     let monthlyPresent = 0;
//     let yearlyPresent = 0;
//     let totalLeave = 0;
//     let leaveRequests = 0;

//     Object.entries(attendanceRecords).forEach(([date, record]) => {
//       const recordDate = new Date(date);
//       const status = record.status;

//       if (status === "leave") {
//         totalLeave++;
//         leaveRequests++;
//       }
//       if (status === "check-in" || status === "check-out") {
//         if (date.startsWith(currentMonth)) monthlyPresent++;
//         if (recordDate.getFullYear() === currentYear) yearlyPresent++;
//       }
//     });

//     return {
//       todayStatus,
//       monthlyPresent,
//       yearlyPresent,
//       totalLeave,
//       leaveRequests,
//     };
//   }, [attendanceRecords]);

//   const selectedDateKey = formatDate(selectedDate);
//   const dayData = attendanceRecords[selectedDateKey] || {};

//   const statusPillClass = (status?: Status) => {
//     switch (status) {
//       case "check-in":
//         return "bg-emerald-500/15 text-emerald-200 border-emerald-400/20";
//       case "check-out":
//         return "bg-sky-500/15 text-sky-200 border-sky-400/20";
//       case "absent":
//         return "bg-rose-500/15 text-rose-200 border-rose-400/20";
//       case "leave":
//         return "bg-amber-500/15 text-amber-200 border-amber-400/20";
//       default:
//         return "bg-white/5 text-slate-300 border-white/10";
//     }
//   };

//   const tileStatusClass = (status?: Status) => {
//     switch (status) {
//       case "check-in":
//         return "bg-emerald-500/20 text-emerald-100";
//       case "check-out":
//         return "bg-sky-500/20 text-sky-100";
//       case "absent":
//         return "bg-rose-500/20 text-rose-100";
//       case "leave":
//         return "bg-amber-500/20 text-amber-100";
//       default:
//         return "bg-transparent text-slate-100";
//     }
//   };

//   return (
//     <div className="space-y-6">
//       {/* ✅ Calendar styling */}
//       <style>{`
//         .emp-cal .react-calendar {
//           width: 100%;
//           border: none;
//           background: rgba(255,255,255,0.04);
//           color: #e5e7eb;
//           border-radius: 16px;
//           padding: 10px;
//         }

//         /* ✅ remove double arrows (<< and >>) */
//         .emp-cal .react-calendar__navigation__prev2-button,
//         .emp-cal .react-calendar__navigation__next2-button {
//           display: none !important;
//         }

//         /* ✅ remove navigation container background/box */
//         .emp-cal .react-calendar__navigation {
//           background: transparent !important;
//           border: none !important;
//           box-shadow: none !important;
//           padding: 0 !important;
//           margin-bottom: 6px;
//         }

//         /* ✅ buttons only */
//         .emp-cal .react-calendar__navigation button {
//           background: transparent !important;
//           border: none !important;
//           box-shadow: none !important;
//           color: #e5e7eb !important;
//           border-radius: 10px;
//           padding: 6px 10px;
//         }
//         .emp-cal .react-calendar__navigation button:enabled:hover {
//           background: rgba(255,255,255,0.08) !important;
//         }
//         .emp-cal .react-calendar__navigation button:focus {
//           outline: none !important;
//         }

//         .emp-cal .react-calendar__month-view__weekdays {
//           color: #94a3b8;
//           text-transform: uppercase;
//           font-size: 11px;
//         }

//         .emp-cal .react-calendar__tile {
//           border-radius: 12px;
//           position: relative;
//           padding: 6px 4px !important;
//           line-height: 1.1;
//         }
//         .emp-cal .react-calendar__tile:enabled:hover {
//           background: rgba(255,255,255,0.08);
//         }
//         .emp-cal .react-calendar__tile--now {
//           outline: 2px solid rgba(34,211,238,0.35);
//           outline-offset: -2px;
//         }
//         .emp-cal .react-calendar__tile--active {
//           background: rgba(34,211,238,0.18) !important;
//         }
//         .emp-cal .react-calendar__tile:disabled {
//           background: rgba(255,255,255,0.03);
//           cursor: not-allowed;
//           opacity: 0.9;
//         }

//         /* ✅ ONLY Saturday forced white; Sunday untouched */
//         .emp-cal .sat-white abbr{
//           color: #ffffff !important;
//           font-weight: 900 !important;
//         }
//       `}</style>

//       {/* Header */}
//       <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
//         <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
//           <div>
//             <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
//               {employeeName} Attendance
//             </h2>
//           </div>
//         </div>
//       </div>

//       {/* Summary */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
//         <Card
//           title="📅 Today"
//           value={
//             summaryData.todayStatus === "check-in" ||
//             summaryData.todayStatus === "check-out"
//               ? "✅ Present"
//               : summaryData.todayStatus === "absent"
//               ? "❌ Absent"
//               : summaryData.todayStatus === "leave"
//               ? "📝 Leave"
//               : "⏺ Not marked"
//           }
//         />

//         <Card title="📊 Monthly Attendance" value={`${summaryData.monthlyPresent} Days`} />

//         {/* ✅ NEW: Monthly Absent (same style as others) */}
//         <Card title="❌ Monthly Absent" value={`${monthlySummary.absent}`} />

//         <Card title="📆 Yearly Attendance" value={`${summaryData.yearlyPresent} Days`} />
//         <Card title="📝 Total Leaves" value={`${summaryData.totalLeave}`} />
//         <Card title="📨 Leave Requests" value={`${summaryData.leaveRequests}`} />
//       </div>

//       {/* Calendar + Details */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {/* Calendar */}
//         <div className="space-y-6">
//           <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
//             <div className="text-sm font-semibold text-white mb-3">Calendar</div>

//             <div className="emp-cal rounded-2xl border border-white/10 bg-slate-950/40">
//               <Calendar
//                 value={selectedDate}
//                 minDate={new Date()}
//                 onChange={(v) => setSelectedDate(v as Date)}
//                 onClickDay={(value, e) => openMenuForDate(value, e as any)}
//                 tileDisabled={({ date }) => isPast(date)}
//                 tileClassName={({ date }) => {
//                   const key = formatDate(date);
//                   const status = attendanceRecords[key]?.status;

//                   return cn(
//                     "transition",
//                     isSaturday(date) && "sat-white",
//                     tileStatusClass(status)
//                   );
//                 }}
//               />
//             </div>
//           </div>

//           {/* Monthly summary */}
//           <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm space-y-1">
//             <h4 className="text-lg font-extrabold text-white">📊 This Month</h4>
//             <p className="text-slate-200">✅ Present: {monthlySummary.present}</p>
//             <p className="text-slate-200">❌ Absent: {monthlySummary.absent}</p>
//             <p className="text-slate-200">📝 Leave: {monthlySummary.leave}</p>
//           </div>
//         </div>

//         {/* Details */}
//         <div className="space-y-6">
//           <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
//             <h3 className="text-xl font-extrabold text-white">
//               📅 {selectedDate.toDateString()}
//             </h3>

//             <div className="mt-3">
//               <span
//                 className={cn(
//                   "inline-flex items-center gap-2 px-3 py-2 rounded-xl border",
//                   statusPillClass(dayData.status)
//                 )}
//               >
//                 <span className="font-semibold">
//                   {dayData.status === "check-in" && "✅ Present (Checked In)"}
//                   {dayData.status === "check-out" && "⏱️ Checked Out"}
//                   {dayData.status === "absent" && "❌ Absent"}
//                   {dayData.status === "leave" && "📝 Leave Requested"}
//                   {!dayData.status && "No attendance marked yet."}
//                 </span>
//               </span>
//             </div>

//             <div className="mt-4 text-sm text-slate-200 space-y-1">
//               {dayData.checkIn && (
//                 <p>
//                   Check-In:{" "}
//                   <span className="font-semibold text-white">
//                     {dayData.checkIn}
//                   </span>
//                 </p>
//               )}
//               {dayData.checkOut && (
//                 <p>
//                   Check-Out:{" "}
//                   <span className="font-semibold text-white">
//                     {dayData.checkOut}
//                   </span>
//                 </p>
//               )}
//               {dayData.reason && (
//                 <p>
//                   Reason:{" "}
//                   <span className="font-semibold text-white">
//                     {dayData.reason}
//                   </span>
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Recent */}
//           <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
//             <h3 className="text-lg font-extrabold mb-4 text-white">
//               📆 Recent Attendance
//             </h3>

//             <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
//               {Object.entries(attendanceRecords)
//                 .sort(
//                   (a, b) =>
//                     new Date(b[0]).getTime() - new Date(a[0]).getTime()
//                 )
//                 .slice(0, 30)
//                 .map(([date, data]) => (
//                   <div
//                     key={date}
//                     className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-2"
//                   >
//                     <span className="text-sm text-slate-200">
//                       {new Date(date).toDateString()}
//                     </span>

//                     <span
//                       className={cn(
//                         "text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl border",
//                         statusPillClass(data.status)
//                       )}
//                     >
//                       {data.status === "check-in" &&
//                         `✅ Checked In (${data.checkIn || "-"})`}
//                       {data.status === "check-out" &&
//                         `⏱️ Checked Out (${data.checkOut || "-"})`}
//                       {data.status === "absent" && "❌ Absent"}
//                       {data.status === "leave" &&
//                         `📝 Leave - ${data.reason || "No reason"}`}
//                       {!data.status && "⏺ Not marked"}
//                     </span>
//                   </div>
//                 ))}

//               {Object.keys(attendanceRecords).length === 0 && (
//                 <p className="text-slate-300">No records found.</p>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Context Menu */}
//       {contextMenu.visible && contextMenu.date && (
//         <ul
//           ref={contextMenuRef}
//           className="fixed bg-slate-950 text-white shadow-2xl rounded-2xl py-2 text-sm w-52 border border-white/10 z-[9999]"
//           style={{
//             top: `${Math.min(contextMenu.y, window.innerHeight - 220)}px`,
//             left: `${Math.min(contextMenu.x, window.innerWidth - 230)}px`,
//           }}
//         >
//           {isToday(contextMenu.date) ? (
//             <>
//               <MenuItem
//                 onClick={() => handleOptionSelect("check-in")}
//                 label="✅ Check In"
//               />
//               <MenuItem
//                 onClick={() => handleOptionSelect("check-out")}
//                 label="⏱️ Check Out"
//               />
//             </>
//           ) : (
//             <>
//               <DisabledItem label="✅ Check In (Today only)" />
//               <DisabledItem label="⏱️ Check Out (Today only)" />
//             </>
//           )}

//           <MenuItem
//             onClick={() => handleOptionSelect("absent")}
//             label="❌ Mark Absent"
//           />
//           <MenuItem
//             onClick={() => handleOptionSelect("request-leave")}
//             label="📝 Request Leave"
//           />
//           <MenuItem
//             onClick={() => handleOptionSelect("clear")}
//             label="🗑️ Clear Record"
//           />
//         </ul>
//       )}

//       {/* Leave Modal */}
//       {showLeaveDialog && (
//         <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
//           <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
//             <h3 className="text-lg font-extrabold text-white">
//               📝 Leave Request for {contextMenu.date?.toDateString()}
//             </h3>

//             <textarea
//               className="mt-4 w-full p-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-400/30"
//               rows={4}
//               placeholder="Enter reason for leave..."
//               value={leaveReason}
//               onChange={(e) => setLeaveReason(e.target.value)}
//             />

//             <div className="mt-4 flex justify-end gap-3">
//               <button
//                 onClick={() => {
//                   setShowLeaveDialog(false);
//                   setLeaveReason("");
//                 }}
//                 className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 text-white"
//               >
//                 Cancel
//               </button>

//               <button
//                 onClick={submitLeaveRequest}
//                 className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-white"
//               >
//                 ✅ Send to HR
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// /* ---------- UI Helpers ---------- */

// function Card({ title, value }: { title: string; value: string }) {
//   return (
//     <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
//       <p className="text-xs text-slate-300">{title}</p>
//       <p className="font-extrabold text-lg mt-2 text-white">{value}</p>
//     </div>
//   );
// }

// function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
//   return (
//     <li
//       className="px-4 py-2 hover:bg-white/10 cursor-pointer select-none"
//       onClick={onClick}
//     >
//       {label}
//     </li>
//   );
// }

// function DisabledItem({ label }: { label: string }) {
//   return (
//     <li className="px-4 py-2 text-slate-500 cursor-not-allowed select-none">
//       {label}
//     </li>
//   );
// }





import React, { useEffect, useMemo, useRef, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

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
const LOGIN_KEY = "EmployeeLoginId";

const FIXED_YEAR = 2026;

const cn = (...a: Array<string | false | undefined | null>) => a.filter(Boolean).join(" ");
const pad2 = (n: number) => String(n).padStart(2, "0");

/** ✅ Local date key (prevents timezone “today not marked” bugs) */
const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

const generateName = (loginId: string) => {
  if (!loginId) return "Employee";
  const namePart = loginId.replace(/\./g, " ");
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
};

const getCurrentTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const isToday = (date: Date) => {
  const t = new Date();
  return (
    date.getDate() === t.getDate() &&
    date.getMonth() === t.getMonth() &&
    date.getFullYear() === t.getFullYear()
  );
};

const isPast = (date: Date) => {
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  return date.getTime() < today0.getTime();
};

/** ✅ Only Saturday should be forced white (Sunday unchanged) */
const isSaturday = (date: Date) => date.getDay() === 6;

/* ===================== 2026 MONTH HELPERS (UTC SAFE) ===================== */
function daysInMonth2026(monthIndex0: number) {
  // monthIndex0: 0=Jan..11=Dec
  return new Date(Date.UTC(FIXED_YEAR, monthIndex0 + 1, 0)).getUTCDate();
}

function countSundays2026(monthIndex0: number) {
  const total = daysInMonth2026(monthIndex0);
  let sundays = 0;
  for (let day = 1; day <= total; day++) {
    const d = new Date(Date.UTC(FIXED_YEAR, monthIndex0, day));
    if (d.getUTCDay() === 0) sundays++;
  }
  return sundays;
}

function workingDays2026(monthIndex0: number) {
  return daysInMonth2026(monthIndex0) - countSundays2026(monthIndex0);
}

function monthLabel(monthIndex0: number) {
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return names[monthIndex0] ?? "Jan";
}

/* ===================== UI MINI KPI (same card as your screenshot) ===================== */
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

export default function EmployeeAttendance() {
  const employeeLoginId = localStorage.getItem(LOGIN_KEY) || "";
  const employeeName = generateName(employeeLoginId);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeStartDate, setActiveStartDate] = useState<Date>(() => {
    // Default month based on current month, but forced year 2026
    const now = new Date();
    return new Date(FIXED_YEAR, now.getMonth(), 1);
  });

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    date: null,
  });

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});

  const contextMenuRef = useRef<HTMLUListElement | null>(null);

  /* ---- Load ---- */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setAttendanceRecords(JSON.parse(saved));
    } catch {
      setAttendanceRecords({});
    }
  }, []);

  /* ---- Save ---- */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  /* ---- Close menu on outside click ---- */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu.visible && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu((p) => ({ ...p, visible: false }));
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu.visible]);

  /** ✅ Open context menu */
  const openMenuForDate = (date: Date, e?: React.MouseEvent) => {
    if (isPast(date)) return;

    setSelectedDate(date);

    const clientX = (e as any)?.clientX ?? Math.round(window.innerWidth / 2 - 90);
    const clientY = (e as any)?.clientY ?? Math.round(window.innerHeight / 2 - 90);

    setContextMenu({
      visible: true,
      x: clientX,
      y: clientY,
      date,
    });
  };

  const handleOptionSelect = (option: "check-in" | "check-out" | "absent" | "clear" | "request-leave") => {
    if (!contextMenu.date) return;

    const dateKey = formatDate(contextMenu.date);
    const time = getCurrentTime();

    if (option === "request-leave") {
      setShowLeaveDialog(true);
      return;
    }

    // ✅ Check-in/out only today
    if (!isToday(contextMenu.date) && (option === "check-in" || option === "check-out")) {
      alert("✅ Check-in/Check-out only allowed for today's date.");
      return;
    }

    setAttendanceRecords((prev) => {
      const existing = prev[dateKey] || {};
      const updated: Record<string, AttendanceRecord> = { ...prev };

      // ✅ Block check-in/out if absent/leave already set
      if ((existing.status === "absent" || existing.status === "leave") && (option === "check-in" || option === "check-out")) {
        alert("❗ Cannot mark check-in/out on a day marked absent or leave.");
        return prev;
      }

      switch (option) {
        case "check-in":
          if (existing.checkIn) {
            alert("🔁 Already checked in.");
            return prev;
          }
          updated[dateKey] = { ...existing, checkIn: time, status: "check-in" };
          break;

        case "check-out":
          if (existing.checkOut) {
            alert("🔁 Already checked out.");
            return prev;
          }
          updated[dateKey] = { ...existing, checkOut: time, status: "check-out" };
          break;

        case "absent":
          updated[dateKey] = { status: "absent" };
          break;

        case "clear":
          if (!updated[dateKey]) return prev;
          delete updated[dateKey];
          break;

        default:
          break;
      }

      setContextMenu((p) => ({ ...p, visible: false }));
      return updated;
    });
  };

  const submitLeaveRequest = () => {
    if (!contextMenu.date) return;

    const dateKey = formatDate(contextMenu.date);
    if (!leaveReason.trim()) {
      alert("Please enter a leave reason.");
      return;
    }

    setAttendanceRecords((prev) => ({
      ...prev,
      [dateKey]: { status: "leave", reason: leaveReason.trim() },
    }));

    setLeaveReason("");
    setShowLeaveDialog(false);
    setContextMenu({ visible: false, x: 0, y: 0, date: null });
  };

  /* ===================== MONTHLY = based on calendar month (like your monthly system) ===================== */
  const selectedMonthIndex0 = activeStartDate.getMonth(); // 0..11
  const monthDays = useMemo(() => daysInMonth2026(selectedMonthIndex0), [selectedMonthIndex0]);
  const monthSundays = useMemo(() => countSundays2026(selectedMonthIndex0), [selectedMonthIndex0]);
  const monthWorkingDays = useMemo(() => workingDays2026(selectedMonthIndex0), [selectedMonthIndex0]);

  const monthPrefix = useMemo(() => `${FIXED_YEAR}-${pad2(selectedMonthIndex0 + 1)}`, [selectedMonthIndex0]);

  const monthlySummary = useMemo(() => {
    const summary = { present: 0, absent: 0, leave: 0 };

    for (const date in attendanceRecords) {
      if (!date.startsWith(monthPrefix)) continue;
      const status = attendanceRecords[date]?.status;

      if (status === "check-in" || status === "check-out") summary.present++;
      if (status === "absent") summary.absent++;
      if (status === "leave") summary.leave++;
    }

    return summary;
  }, [attendanceRecords, monthPrefix]);

  const selectedDateKey = formatDate(selectedDate);
  const dayData = attendanceRecords[selectedDateKey] || {};

  const statusPillClass = (status?: Status) => {
    switch (status) {
      case "check-in":
        return "bg-emerald-500/15 text-emerald-200 border-emerald-400/20";
      case "check-out":
        return "bg-sky-500/15 text-sky-200 border-sky-400/20";
      case "absent":
        return "bg-rose-500/15 text-rose-200 border-rose-400/20";
      case "leave":
        return "bg-amber-500/15 text-amber-200 border-amber-400/20";
      default:
        return "bg-white/5 text-slate-300 border-white/10";
    }
  };

  const tileStatusClass = (status?: Status) => {
    switch (status) {
      case "check-in":
        return "bg-emerald-500/20 text-emerald-100";
      case "check-out":
        return "bg-sky-500/20 text-sky-100";
      case "absent":
        return "bg-rose-500/20 text-rose-100";
      case "leave":
        return "bg-amber-500/20 text-amber-100";
      default:
        return "bg-transparent text-slate-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* ✅ Calendar styling */}
      <style>{`
        .emp-cal .react-calendar {
          width: 100%;
          border: none;
          background: rgba(255,255,255,0.04);
          color: #e5e7eb;
          border-radius: 16px;
          padding: 10px;
        }
        /* ✅ remove double arrows (<< and >>) */
        .emp-cal .react-calendar__navigation__prev2-button,
        .emp-cal .react-calendar__navigation__next2-button {
          display: none !important;
        }
        /* ✅ remove navigation container background/box */
        .emp-cal .react-calendar__navigation {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin-bottom: 6px;
        }
        /* ✅ buttons only */
        .emp-cal .react-calendar__navigation button {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: #e5e7eb !important;
          border-radius: 10px;
          padding: 6px 10px;
        }
        .emp-cal .react-calendar__navigation button:enabled:hover {
          background: rgba(255,255,255,0.08) !important;
        }
        .emp-cal .react-calendar__month-view__weekdays {
          color: #94a3b8;
          text-transform: uppercase;
          font-size: 11px;
        }
        .emp-cal .react-calendar__tile {
          border-radius: 12px;
          position: relative;
          padding: 6px 4px !important;
          line-height: 1.1;
        }
        .emp-cal .react-calendar__tile:enabled:hover {
          background: rgba(255,255,255,0.08);
        }
        .emp-cal .react-calendar__tile--now {
          outline: 2px solid rgba(34,211,238,0.35);
          outline-offset: -2px;
        }
        .emp-cal .react-calendar__tile--active {
          background: rgba(34,211,238,0.18) !important;
        }
        .emp-cal .react-calendar__tile:disabled {
          background: rgba(255,255,255,0.03);
          cursor: not-allowed;
          opacity: 0.9;
        }
        /* ✅ ONLY Saturday forced white; Sunday untouched */
        .emp-cal .sat-white abbr{
          color: #ffffff !important;
          font-weight: 900 !important;
        }
      `}</style>

      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {employeeName} Attendance
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Monthly View: <span className="text-white font-bold">{monthLabel(selectedMonthIndex0)} {FIXED_YEAR}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ✅ MONTHLY CARDS (same style as Month Days screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        <MiniKpi label="Month Days" value={String(monthDays)} tone="cyan" />
        <MiniKpi label="Sundays (Holiday)" value={String(monthSundays)} tone="amber" />
        <MiniKpi label="Working Days" value={String(monthWorkingDays)} tone="emerald" />

        <MiniKpi label="Present" value={String(monthlySummary.present)} tone="emerald" />
        <MiniKpi label="Absent" value={String(monthlySummary.absent)} tone="rose" />
        <MiniKpi label="Leave" value={String(monthlySummary.leave)} tone="amber" />

        <MiniKpi label="Year" value={String(FIXED_YEAR)} tone="cyan" />
      </div>

      {/* Calendar + Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white mb-3">Calendar</div>

            <div className="emp-cal rounded-2xl border border-white/10 bg-slate-950/40">
              <Calendar
                value={selectedDate}
                onChange={(v) => setSelectedDate(v as Date)}
                onClickDay={(value, e) => openMenuForDate(value, e as any)}
                tileDisabled={({ date }) => isPast(date)}
                tileClassName={({ date }) => {
                  const key = formatDate(date);
                  const status = attendanceRecords[key]?.status;
                  return cn("transition", isSaturday(date) && "sat-white", tileStatusClass(status));
                }}
                // ✅ monthly system: track current month shown
                onActiveStartDateChange={({ activeStartDate: d }) => {
                  if (!d) return;
                  // force year display to 2026 month
                  setActiveStartDate(new Date(FIXED_YEAR, d.getMonth(), 1));
                }}
                // ✅ start month (2026)
                activeStartDate={activeStartDate}
              />
            </div>
          </div>

          {/* Monthly text summary (optional but helpful) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm space-y-1">
            <h4 className="text-lg font-extrabold text-white">📊 {monthLabel(selectedMonthIndex0)} {FIXED_YEAR}</h4>
            <p className="text-slate-200">✅ Present: {monthlySummary.present}</p>
            <p className="text-slate-200">❌ Absent: {monthlySummary.absent}</p>
            <p className="text-slate-200">📝 Leave: {monthlySummary.leave}</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-xl font-extrabold text-white">📅 {selectedDate.toDateString()}</h3>

            <div className="mt-3">
              <span
                className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-xl border", statusPillClass(dayData.status))}
              >
                <span className="font-semibold">
                  {dayData.status === "check-in" && "✅ Present (Checked In)"}
                  {dayData.status === "check-out" && "⏱️ Checked Out"}
                  {dayData.status === "absent" && "❌ Absent"}
                  {dayData.status === "leave" && "📝 Leave Requested"}
                  {!dayData.status && "No attendance marked yet."}
                </span>
              </span>
            </div>

            <div className="mt-4 text-sm text-slate-200 space-y-1">
              {dayData.checkIn && (
                <p>
                  Check-In: <span className="font-semibold text-white">{dayData.checkIn}</span>
                </p>
              )}
              {dayData.checkOut && (
                <p>
                  Check-Out: <span className="font-semibold text-white">{dayData.checkOut}</span>
                </p>
              )}
              {dayData.reason && (
                <p>
                  Reason: <span className="font-semibold text-white">{dayData.reason}</span>
                </p>
              )}
            </div>
          </div>

          {/* Recent */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-extrabold mb-4 text-white">📆 Recent Attendance</h3>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
              {Object.entries(attendanceRecords)
                .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                .slice(0, 30)
                .map(([date, data]) => (
                  <div
                    key={date}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/10 pb-2"
                  >
                    <span className="text-sm text-slate-200">{new Date(date).toDateString()}</span>

                    <span className={cn("text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl border", statusPillClass(data.status))}>
                      {data.status === "check-in" && `✅ Checked In (${data.checkIn || "-"})`}
                      {data.status === "check-out" && `⏱️ Checked Out (${data.checkOut || "-"})`}
                      {data.status === "absent" && "❌ Absent"}
                      {data.status === "leave" && `📝 Leave - ${data.reason || "No reason"}`}
                      {!data.status && "⏺ Not marked"}
                    </span>
                  </div>
                ))}

              {Object.keys(attendanceRecords).length === 0 && <p className="text-slate-300">No records found.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.date && (
        <ul
          ref={contextMenuRef}
          className="fixed bg-slate-950 text-white shadow-2xl rounded-2xl py-2 text-sm w-52 border border-white/10 z-[9999]"
          style={{
            top: `${Math.min(contextMenu.y, window.innerHeight - 220)}px`,
            left: `${Math.min(contextMenu.x, window.innerWidth - 230)}px`,
          }}
        >
          {isToday(contextMenu.date) ? (
            <>
              <MenuItem onClick={() => handleOptionSelect("check-in")} label="✅ Check In" />
              <MenuItem onClick={() => handleOptionSelect("check-out")} label="⏱️ Check Out" />
            </>
          ) : (
            <>
              <DisabledItem label="✅ Check In (Today only)" />
              <DisabledItem label="⏱️ Check Out (Today only)" />
            </>
          )}

          <MenuItem onClick={() => handleOptionSelect("absent")} label="❌ Mark Absent" />
          <MenuItem onClick={() => handleOptionSelect("request-leave")} label="📝 Request Leave" />
          <MenuItem onClick={() => handleOptionSelect("clear")} label="🗑️ Clear Record" />
        </ul>
      )}

      {/* Leave Modal */}
      {showLeaveDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-white">
              📝 Leave Request for {contextMenu.date?.toDateString()}
            </h3>

            <textarea
              className="mt-4 w-full p-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-400/30"
              rows={4}
              placeholder="Enter reason for leave..."
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowLeaveDialog(false);
                  setLeaveReason("");
                }}
                className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 text-white"
              >
                Cancel
              </button>

              <button
                onClick={submitLeaveRequest}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-white"
              >
                ✅ Send to HR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- UI Helpers ---------- */
function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li className="px-4 py-2 hover:bg-white/10 cursor-pointer select-none" onClick={onClick}>
      {label}
    </li>
  );
}

function DisabledItem({ label }: { label: string }) {
  return <li className="px-4 py-2 text-slate-500 cursor-not-allowed select-none">{label}</li>;
}
