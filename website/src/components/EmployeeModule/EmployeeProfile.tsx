// import { useEffect, useMemo, useState } from "react";

// /* ---------------- Types ---------------- */
// type EmployeeData = {
//   employeeId: string;
//   companyId: string;
//   name: string;
//   role: string;
//   department: string;
//   email: string;
//   phone: string;
//   salary: number;
//   dateOfJoining?: string;
// };

// type PaymentRow = {
//   month: string;
//   year: number;
//   basic: number;
//   allowances: number;
//   deductions: number;
// };

// type AttendanceRow = {
//   month: string;
//   year: number;
//   present: number;
//   absent: number;
//   leaves: number;
// };

// type View = "overview" | "payments" | "attendance";

// /* ---------------- Utils ---------------- */
// const LOGIN_KEY = "EmployeeLoginId";
// const cn = (...x: Array<string | false | null | undefined>) => x.filter(Boolean).join(" ");
// const formatINR = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// const generateEmployeeName = (id = "") =>
//   id ? id.replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Employee";

// /* ---------------- 2026 Sunday Calculation (Locked) ---------------- */
// const FIXED_YEAR = 2026;

// const MONTH_INDEX: Record<string, number> = {
//   Jan: 0,
//   Feb: 1,
//   Mar: 2,
//   Apr: 3,
//   May: 4,
//   Jun: 5,
//   Jul: 6,
//   Aug: 7,
//   Sep: 8,
//   Oct: 9,
//   Nov: 10,
//   Dec: 11,
// };

// function daysInMonth2026(month: string) {
//   const m = MONTH_INDEX[month] ?? 0;
//   return new Date(FIXED_YEAR, m + 1, 0).getDate();
// }

// function countSundays2026(month: string) {
//   const m = MONTH_INDEX[month] ?? 0;
//   const totalDays = daysInMonth2026(month);
//   let sundays = 0;

//   for (let day = 1; day <= totalDays; day++) {
//     // UTC-safe to avoid timezone shifting
//     const date = new Date(Date.UTC(FIXED_YEAR, m, day));
//     if (date.getUTCDay() === 0) sundays++;
//   }
//   return sundays;
// }

// function workingDays2026(month: string) {
//   return daysInMonth2026(month) - countSundays2026(month);
// }

// /* ---------------- Mock Data ---------------- */
// const employeeMock: EmployeeData = {
//   employeeId: "EMP-001",
//   companyId: "COMP-001",
//   name: "Rahul Sharma",
//   role: "Developer",
//   department: "IT",
//   email: "rahul@example.com",
//   phone: "+91 9876543210",
//   salary: 18000,
//   dateOfJoining: "01-Jan-2025",
// };

// const payments: PaymentRow[] = [
//   { month: "Jan", year: 2026, basic: 18000, allowances: 2000, deductions: 500 },
//   { month: "Feb", year: 2026, basic: 18000, allowances: 2200, deductions: 500 },
//   { month: "Mar", year: 2026, basic: 18000, allowances: 2500, deductions: 500 },
// ];

// const attendance: AttendanceRow[] = [
//   { month: "Jan", year: 2026, present: 22, absent: 2, leaves: 1 },
//   { month: "Feb", year: 2026, present: 20, absent: 3, leaves: 2 },
//   { month: "Mar", year: 2026, present: 23, absent: 1, leaves: 1 },
// ];

// /* ---------------- Helpers ---------------- */
// function keyOf(m: string, y: number) {
//   return `${m}-${y}`;
// }

// function uniqueMonthYearFromData(p: PaymentRow[], a: AttendanceRow[]) {
//   const set = new Map<string, { month: string; year: number }>();

//   for (const x of p) set.set(keyOf(x.month, x.year), { month: x.month, year: x.year });
//   for (const x of a) set.set(keyOf(x.month, x.year), { month: x.month, year: x.year });

//   const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
//   return Array.from(set.values()).sort((u, v) => {
//     if (u.year !== v.year) return u.year - v.year;
//     return monthOrder.indexOf(u.month) - monthOrder.indexOf(v.month);
//   });
// }

// /* ---------------- Component ---------------- */
// export default function EmployeeProfile() {
//   const [view, setView] = useState<View>("overview");
//   const [loginId, setLoginId] = useState(() => localStorage.getItem(LOGIN_KEY) || "");

//   useEffect(() => {
//     const sync = () => setLoginId(localStorage.getItem(LOGIN_KEY) || "");
//     window.addEventListener("focus", sync);
//     window.addEventListener("storage", sync);
//     return () => {
//       window.removeEventListener("focus", sync);
//       window.removeEventListener("storage", sync);
//     };
//   }, []);

//   const employee = useMemo<EmployeeData>(() => {
//     if (!loginId) return employeeMock;
//     return { ...employeeMock, employeeId: loginId, name: generateEmployeeName(loginId) };
//   }, [loginId]);

//   const paymentNet = useMemo(
//     () =>
//       payments.map((p) => ({
//         ...p,
//         net: p.basic + p.allowances - p.deductions,
//       })),
//     []
//   );

//   const monthYearOptions = useMemo(() => uniqueMonthYearFromData(payments, attendance), []);

//   // Default selected month = latest available
//   const [selectedKey, setSelectedKey] = useState<string>(() => {
//     const last = monthYearOptions[monthYearOptions.length - 1];
//     return last ? keyOf(last.month, last.year) : "Jan-2026";
//   });

//   useEffect(() => {
//     if (!monthYearOptions.length) return;
//     const exists = monthYearOptions.some((o) => keyOf(o.month, o.year) === selectedKey);
//     if (!exists) {
//       const last = monthYearOptions[monthYearOptions.length - 1];
//       setSelectedKey(keyOf(last.month, last.year));
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [monthYearOptions.length]);

//   const selectedMonthYear = useMemo(() => {
//     const found = monthYearOptions.find((o) => keyOf(o.month, o.year) === selectedKey);
//     return found || monthYearOptions[monthYearOptions.length - 1] || { month: "Jan", year: 2026 };
//   }, [monthYearOptions, selectedKey]);

//   const selectedPayment = useMemo(() => {
//     return paymentNet.find((p) => p.month === selectedMonthYear.month && p.year === selectedMonthYear.year);
//   }, [paymentNet, selectedMonthYear.month, selectedMonthYear.year]);

//   const selectedAttendance = useMemo(() => {
//     return attendance.find((a) => a.month === selectedMonthYear.month && a.year === selectedMonthYear.year);
//   }, [selectedMonthYear.month, selectedMonthYear.year]);

//   // ✅ 2026 locked month math
//   const monthDays = useMemo(() => daysInMonth2026(selectedMonthYear.month), [selectedMonthYear.month]);
//   const monthSundays = useMemo(() => countSundays2026(selectedMonthYear.month), [selectedMonthYear.month]);
//   const monthWorkingDays = useMemo(() => workingDays2026(selectedMonthYear.month), [selectedMonthYear.month]);

//   // ✅ recorded totals (present+absent+leave)
//   const monthRecordedDays = useMemo(() => {
//     if (!selectedAttendance) return 0;
//     return selectedAttendance.present + selectedAttendance.absent + selectedAttendance.leaves;
//   }, [selectedAttendance]);

//   // ✅ Attendance % out of WORKING days
//   const monthAttendancePct = useMemo(() => {
//     if (!monthWorkingDays) return 0;
//     return selectedAttendance ? Math.round((selectedAttendance.present / monthWorkingDays) * 100) : 0;
//   }, [selectedAttendance, monthWorkingDays]);

//   return (
//     <div className="space-y-6">
//       {/* ================= HEADER ================= */}
//       <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
//         <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
//           <div className="flex items-center gap-4">
//             <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/10 grid place-items-center text-xl font-extrabold text-white">
//               {(employee.name || "E").charAt(0).toUpperCase()}
//             </div>
//             <div className="min-w-0">
//               <h2 className="text-xl font-extrabold text-white truncate">{employee.name}</h2>
//               <p className="text-sm text-slate-300 truncate">
//                 {employee.role} • {employee.department}
//               </p>
//               <p className="text-xs text-slate-400 truncate">
//                 {employee.employeeId} • {employee.companyId}
//               </p>
//             </div>
//           </div>

//           {/* Month selector + KPIs */}
//           <div className="flex flex-col sm:flex-row sm:items-center gap-4">
//             <MonthPicker value={selectedKey} onChange={setSelectedKey} options={monthYearOptions} />

//             <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
//               <Stat label="Month" value={`${selectedMonthYear.month} ${FIXED_YEAR}`} />
//               <Stat label="Net Pay (Monthly)" value={selectedPayment ? formatINR(selectedPayment.net) : "—"} />
//               <Stat label="Attendance % (Monthly)" value={selectedAttendance ? `${monthAttendancePct}%` : "—"} />
//             </div>
//           </div>
//         </div>

//         {/* ✅ Cards like screenshot: Month Days + Present + Absent + Leave */}
//         <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
//           <MiniKpi label="Month Days" value={String(monthDays)} tone="cyan" />
//           <MiniKpi label="Sundays (Holiday)" value={String(monthSundays)} tone="amber" />
//           <MiniKpi label="Working Days" value={String(monthWorkingDays)} tone="emerald" />

//           <MiniKpi
//             label="Present"
//             value={selectedAttendance ? String(selectedAttendance.present) : "—"}
//             tone="emerald"
//           />
//           <MiniKpi
//             label="Absent"
//             value={selectedAttendance ? String(selectedAttendance.absent) : "—"}
//             tone="rose"
//           />
//           <MiniKpi
//             label="Leave"
//             value={selectedAttendance ? String(selectedAttendance.leaves) : "—"}
//             tone="amber"
//           />

         
//         </div>
//       </div>

//       {/* ================= TABS ================= */}
//       <div className="border-b border-white/10 flex gap-8 px-2">
//         {(["overview", "payments", "attendance"] as View[]).map((t) => (
//           <button
//             key={t}
//             onClick={() => setView(t)}
//             className={cn(
//               "pb-3 text-sm font-semibold transition",
//               view === t ? "text-white border-b-2 border-white" : "text-slate-400 hover:text-white"
//             )}
//           >
//             {t === "overview" && "Overview (Monthly)"}
//             {t === "payments" && "Salary (Monthly)"}
//             {t === "attendance" && "Attendance (Monthly)"}
//           </button>
//         ))}
//       </div>

//       {/* ================= OVERVIEW ================= */}
//       {view === "overview" && (
//         <div className="grid lg:grid-cols-2 gap-6">
//           <InfoCard title="Employee Information">
//             <Row label="Email" value={employee.email} />
//             <Row label="Phone" value={employee.phone} />
//             <Row label="Department" value={employee.department} />
//             <Row label="Monthly Salary (Base)" value={formatINR(employee.salary)} />
//             <Row label="Date of Joining" value={employee.dateOfJoining || "—"} />

//             <div className="pt-3 border-t border-white/10" />

//             <Row label="Selected Month" value={`${selectedMonthYear.month} ${FIXED_YEAR}`} />
//             <Row label="Month Days" value={monthDays} />
//             <Row label="Sundays (Holiday)" value={monthSundays} />
//             <Row label="Working Days" value={monthWorkingDays} />
//           </InfoCard>

//           <InfoCard title="Attendance Summary (Monthly)">
//             {selectedAttendance ? (
//               <>
//                 <Bar label="Present" value={selectedAttendance.present} max={monthWorkingDays || 1} color="bg-emerald-500" />
//                 <Bar label="Absent" value={selectedAttendance.absent} max={monthWorkingDays || 1} color="bg-rose-500" />
//                 <Bar label="Leave" value={selectedAttendance.leaves} max={monthWorkingDays || 1} color="bg-amber-500" />

//                 <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4">
//                   <div className="flex items-center justify-between">
//                     <span className="text-xs text-slate-400">Monthly Attendance</span>
//                     <span className="text-white font-extrabold">{monthAttendancePct}%</span>
//                   </div>
//                   <div className="mt-2 text-[11px] text-slate-500">
//                     {selectedAttendance.present} present / {monthWorkingDays} working days (Sunday excluded)
//                   </div>
//                 </div>
//               </>
//             ) : (
//               <EmptyState text="No attendance data for selected month." />
//             )}
//           </InfoCard>
//         </div>
//       )}

//       {/* ================= PAYMENTS ================= */}
//       {view === "payments" && (
//         <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
//           <div className="flex items-center justify-between gap-3">
//             <h3 className="text-sm font-bold text-white">Salary Details (Monthly)</h3>
//             <div className="text-xs text-slate-400">{selectedMonthYear.month} {FIXED_YEAR}</div>
//           </div>

//           <div className="mt-5">
//             {selectedPayment ? (
//               <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
//                 <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
//                   <div>
//                     <div className="text-white font-extrabold text-lg">Net Pay: {formatINR(selectedPayment.net)}</div>
//                     <div className="mt-1 text-xs text-slate-400">{selectedPayment.month} {selectedPayment.year}</div>
//                   </div>

//                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:max-w-[520px]">
//                     <MiniKpi label="Basic" value={formatINR(selectedPayment.basic)} tone="cyan" />
//                     <MiniKpi label="Allowances" value={formatINR(selectedPayment.allowances)} tone="emerald" />
//                     <MiniKpi label="Deductions" value={formatINR(selectedPayment.deductions)} tone="rose" />
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <EmptyState text="No payment data for selected month." />
//             )}
//           </div>
//         </div>
//       )}

//       {/* ================= ATTENDANCE ================= */}
//       {view === "attendance" && (
//         <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
//           <div className="flex items-center justify-between gap-3">
//             <h3 className="text-sm font-bold text-white">Attendance Breakdown (Monthly)</h3>
//             <div className="text-xs text-slate-400">{selectedMonthYear.month} {FIXED_YEAR}</div>
//           </div>

//           <div className="mt-5">
//             {selectedAttendance ? (
//               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//                 <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
//                   <div className="text-white font-bold">{selectedAttendance.month} {selectedAttendance.year}</div>

//                   <div className="mt-4 space-y-2">
//                     <Row label="Month Days" value={monthDays} />
//                     <Row label="Sundays (Holiday)" value={monthSundays} />
//                     <Row label="Working Days" value={monthWorkingDays} />
//                     <div className="pt-2 border-t border-white/10" />
//                     <Row label="Present" value={selectedAttendance.present} />
//                     <Row label="Absent" value={selectedAttendance.absent} />
//                     <Row label="Leave" value={selectedAttendance.leaves} />
//                   </div>
//                 </div>

//                 <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
//                   <div className="text-white font-bold">Monthly Bars (Out of Working Days)</div>

//                   <div className="mt-4 space-y-3">
//                     <Bar label="Present" value={selectedAttendance.present} max={monthWorkingDays || 1} color="bg-emerald-500" />
//                     <Bar label="Absent" value={selectedAttendance.absent} max={monthWorkingDays || 1} color="bg-rose-500" />
//                     <Bar label="Leave" value={selectedAttendance.leaves} max={monthWorkingDays || 1} color="bg-amber-500" />
//                   </div>

//                   <div className="mt-4 text-right">
//                     <div className="text-xs text-slate-400">Attendance %</div>
//                     <div className="text-xl font-extrabold text-white">{monthAttendancePct}%</div>
//                     <div className="mt-1 text-[11px] text-slate-500">present / working days (Sunday excluded)</div>
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <EmptyState text="No attendance data for selected month." />
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// /* ---------------- Small Components ---------------- */
// function Stat({ label, value }: { label: string; value: string }) {
//   return (
//     <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
//       <p className="text-xs text-slate-400">{label}</p>
//       <p className="text-base sm:text-lg font-extrabold text-white truncate">{value}</p>
//     </div>
//   );
// }

// function MiniKpi({
//   label,
//   value,
//   tone = "cyan",
// }: {
//   label: string;
//   value: string;
//   tone?: "cyan" | "emerald" | "rose" | "amber";
// }) {
//   const ring =
//     tone === "emerald"
//       ? "border-emerald-400/20"
//       : tone === "rose"
//       ? "border-rose-400/20"
//       : tone === "amber"
//       ? "border-amber-400/20"
//       : "border-cyan-400/20";

//   const glow =
//     tone === "emerald"
//       ? "bg-[radial-gradient(circle_at_30%_10%,rgba(34,197,94,0.18),transparent_55%)]"
//       : tone === "rose"
//       ? "bg-[radial-gradient(circle_at_30%_10%,rgba(244,63,94,0.18),transparent_55%)]"
//       : tone === "amber"
//       ? "bg-[radial-gradient(circle_at_30%_10%,rgba(245,158,11,0.18),transparent_55%)]"
//       : "bg-[radial-gradient(circle_at_30%_10%,rgba(56,189,248,0.18),transparent_55%)]";

//   return (
//     <div className={cn("relative overflow-hidden rounded-2xl border bg-white/5 px-4 py-3", ring)}>
//       <div className={cn("absolute inset-0 opacity-80", glow)} />
//       <div className="relative">
//         <div className="text-xs text-slate-400">{label}</div>
//         <div className="mt-1 text-lg font-extrabold text-white truncate">{value}</div>
//       </div>
//     </div>
//   );
// }

// function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
//   return (
//     <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
//       <h3 className="text-sm font-bold text-white mb-4">{title}</h3>
//       <div className="space-y-2">{children}</div>
//     </div>
//   );
// }

// function Row({ label, value }: { label: string; value: any }) {
//   return (
//     <div className="flex items-center justify-between gap-3 text-sm">
//       <span className="text-slate-400">{label}</span>
//       <span className="text-white font-medium">{value}</span>
//     </div>
//   );
// }

// function Bar({
//   label,
//   value,
//   max,
//   color,
// }: {
//   label: string;
//   value: number;
//   max: number;
//   color: string;
// }) {
//   const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
//   return (
//     <div>
//       <div className="flex justify-between text-xs mb-1">
//         <span className="text-slate-400">{label}</span>
//         <span className="text-white">
//           {value} • {pct}%
//         </span>
//       </div>
//       <div className="h-2 bg-white/10 rounded-full overflow-hidden">
//         <div className={cn("h-2 rounded-full", color)} style={{ width: `${pct}%` }} />
//       </div>
//     </div>
//   );
// }

// function EmptyState({ text }: { text: string }) {
//   return (
//     <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-center">
//       <div className="text-sm font-semibold text-white">No Data</div>
//       <div className="mt-1 text-xs text-slate-400">{text}</div>
//     </div>
//   );
// }

// function MonthPicker({
//   value,
//   onChange,
//   options,
// }: {
//   value: string;
//   onChange: (v: string) => void;
//   options: { month: string; year: number }[];
// }) {
//   return (
//     <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
//       <div className="text-[11px] text-slate-400 mb-1">Select Month</div>
//       <select
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className="w-full bg-transparent text-white text-sm font-semibold outline-none"
//       >
//         {options.map((o) => {
//           const k = `${o.month}-${o.year}`;
//           return (
//             <option key={k} value={k} className="bg-slate-900 text-white">
//               {o.month} {o.year}
//             </option>
//           );
//         })}
//       </select>
//     </div>
//   );
// }


import { useEffect, useMemo, useState } from "react";

/* ---------------- Types ---------------- */
type EmployeeData = {
  employeeId: string;
  companyId: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  salary: number;
  dateOfJoining?: string;
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

type View = "overview" | "payments" | "attendance";

/* ---------------- Utils ---------------- */
const LOGIN_KEY = "EmployeeLoginId";
const cn = (...x: Array<string | false | null | undefined>) => x.filter(Boolean).join(" ");
const formatINR = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const generateEmployeeName = (id = "") =>
  id ? id.replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Employee";

/* ---------------- 2026 Sunday Calculation (Locked) ---------------- */
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

function daysInMonth2026(month: string) {
  const m = MONTH_INDEX[month] ?? 0;
  return new Date(FIXED_YEAR, m + 1, 0).getDate();
}

function countSundays2026(month: string) {
  const m = MONTH_INDEX[month] ?? 0;
  const totalDays = daysInMonth2026(month);
  let sundays = 0;

  for (let day = 1; day <= totalDays; day++) {
    // UTC-safe to avoid timezone shifting
    const date = new Date(Date.UTC(FIXED_YEAR, m, day));
    if (date.getUTCDay() === 0) sundays++;
  }
  return sundays;
}

function workingDays2026(month: string) {
  return daysInMonth2026(month) - countSundays2026(month);
}

/* ---------------- Mock Data ---------------- */
const employeeMock: EmployeeData = {
  employeeId: "EMP-001",
  companyId: "COMP-001",
  name: "Rahul Sharma",
  role: "Developer",
  department: "IT",
  email: "rahul@example.com",
  phone: "+91 9876543210",
  salary: 18000,
  dateOfJoining: "01-Jan-2025",
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

/* ---------------- Helpers ---------------- */
function keyOf(m: string, y: number) {
  return `${m}-${y}`;
}

function uniqueMonthYearFromData(p: PaymentRow[], a: AttendanceRow[]) {
  const set = new Map<string, { month: string; year: number }>();

  for (const x of p) set.set(keyOf(x.month, x.year), { month: x.month, year: x.year });
  for (const x of a) set.set(keyOf(x.month, x.year), { month: x.month, year: x.year });

  const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Array.from(set.values()).sort((u, v) => {
    if (u.year !== v.year) return u.year - v.year;
    return monthOrder.indexOf(u.month) - monthOrder.indexOf(v.month);
  });
}

/* ---------------- Component ---------------- */
export default function EmployeeProfile() {
  const [view, setView] = useState<View>("overview");
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

  const paymentNet = useMemo(
    () =>
      payments.map((p) => ({
        ...p,
        net: p.basic + p.allowances - p.deductions,
      })),
    []
  );

  const monthYearOptions = useMemo(() => uniqueMonthYearFromData(payments, attendance), []);

  // Default selected month = latest available
  const [selectedKey, setSelectedKey] = useState<string>(() => {
    const last = monthYearOptions[monthYearOptions.length - 1];
    return last ? keyOf(last.month, last.year) : "Jan-2026";
  });

  useEffect(() => {
    if (!monthYearOptions.length) return;
    const exists = monthYearOptions.some((o) => keyOf(o.month, o.year) === selectedKey);
    if (!exists) {
      const last = monthYearOptions[monthYearOptions.length - 1];
      setSelectedKey(keyOf(last.month, last.year));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthYearOptions.length]);

  const selectedMonthYear = useMemo(() => {
    const found = monthYearOptions.find((o) => keyOf(o.month, o.year) === selectedKey);
    return found || monthYearOptions[monthYearOptions.length - 1] || { month: "Jan", year: 2026 };
  }, [monthYearOptions, selectedKey]);

  const selectedPayment = useMemo(() => {
    return paymentNet.find((p) => p.month === selectedMonthYear.month && p.year === selectedMonthYear.year);
  }, [paymentNet, selectedMonthYear.month, selectedMonthYear.year]);

  const selectedAttendance = useMemo(() => {
    return attendance.find((a) => a.month === selectedMonthYear.month && a.year === selectedMonthYear.year);
  }, [selectedMonthYear.month, selectedMonthYear.year]);

  // ✅ 2026 locked month math
  const monthDays = useMemo(() => daysInMonth2026(selectedMonthYear.month), [selectedMonthYear.month]);
  const monthSundays = useMemo(() => countSundays2026(selectedMonthYear.month), [selectedMonthYear.month]);
  const monthWorkingDays = useMemo(() => workingDays2026(selectedMonthYear.month), [selectedMonthYear.month]);

  // ✅ Attendance % out of WORKING days (Sunday excluded)
  const monthAttendancePct = useMemo(() => {
    if (!monthWorkingDays) return 0;
    return selectedAttendance ? Math.round((selectedAttendance.present / monthWorkingDays) * 100) : 0;
  }, [selectedAttendance, monthWorkingDays]);

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
              <h2 className="text-xl font-extrabold text-white truncate">{employee.name}</h2>
              <p className="text-sm text-slate-300 truncate">
                {employee.role} • {employee.department}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {employee.employeeId} • {employee.companyId}
              </p>
            </div>
          </div>

          {/* Month selector + KPIs */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <MonthPicker value={selectedKey} onChange={setSelectedKey} options={monthYearOptions} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Stat label="Month" value={`${selectedMonthYear.month} ${FIXED_YEAR}`} />
              <Stat label="Net Pay (Monthly)" value={selectedPayment ? formatINR(selectedPayment.net) : "—"} />
              <Stat label="Attendance % (Monthly)" value={selectedAttendance ? `${monthAttendancePct}%` : "—"} />
            </div>
          </div>
        </div>

        {/* ✅ Cards like screenshot: Month Days + Present + Absent + Leave */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          <MiniKpi label="Month Days" value={String(monthDays)} tone="cyan" />
          <MiniKpi label="Sundays (Holiday)" value={String(monthSundays)} tone="amber" />
          <MiniKpi label="Working Days" value={String(monthWorkingDays)} tone="emerald" />

          <MiniKpi label="Present" value={selectedAttendance ? String(selectedAttendance.present) : "—"} tone="emerald" />
          <MiniKpi label="Absent" value={selectedAttendance ? String(selectedAttendance.absent) : "—"} tone="rose" />
          <MiniKpi label="Leave" value={selectedAttendance ? String(selectedAttendance.leaves) : "—"} tone="amber" />
        </div>
      </div>

      {/* ================= TABS ================= */}
      <div className="border-b border-white/10 flex gap-8 px-2">
        {(["overview", "payments", "attendance"] as View[]).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={cn(
              "pb-3 text-sm font-semibold transition",
              view === t ? "text-white border-b-2 border-white" : "text-slate-400 hover:text-white"
            )}
          >
            {t === "overview" && "Overview (Monthly)"}
            {t === "payments" && "Salary (Monthly)"}
            {t === "attendance" && "Attendance (Monthly)"}
          </button>
        ))}
      </div>

      {/* ================= OVERVIEW ================= */}
      {view === "overview" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <InfoCard title="Employee Information">
            <Row label="Email" value={employee.email} />
            <Row label="Phone" value={employee.phone} />
            <Row label="Department" value={employee.department} />
            <Row label="Monthly Salary (Base)" value={formatINR(employee.salary)} />
            <Row label="Date of Joining" value={employee.dateOfJoining || "—"} />

            <div className="pt-3 border-t border-white/10" />

            <Row label="Selected Month" value={`${selectedMonthYear.month} ${FIXED_YEAR}`} />
            <Row label="Month Days" value={monthDays} />
            <Row label="Sundays (Holiday)" value={monthSundays} />
            <Row label="Working Days" value={monthWorkingDays} />
          </InfoCard>

          <InfoCard title="Attendance Summary (Monthly)">
            {selectedAttendance ? (
              <>
                <Bar label="Present" value={selectedAttendance.present} max={monthWorkingDays || 1} color="bg-emerald-500" />
                <Bar label="Absent" value={selectedAttendance.absent} max={monthWorkingDays || 1} color="bg-rose-500" />
                <Bar label="Leave" value={selectedAttendance.leaves} max={monthWorkingDays || 1} color="bg-amber-500" />

                <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Monthly Attendance</span>
                    <span className="text-white font-extrabold">{monthAttendancePct}%</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    {selectedAttendance.present} present / {monthWorkingDays} working days (Sunday excluded)
                  </div>
                </div>
              </>
            ) : (
              <EmptyState text="No attendance data for selected month." />
            )}
          </InfoCard>
        </div>
      )}

      {/* ================= PAYMENTS ================= */}
      {view === "payments" && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Salary Details (Monthly)</h3>
            <div className="text-xs text-slate-400">
              {selectedMonthYear.month} {FIXED_YEAR}
            </div>
          </div>

          <div className="mt-5">
            {selectedPayment ? (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="text-white font-extrabold text-lg">Net Pay: {formatINR(selectedPayment.net)}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {selectedPayment.month} {selectedPayment.year}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:max-w-[520px]">
                    <MiniKpi label="Basic" value={formatINR(selectedPayment.basic)} tone="cyan" />
                    <MiniKpi label="Allowances" value={formatINR(selectedPayment.allowances)} tone="emerald" />
                    <MiniKpi label="Deductions" value={formatINR(selectedPayment.deductions)} tone="rose" />
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text="No payment data for selected month." />
            )}
          </div>
        </div>
      )}

      {/* ================= ATTENDANCE ================= */}
      {view === "attendance" && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white">Attendance Breakdown (Monthly)</h3>
            <div className="text-xs text-slate-400">
              {selectedMonthYear.month} {FIXED_YEAR}
            </div>
          </div>

          <div className="mt-5">
            {selectedAttendance ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <div className="text-white font-bold">
                    {selectedAttendance.month} {selectedAttendance.year}
                  </div>

                  <div className="mt-4 space-y-2">
                    <Row label="Month Days" value={monthDays} />
                    <Row label="Sundays (Holiday)" value={monthSundays} />
                    <Row label="Working Days" value={monthWorkingDays} />
                    <div className="pt-2 border-t border-white/10" />
                    <Row label="Present" value={selectedAttendance.present} />
                    <Row label="Absent" value={selectedAttendance.absent} />
                    <Row label="Leave" value={selectedAttendance.leaves} />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <div className="text-white font-bold">Monthly Bars (Out of Working Days)</div>

                  <div className="mt-4 space-y-3">
                    <Bar label="Present" value={selectedAttendance.present} max={monthWorkingDays || 1} color="bg-emerald-500" />
                    <Bar label="Absent" value={selectedAttendance.absent} max={monthWorkingDays || 1} color="bg-rose-500" />
                    <Bar label="Leave" value={selectedAttendance.leaves} max={monthWorkingDays || 1} color="bg-amber-500" />
                  </div>

                  <div className="mt-4 text-right">
                    <div className="text-xs text-slate-400">Attendance %</div>
                    <div className="text-xl font-extrabold text-white">{monthAttendancePct}%</div>
                    <div className="mt-1 text-[11px] text-slate-500">present / working days (Sunday excluded)</div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text="No attendance data for selected month." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Small Components ---------------- */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-base sm:text-lg font-extrabold text-white truncate">{value}</p>
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
        <div className="text-xs text-slate-400">{label}</div>
        <div className="mt-1 text-lg font-extrabold text-white truncate">{value}</div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-sm font-bold text-white mb-4">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
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

function MonthPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { month: string; year: number }[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[11px] text-slate-400 mb-1">Select Month</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-white text-sm font-semibold outline-none"
      >
        {options.map((o) => {
          const k = `${o.month}-${o.year}`;
          return (
            <option key={k} value={k} className="bg-slate-900 text-white">
              {o.month} {o.year}
            </option>
          );
        })}
      </select>
    </div>
  );
}
