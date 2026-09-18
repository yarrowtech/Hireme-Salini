import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Clock3,
  Download,
  Edit3,
  FileText,
  IndianRupee,
  Search,
  Timer,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import companyApi from "../../api/company.api.js";

type EmployeeStatus = "ACTIVE" | "INACTIVE";

type Employee = {
  id: string;
  employeeId: string;
  companyCode: string;
  name: string;
  role: string;
  department: string;
  contact: string;
  email: string;
  phone: string;
  photoUrl: string;
  status: EmployeeStatus;
  employmentType: string;
  joiningDate: string;
  manager: string;
  workLocation: string;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
};

type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "HALF_DAY"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEKLY_OFF"
  | "WORK_FROM_HOME"
  | "MISSING_CHECKOUT";

type EmployeeForm = Employee & {
  salaryBasic: string;
  salaryHra: string;
  salaryAllowance: string;
  salaryDeductions: string;
  overtimeRatePerHour: string;
};
type AttendanceQuickEdit = { status: AttendanceStatus | "NOT_MARKED"; checkIn: string; checkOut: string };
type AttendanceView = "daily" | "monthly" | "yearly";

const cn = (...a: Array<string | false | undefined | null>) => a.filter(Boolean).join(" ");
const fmtINR = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const DEFAULT_ENTRY_TIME = "11:00";
const DEFAULT_EXIT_TIME = "18:00";
const LATE_GRACE_MINUTES = 10;

const attendanceOptions: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "ON_LEAVE",
  "HOLIDAY",
  "WEEKLY_OFF",
  "WORK_FROM_HOME",
  "MISSING_CHECKOUT",
];

const attendanceLabels: Record<AttendanceStatus | "NOT_MARKED", string> = {
  NOT_MARKED: "Not marked",
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  HALF_DAY: "Half day",
  ON_LEAVE: "On leave",
  HOLIDAY: "Holiday",
  WEEKLY_OFF: "Weekly off",
  WORK_FROM_HOME: "Work from home",
  MISSING_CHECKOUT: "Missing checkout",
};

function toText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDayName(date: string) {
  if (!date) return "-";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
}

function formatDate(date: string) {
  if (!date) return "-";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function monthLabel(month: string) {
  if (!month) return "-";
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function statusLabel(status: string) {
  return attendanceLabels[status as AttendanceStatus] || String(status || "Not marked").replace(/_/g, " ");
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function workedHours(record: any) {
  const direct = Number(record?.workedHours || 0);
  if (direct > 0) return `${direct.toFixed(direct % 1 ? 1 : 0)}h`;
  const [inH, inM] = String(record?.checkIn || "").split(":").map(Number);
  const [outH, outM] = String(record?.checkOut || "").split(":").map(Number);
  if ([inH, inM, outH, outM].some((v) => !Number.isFinite(v))) return "-";
  const minutes = outH * 60 + outM - (inH * 60 + inM);
  if (minutes <= 0) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function hmToMinutes(value: string) {
  const [hour, minute] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function getShiftStart(employee: Pick<Employee, "shiftStart">) {
  return employee.shiftStart || DEFAULT_ENTRY_TIME;
}

function getShiftEnd(employee: Pick<Employee, "shiftEnd">) {
  return employee.shiftEnd || DEFAULT_EXIT_TIME;
}

function deriveManualAttendance(employee: Pick<Employee, "shiftStart" | "shiftEnd">, draft: AttendanceQuickEdit) {
  const checkInMinutes = hmToMinutes(draft.checkIn);
  const shiftStartMinutes = hmToMinutes(getShiftStart(employee));
  const lateMinutes = checkInMinutes != null && shiftStartMinutes != null ? Math.max(0, checkInMinutes - shiftStartMinutes) : 0;
  const normalTimedStatus = ["PRESENT", "LATE", "HALF_DAY", "MISSING_CHECKOUT"].includes(draft.status);

  if (normalTimedStatus && draft.checkIn && lateMinutes > LATE_GRACE_MINUTES) {
    return { status: "LATE" as AttendanceStatus, lateMinutes };
  }

  return { status: draft.status === "NOT_MARKED" ? "PRESENT" as AttendanceStatus : draft.status, lateMinutes: 0 };
}

function timeParts(value: string) {
  const [rawHour, rawMinute] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(rawHour) || !Number.isFinite(rawMinute)) return { hour: "", minute: "00", meridiem: "AM" };
  const meridiem = rawHour >= 12 ? "PM" : "AM";
  const hour12 = rawHour % 12 || 12;
  return { hour: String(hour12).padStart(2, "0"), minute: String(rawMinute).padStart(2, "0"), meridiem };
}

function fromTimeParts(hour: string, minute: string, meridiem: string) {
  const h = Number(hour);
  const m = Number(minute);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 1 || h > 12 || m < 0 || m > 59) return "";
  const hour24 = meridiem === "PM" ? (h % 12) + 12 : h % 12;
  return `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function displayTime(value: string) {
  if (!value) return "--:--";
  const parts = timeParts(value);
  return `${parts.hour}:${parts.minute} ${parts.meridiem}`;
}

function salaryGross(row: any) {
  return Number(row?.basic || 0) + Number(row?.hra || 0) + Number(row?.conveyance || 0) + Number(row?.medicalAllowance || 0) + Number(row?.specialAllowance || 0) + Number(row?.bonus || 0);
}

function toEmployee(e: any, idx: number, companyCode: string): EmployeeForm {
  const id = toText(e?.id || e?.employeeId, `EMP-${idx + 1}`);
  const phone = toText(e?.phone || e?.contact);
  return {
    id,
    employeeId: toText(e?.employeeId || id, id),
    companyCode: toText(e?.companyCode, companyCode),
    name: toText(e?.name || e?.employeeName, "Employee"),
    role: toText(e?.designation || e?.role, "Employee"),
    department: toText(e?.department, "General"),
    contact: toText(e?.contact || phone || e?.email, "-"),
    email: toText(e?.email),
    phone,
    photoUrl: toText(e?.photoUrl),
    status: String(e?.status || "ACTIVE").toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    employmentType: toText(e?.employmentType),
    joiningDate: toText(e?.joiningDate),
    manager: toText(e?.manager),
    workLocation: toText(e?.workLocation),
    shiftName: toText(e?.shiftName),
    shiftStart: toText(e?.shiftStart),
    shiftEnd: toText(e?.shiftEnd),
    salaryBasic: "",
    salaryHra: "",
    salaryAllowance: "",
    salaryDeductions: "",
    overtimeRatePerHour: "",
  };
}

function blankEmployee(companyCode: string): EmployeeForm {
  return {
    id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    employeeId: "",
    companyCode,
    name: "",
    role: "",
    department: "",
    contact: "",
    email: "",
    phone: "",
    photoUrl: "",
    status: "ACTIVE",
    employmentType: "Full-time",
    joiningDate: "",
    manager: "",
    workLocation: "",
    shiftName: "",
    shiftStart: "",
    shiftEnd: "",
    salaryBasic: "",
    salaryHra: "",
    salaryAllowance: "",
    salaryDeductions: "",
    overtimeRatePerHour: "",
  };
}

export default function CompanyServiceAccess() {
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [employees, setEmployees] = useState<EmployeeForm[]>([]);
  const [attendanceByEmployee, setAttendanceByEmployee] = useState<Record<string, any>>({});
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, AttendanceQuickEdit>>({});
  // employeeIds whose dropdown/time was edited locally but not yet saved
  const [dirtyDrafts, setDirtyDrafts] = useState<Record<string, boolean>>({});
  const dirtyDraftsRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    dirtyDraftsRef.current = dirtyDrafts;
  }, [dirtyDrafts]);
  // employeeIds that just saved successfully, for a brief inline "Saved" flash
  const [savedFlash, setSavedFlash] = useState<Record<string, boolean>>({});
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [attendanceNotice, setAttendanceNotice] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(todayKey());
  const [attendanceView, setAttendanceView] = useState<AttendanceView>("daily");
  const [dailyTotals, setDailyTotals] = useState<any>({});
  const [monthlyRows, setMonthlyRows] = useState<any[]>([]);
  const [yearlyRows, setYearlyRows] = useState<any[]>([]);
  const [monthlyByEmployee, setMonthlyByEmployee] = useState<Record<string, any>>({});
  const [payrollByEmployee, setPayrollByEmployee] = useState<Record<string, any>>({});
  const [salaryByEmployee, setSalaryByEmployee] = useState<Record<string, any>>({});
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    department: "ALL",
    role: "ALL",
    status: "ALL",
    location: "ALL",
    employmentType: "ALL",
    joiningDate: "",
    payrollStatus: "ALL",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formIsNew, setFormIsNew] = useState(true);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [form, setForm] = useState<EmployeeForm>(blankEmployee(""));

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const resolvedCompanyId = await companyApi.resolveCompanyId();
      if (!resolvedCompanyId) {
        setError("Company account was not found. Please log in again.");
        return;
      }
      setCompanyId(resolvedCompanyId);
      const selectedMonth = attendanceDate.slice(0, 7);
      const selectedYear = attendanceDate.slice(0, 4);
      const [employeesRes, dashboardRes, attendanceRes, dailyRes, monthlyRes, yearlyRes, payrollRes, salaryRes] = await Promise.all([
        companyApi.getCompanyEmployees(resolvedCompanyId),
        companyApi.getCompanyDashboard(resolvedCompanyId).catch(() => null),
        companyApi.getCompanyAttendance(resolvedCompanyId, { month: selectedMonth }).catch(() => null),
        companyApi.getAttendanceDaily(resolvedCompanyId, { date: attendanceDate, limit: 1000 }).catch(() => null),
        companyApi.getAttendanceMonthly(resolvedCompanyId, { month: selectedMonth, limit: 1000 }).catch(() => null),
        companyApi.getAttendanceYearly(resolvedCompanyId, { year: selectedYear, limit: 1000 }).catch(() => null),
        companyApi.getCompanyPayroll(resolvedCompanyId, { month: selectedMonth }).catch(() => null),
        companyApi.getCompanySalaryStructures(resolvedCompanyId).catch(() => null),
      ]);
      const resolvedCompanyCode = String(
        employeesRes?.companyCode || dashboardRes?.company?.companyCode || dashboardRes?.serviceAccess?.companyCode || ""
      );
      setCompanyCode(resolvedCompanyCode);
      const list = Array.isArray(employeesRes?.employees) ? employeesRes.employees : [];
      setEmployees(list.map((employee: any, idx: number) => toEmployee(employee, idx, resolvedCompanyCode)));

      const records: any[] = Array.isArray(attendanceRes?.records) ? attendanceRes.records : [];
      const dayRows: any[] = Array.isArray(dailyRes?.rows) ? dailyRes.rows : [];
      setDailyTotals(dailyRes?.totals || {});
      setAttendanceByEmployee(
        dayRows.reduce((map: Record<string, any>, record: any) => {
          map[record.employeeId] = record;
          return map;
        }, {})
      );
      // Rebuild drafts from the server, but keep any in-progress local edits the
      // user has not saved yet (a save on one row must not wipe the others).
      setAttendanceDrafts((prev) => {
        const next: Record<string, AttendanceQuickEdit> = {};
        for (const record of dayRows) {
          const serverDraft: AttendanceQuickEdit = {
            status: record.status || "NOT_MARKED",
            checkIn: record.checkIn || "",
            checkOut: record.checkOut || "",
          };
          const keepLocal = !record.marked && dirtyDraftsRef.current[record.employeeId] && prev[record.employeeId];
          next[record.employeeId] = keepLocal ? prev[record.employeeId] : serverDraft;
        }
        return next;
      });
      const monthRows: any[] = Array.isArray(monthlyRes?.rows) ? monthlyRes.rows : [];
      setMonthlyRows(monthRows);
      setYearlyRows(Array.isArray(yearlyRes?.rows) ? yearlyRes.rows : []);
      setMonthlyByEmployee(
        monthRows.reduce((map: Record<string, any>, row: any) => {
          map[row.employeeId] = row;
          return map;
        }, {})
      );
      setCorrections(
        records.flatMap((record: any) =>
          (record.correctionRequests || [])
            .filter((request: any) => request.status === "PENDING")
            .map((request: any) => ({
              attendanceId: record._id,
              employeeId: record.employeeId,
              employeeName: record.employeeName || record.employeeId,
              date: record.date,
              currentStatus: record.status,
              request,
            }))
        )
      );
      setPayrollByEmployee(
        (payrollRes?.payrollRun?.items || []).reduce((map: Record<string, any>, item: any) => {
          map[item.employeeId] = item;
          return map;
        }, {})
      );
      setSalaryByEmployee(
        (salaryRes?.salaryStructures || []).reduce((map: Record<string, any>, row: any) => {
          if (!map[row.employeeId]) map[row.employeeId] = row;
          return map;
        }, {})
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load employee data.");
    } finally {
      setLoading(false);
    }
  }, [attendanceDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const optionSets = useMemo(() => {
    const uniq = (key: keyof Employee) => Array.from(new Set(employees.map((e) => e[key]).filter(Boolean))).sort();
    return {
      departments: uniq("department"),
      roles: uniq("role"),
      locations: uniq("workLocation"),
      employmentTypes: uniq("employmentType"),
    };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((employee) => {
      const payrollStatus = payrollByEmployee[employee.employeeId]?.status || "NOT_STARTED";
      const matchesQuery =
        !q ||
        [
          employee.employeeId,
          employee.name,
          employee.department,
          employee.role,
          employee.manager,
          employee.workLocation,
          employee.employmentType,
          payrollStatus,
          attendanceByEmployee[employee.employeeId]?.status,
          attendanceByEmployee[employee.employeeId]?.checkIn,
          attendanceByEmployee[employee.employeeId]?.checkOut,
          monthlyByEmployee[employee.employeeId]?.estimatedNet,
        ].some((v) => String(v || "").toLowerCase().includes(q));
      return (
        matchesQuery &&
        (filters.department === "ALL" || employee.department === filters.department) &&
        (filters.role === "ALL" || employee.role === filters.role) &&
        (filters.status === "ALL" || employee.status === filters.status) &&
        (filters.location === "ALL" || employee.workLocation === filters.location) &&
        (filters.employmentType === "ALL" || employee.employmentType === filters.employmentType) &&
        (!filters.joiningDate || employee.joiningDate === filters.joiningDate) &&
        (filters.payrollStatus === "ALL" || payrollStatus === filters.payrollStatus)
      );
    });
  }, [attendanceByEmployee, employees, filters, monthlyByEmployee, payrollByEmployee, query]);

  const filteredEmployeeIds = useMemo(() => new Set(filteredEmployees.map((employee) => employee.employeeId)), [filteredEmployees]);

  const filteredMonthlyRows = useMemo(
    () => monthlyRows.filter((row) => filteredEmployeeIds.has(String(row.employeeId))),
    [filteredEmployeeIds, monthlyRows]
  );

  const filteredYearlyRows = useMemo(
    () => yearlyRows.filter((row) => filteredEmployeeIds.has(String(row.employeeId))),
    [filteredEmployeeIds, yearlyRows]
  );

  const dashboardCards = useMemo(() => {
    const present = Number(dailyTotals.present ?? employees.filter((employee) => ["PRESENT", "LATE", "WORK_FROM_HOME"].includes(attendanceByEmployee[employee.employeeId]?.status)).length);
    const absent = Number(dailyTotals.absent ?? employees.filter((employee) => attendanceByEmployee[employee.employeeId]?.status === "ABSENT").length);
    const leave = Number(dailyTotals.onLeave ?? employees.filter((employee) => attendanceByEmployee[employee.employeeId]?.status === "ON_LEAVE").length);
    const awaiting = employees.filter((employee) => ["APPROVED", "PROCESSING"].includes(payrollByEmployee[employee.employeeId]?.status)).length;
    const failed = employees.filter((employee) => payrollByEmployee[employee.employeeId]?.status === "FAILED").length;
    const estimatedNet = employees.reduce((sum, employee) => sum + Number(monthlyByEmployee[employee.employeeId]?.estimatedNet || 0), 0);
    return { present, absent, leave, awaiting, failed, estimatedNet };
  }, [attendanceByEmployee, dailyTotals, employees, monthlyByEmployee, payrollByEmployee]);

  const saveEmployee = async () => {
    if (!form.id.trim() || !form.name.trim()) {
      alert("Employee ID and name are required.");
      return;
    }
    try {
      await companyApi.upsertCompanyEmployee(companyId, {
        ...form,
        employeeId: form.id,
        companyCode: form.companyCode || companyCode,
        contact: form.phone || form.contact || form.email,
      });
      const salaryPayload = {
        basic: Number(form.salaryBasic || 0),
        hra: Number(form.salaryHra || 0),
        specialAllowance: Number(form.salaryAllowance || 0),
        otherDeductions: Number(form.salaryDeductions || 0),
        overtimeRatePerHour: Number(form.overtimeRatePerHour || 0),
      };
      if (Object.values(salaryPayload).some((value) => value > 0)) {
        await companyApi.upsertCompanySalaryStructure(companyId, {
          employeeId: form.id,
          employeeName: form.name,
          effectiveFrom: form.joiningDate || todayKey(),
          currency: "INR",
          ...salaryPayload,
          createdBy: "Company HR",
          notes: "Saved from employee operations panel",
        });
      }
      setModalOpen(false);
      await refresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to save employee.");
    }
  };

  const setAttendanceDraft = (employeeId: string, patch: Partial<AttendanceQuickEdit>) => {
    setAttendanceDrafts((prev) => {
      const existing = prev[employeeId] || {
        status: attendanceByEmployee[employeeId]?.status || "PRESENT",
        checkIn: attendanceByEmployee[employeeId]?.checkIn || "",
        checkOut: attendanceByEmployee[employeeId]?.checkOut || "",
      };
      return { ...prev, [employeeId]: { ...existing, ...patch } };
    });
    setDirtyDrafts((prev) => ({ ...prev, [employeeId]: true }));
    setSavedFlash((prev) => (prev[employeeId] ? { ...prev, [employeeId]: false } : prev));
  };

  const setAttendanceTime = (employeeId: string, field: "checkIn" | "checkOut", value: string) => {
    const currentStatus = attendanceDrafts[employeeId]?.status || attendanceByEmployee[employeeId]?.status || "PRESENT";
    const nextStatus = ["PRESENT", "LATE", "HALF_DAY", "MISSING_CHECKOUT"].includes(currentStatus) ? "PRESENT" : currentStatus;
    setAttendanceDraft(employeeId, { [field]: value, status: nextStatus as AttendanceStatus });
  };

  const markAttendance = async (employee: Employee) => {
    const draft = attendanceDrafts[employee.employeeId] || {
      status: attendanceByEmployee[employee.employeeId]?.status || "PRESENT",
      checkIn: attendanceByEmployee[employee.employeeId]?.checkIn || "",
      checkOut: attendanceByEmployee[employee.employeeId]?.checkOut || "",
    };
    // An explicit save click means "mark this person" — default an untouched
    // row to PRESENT rather than silently doing nothing.
    const effectiveDraft: AttendanceQuickEdit =
      draft.status === "NOT_MARKED" ? { ...draft, status: "PRESENT" } : draft;
    const derived = deriveManualAttendance(employee, effectiveDraft);
    setAttendanceBusy(true);
    try {
      const res = await companyApi.upsertCompanyAttendance(companyId, {
        employeeId: employee.employeeId,
        employeeName: employee.name,
        department: employee.department,
        companyCode: employee.companyCode || companyCode,
        date: attendanceDate,
        status: derived.status,
        checkIn: effectiveDraft.checkIn,
        checkOut: effectiveDraft.checkOut,
        shiftName: employee.shiftName,
        shiftStart: getShiftStart(employee),
        shiftEnd: getShiftEnd(employee),
        workLocation: employee.workLocation,
        lateMinutes: derived.lateMinutes,
        mode: "MANUAL",
        markedBy: "Company HR",
      });
      const saved = res?.attendance;
      if (!saved?.employeeId) throw new Error(res?.message || "Attendance was not saved.");
      setAttendanceByEmployee((prev) => ({ ...prev, [saved.employeeId]: { ...saved, marked: true } }));
      setAttendanceDrafts((prev) => ({
        ...prev,
        [saved.employeeId]: {
          status: saved.status || "PRESENT",
          checkIn: saved.checkIn || "",
          checkOut: saved.checkOut || "",
        },
      }));
      setDirtyDrafts((prev) => {
        const next = { ...prev };
        delete next[saved.employeeId];
        return next;
      });
      setSavedFlash((prev) => ({ ...prev, [saved.employeeId]: true }));
      setAttendanceNotice(`Saved ${statusLabel(saved.status)} for ${employee.name} on ${attendanceDate}.`);
      window.setTimeout(() => {
        setSavedFlash((prev) => ({ ...prev, [saved.employeeId]: false }));
      }, 2500);
      await refresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to mark attendance.");
    } finally {
      setAttendanceBusy(false);
    }
  };

  const markAllPresent = async () => {
    const targets = filteredEmployees.filter((employee) => {
      const record = attendanceByEmployee[employee.employeeId];
      return !record?.marked;
    });
    if (!targets.length) {
      setAttendanceNotice("Everyone in the current list is already marked for this date.");
      return;
    }
    if (!window.confirm(`Mark ${targets.length} unmarked employee(s) as Present on ${attendanceDate}?`)) return;
    setAttendanceBusy(true);
    try {
      const res = await companyApi.bulkAttendance(companyId, {
        date: attendanceDate,
        status: "PRESENT",
        markedBy: "Company HR",
        entries: targets.map((employee) => ({
          employeeId: employee.employeeId,
          employeeName: employee.name,
          department: employee.department,
          companyCode: employee.companyCode || companyCode,
          status: "PRESENT",
          shiftName: employee.shiftName,
          shiftStart: getShiftStart(employee),
          shiftEnd: getShiftEnd(employee),
          workLocation: employee.workLocation,
          mode: "MANUAL",
        })),
      });
      setAttendanceNotice(`Marked ${res?.updated ?? targets.length} present${res?.failed ? `, ${res.failed} failed` : ""}.`);
      setDirtyDrafts({});
      await refresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to mark everyone present.");
    } finally {
      setAttendanceBusy(false);
    }
  };

  const toggleStatus = async (employee: Employee) => {
    try {
      await companyApi.upsertCompanyEmployee(companyId, {
        ...employee,
        id: employee.id,
        status: employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      });
      await refresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to update status.");
    }
  };

  const removeEmployee = async (employee: Employee) => {
    if (!window.confirm(`Delete ${employee.name} (${employee.employeeId})? This cannot be undone.`)) return;
    try {
      await companyApi.deleteCompanyEmployee(companyId, employee.employeeId);
      await refresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to delete employee.");
    }
  };

  const reviewCorrection = async (row: any, decision: "APPROVED" | "REJECTED") => {
    try {
      await companyApi.reviewAttendanceCorrection(companyId, row.attendanceId, row.request._id, {
        status: decision,
        reviewedBy: "Company HR",
      });
      await refresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to review correction.");
    }
  };

  const fillMissingAbsents = async () => {
    if (attendanceDate >= todayKey()) {
      alert("Auto absent can only be generated for a past date.");
      return;
    }
    try {
      const res = await companyApi.runAutoAbsent(companyId, { date: attendanceDate });
      await refresh();
      alert(`Saved ${res?.inserted || 0} missing absent record(s) for ${attendanceDate}.`);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to save missing absent records.");
    }
  };

  const exportAttendanceCsv = () => {
    if (attendanceView === "monthly") {
      const days = Array.from({ length: Number(monthlyRows[0]?.days ? Object.keys(monthlyRows[0].days).length : 31) }, (_, index) => String(index + 1).padStart(2, "0"));
      downloadCsv(
        `attendance-monthly-${attendanceDate.slice(0, 7)}.csv`,
        [
          "Employee ID",
          "Name",
          "Department",
          "Role",
          "Month",
          "Working Days",
          "Payable Days",
          "Present",
          "Late",
          "Absent",
          "Leave",
          "Half Day",
          "Attendance %",
          "Overtime Hours",
          "Estimated Net Salary",
          ...days.map((day) => `Day ${day}`),
        ],
        filteredMonthlyRows.map((row) => [
          row.employeeId,
          row.name,
          row.department,
          row.role,
          attendanceDate.slice(0, 7),
          row.workingDays || 0,
          row.payableDays || 0,
          row.totals?.present || 0,
          row.totals?.late || 0,
          row.totals?.absent || 0,
          row.totals?.onLeave || 0,
          row.totals?.halfDay || 0,
          row.attendancePct || 0,
          row.totals?.overtimeHours || 0,
          row.estimatedNet || 0,
          ...days.map((day) => row.days?.[day] || ""),
        ])
      );
      return;
    }

    if (attendanceView === "yearly") {
      const months = Array.from({ length: 12 }, (_, index) => `${attendanceDate.slice(0, 4)}-${String(index + 1).padStart(2, "0")}`);
      downloadCsv(
        `attendance-yearly-${attendanceDate.slice(0, 4)}.csv`,
        [
          "Employee ID",
          "Name",
          "Department",
          "Year",
          "Present Days",
          "Working Days",
          "Attendance %",
          ...months.flatMap((month) => [`${month} Present`, `${month} Working`, `${month} %`, `${month} Absent`, `${month} Leave`, `${month} Overtime`]),
        ],
        filteredYearlyRows.map((row) => {
          const byMonth = new Map((row.months || []).map((month: any) => [month.month, month]));
          return [
            row.employeeId,
            row.name,
            row.department,
            attendanceDate.slice(0, 4),
            row.yearPresent || 0,
            row.yearWorking || 0,
            row.yearPct || 0,
            ...months.flatMap((month) => {
              const item: any = byMonth.get(month) || {};
              return [item.present || 0, item.workingDays || 0, item.pct || 0, item.absent || 0, item.onLeave || 0, item.overtimeHours || 0];
            }),
          ];
        })
      );
      return;
    }

    downloadCsv(
      `attendance-daily-${attendanceDate}.csv`,
      [
        "Employee ID",
        "Name",
        "Department",
        "Designation",
        "Employment Type",
        "Joining Date",
        "Manager",
        "Work Location",
        "Employee Status",
        "Attendance Status",
        "Attendance Date",
        "Day",
        "Check In",
        "Check Out",
        "Late Minutes",
        "Worked Hours",
        "Marked",
        "Working Days",
        "Payable Days",
        "Attendance %",
        "Estimated Net Salary",
        "Monthly Gross Structure",
        "Payroll Status",
      ],
      filteredEmployees.map((employee) => {
        const attendanceRecord = attendanceByEmployee[employee.employeeId];
        return [
          employee.employeeId,
          employee.name,
          employee.department,
          employee.role,
          employee.employmentType,
          employee.joiningDate,
          employee.manager,
          employee.workLocation,
          employee.status,
          attendanceRecord?.status || "NOT_MARKED",
          attendanceDate,
          formatDayName(attendanceDate),
          attendanceRecord?.checkIn || "",
          attendanceRecord?.checkOut || "",
          attendanceRecord?.lateMinutes || 0,
          attendanceRecord ? workedHours(attendanceRecord) : "",
          attendanceRecord?.marked ? "Yes" : "No",
          monthlyByEmployee[employee.employeeId]?.workingDays || 0,
          monthlyByEmployee[employee.employeeId]?.payableDays || 0,
          monthlyByEmployee[employee.employeeId]?.attendancePct || 0,
          monthlyByEmployee[employee.employeeId]?.estimatedNet || 0,
          salaryByEmployee[employee.employeeId] ? salaryGross(salaryByEmployee[employee.employeeId]) : 0,
          payrollByEmployee[employee.employeeId]?.status || "NOT_STARTED",
        ];
      })
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700/80">Employee Operations</div>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Employee Attendance & Payroll</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Review the selected date, mark check-in/check-out, watch month-to-date payroll impact, and open each profile for full attendance or salary history.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(["daily", "monthly", "yearly"] as AttendanceView[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setAttendanceView(view)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-xs font-bold capitalize transition",
                    attendanceView === view ? "bg-sky-100 text-sky-700" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {view}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <CalendarDays size={16} className="text-sky-700" />
              {attendanceView === "daily" ? (
                <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value || todayKey())} className="bg-transparent text-slate-900 outline-none" />
              ) : attendanceView === "monthly" ? (
                <input type="month" value={attendanceDate.slice(0, 7)} onChange={(e) => setAttendanceDate(`${e.target.value || todayKey().slice(0, 7)}-01`)} className="bg-transparent text-slate-900 outline-none" />
              ) : (
                <input type="number" min="2000" max="2100" value={attendanceDate.slice(0, 4)} onChange={(e) => setAttendanceDate(`${e.target.value || todayKey().slice(0, 4)}-01-01`)} className="w-24 bg-transparent text-slate-900 outline-none" />
              )}
            </label>
            <button onClick={exportAttendanceCsv} className={buttonClass}><Download size={16} /> Export CSV</button>
            {attendanceView === "daily" ? (
              <>
                <button onClick={markAllPresent} disabled={attendanceBusy} className={cn(primaryButtonClass, attendanceBusy && "opacity-60")}>
                  <CalendarCheck size={16} /> Mark all present
                </button>
                <button onClick={fillMissingAbsents} className={buttonClass}><CalendarCheck size={16} /> Fill missing absents</button>
              </>
            ) : null}
            <button onClick={() => { setForm(blankEmployee(companyCode)); setFormIsNew(true); setModalOpen(true); }} className={primaryButtonClass}><UserPlus size={16} /> Add employee</button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {attendanceNotice ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          <span>{attendanceNotice}</span>
          <button onClick={() => setAttendanceNotice("")} className="text-xs font-bold text-emerald-700/80 hover:text-emerald-700">Dismiss</button>
        </div>
      ) : null}

      {corrections.length ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
          <div className="mb-3 text-sm font-bold text-amber-700">Pending attendance corrections ({corrections.length})</div>
          <div className="space-y-2">
            {corrections.map((row) => (
              <div key={`${row.attendanceId}-${row.request._id}`} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold">{row.employeeName} · {row.date}</div>
                  <div className="text-xs text-slate-500">
                    {row.currentStatus?.replace(/_/g, " ")} → {row.request.requestedStatus?.replace(/_/g, " ")}
                    {row.request.reason ? ` · ${row.request.reason}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => reviewCorrection(row, "APPROVED")} className="rounded-lg border border-emerald-400/25 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-500/25">Approve</button>
                  <button onClick={() => reviewCorrection(row, "REJECTED")} className="rounded-lg border border-rose-400/25 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-500/25">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Total employees" value={String(employees.length)} icon={<Users size={18} />} />
        <Kpi label={`${formatDayName(attendanceDate)} present`} value={String(dashboardCards.present)} icon={<CalendarCheck size={18} />} />
        <Kpi label={`${formatDayName(attendanceDate)} absent`} value={String(dashboardCards.absent)} icon={<UserMinus size={18} />} />
        <Kpi label="On leave" value={String(dashboardCards.leave)} icon={<Briefcase size={18} />} />
        <Kpi label="Estimated net payroll" value={`INR ${fmtINR(dashboardCards.estimatedNet)}`} icon={<IndianRupee size={18} />} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_150px_150px_140px_150px_170px_180px_150px]">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={16} className="text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employees..." className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500" />
          </div>
          <FilterLabel label="Department"><Select value={filters.department} onChange={(v) => setFilters((p) => ({ ...p, department: v }))} options={["ALL", ...optionSets.departments]} /></FilterLabel>
          <FilterLabel label="Role"><Select value={filters.role} onChange={(v) => setFilters((p) => ({ ...p, role: v }))} options={["ALL", ...optionSets.roles]} /></FilterLabel>
          <FilterLabel label="Employee"><Select value={filters.status} onChange={(v) => setFilters((p) => ({ ...p, status: v }))} options={["ALL", "ACTIVE", "INACTIVE"]} /></FilterLabel>
          <FilterLabel label="Location"><Select value={filters.location} onChange={(v) => setFilters((p) => ({ ...p, location: v }))} options={["ALL", ...optionSets.locations]} /></FilterLabel>
          <FilterLabel label="Type"><Select value={filters.employmentType} onChange={(v) => setFilters((p) => ({ ...p, employmentType: v }))} options={["ALL", ...optionSets.employmentTypes]} /></FilterLabel>
          <FilterLabel label="Payroll"><Select value={filters.payrollStatus} onChange={(v) => setFilters((p) => ({ ...p, payrollStatus: v }))} options={["ALL", "DRAFT", "CALCULATED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "PAID", "FAILED", "NOT_STARTED"]} /></FilterLabel>
          <FilterLabel label="Joining"><input type="date" value={filters.joiningDate} onChange={(e) => setFilters((p) => ({ ...p, joiningDate: e.target.value }))} className={inputClass} /></FilterLabel>
        </div>
      </div>

      {attendanceView === "daily" ? (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="max-h-[610px] overflow-auto">
          <table className="w-full min-w-[1660px] text-sm">
            <thead className="sticky top-0 z-10 bg-white text-slate-600">
              <tr className="border-b border-slate-200">
                {["Employee", "Department", "Shift", "Date", "Day", "Attendance", "Check in", "Check out", "Hours", "Monthly payroll basis", "Salary", "Payroll", "Actions"].map((head) => (
                  <th key={head} className="px-4 py-3 text-left font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-900">
              {filteredEmployees.map((employee) => {
                const attendanceRecord = attendanceByEmployee[employee.employeeId];
                const draft = attendanceDrafts[employee.employeeId] || {
                  status: attendanceRecord?.status || "PRESENT",
                  checkIn: attendanceRecord?.checkIn || "",
                  checkOut: attendanceRecord?.checkOut || "",
                };
                const monthly = monthlyByEmployee[employee.employeeId] || {};
                const salary = salaryByEmployee[employee.employeeId];
                const payrollStatus = payrollByEmployee[employee.employeeId]?.status || "NOT_STARTED";
                const derived = deriveManualAttendance(employee, draft);
                return (
                  <tr key={employee.employeeId} className="border-t border-slate-200 hover:bg-sky-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {employee.photoUrl ? <img src={employee.photoUrl} alt={employee.name} className="h-full w-full object-cover" /> : employee.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold">{employee.name}</div>
                          <div className="text-xs text-slate-500">{employee.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{employee.department || "-"}</td>
                    <td className="px-4 py-3">
                      <div>{employee.shiftName || employee.employmentType || "-"}</div>
                      <div className="mt-1 text-xs text-slate-500">{displayTime(getShiftStart(employee))} - {displayTime(getShiftEnd(employee))}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{formatDate(attendanceDate)}</div>
                      <div className="mt-1 text-xs text-slate-500">{attendanceDate}</div>
                    </td>
                    <td className="px-4 py-3">{formatDayName(attendanceDate)}</td>
                    <td className="px-4 py-3">
                      <select value={draft.status} onChange={(e) => setAttendanceDraft(employee.employeeId, { status: e.target.value as AttendanceStatus })} className={inputClass}>
                        <option value="NOT_MARKED" disabled>{attendanceLabels.NOT_MARKED}</option>
                        {attendanceOptions.map((status) => <option key={status} value={status}>{attendanceLabels[status]}</option>)}
                      </select>
                      <div className="mt-1 text-xs text-slate-500">
                        {attendanceRecord?.status ? `${attendanceRecord.marked || attendanceRecord.attendanceId ? "Saved" : "Auto view"}: ${statusLabel(attendanceRecord.status)}` : "Save to calculate"}
                        {Number(attendanceRecord?.lateMinutes || 0) > 0 ? ` · ${attendanceRecord.lateMinutes} min late` : ""}
                      </div>
                      {savedFlash[employee.employeeId] ? (
                        <div className="mt-1 text-xs font-semibold text-emerald-700">✓ Saved</div>
                      ) : dirtyDrafts[employee.employeeId] ? (
                        <div className="mt-1 text-xs font-semibold text-amber-700">Unsaved — click Save</div>
                      ) : null}
                      {draft.checkIn ? (
                        <div className={cn("mt-1 text-xs font-semibold", derived.status === "LATE" ? "text-amber-700" : "text-emerald-700")}>
                          Will save: {attendanceLabels[derived.status]}{derived.lateMinutes > 0 ? ` · ${derived.lateMinutes} min late` : ""}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3"><TimePicker value={draft.checkIn} onChange={(value) => setAttendanceTime(employee.employeeId, "checkIn", value)} /></td>
                    <td className="px-4 py-3"><TimePicker value={draft.checkOut} onChange={(value) => setAttendanceTime(employee.employeeId, "checkOut", value)} /></td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1"><Timer size={14} /> {workedHours({ ...attendanceRecord, checkIn: draft.checkIn, checkOut: draft.checkOut })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{monthly.payableDays ?? 0} payable / {monthly.workingDays ?? 0} working</div>
                      <div className="mt-1 text-xs text-slate-500">Present {monthly.totals?.present ?? 0} · Leave {monthly.totals?.onLeave ?? 0} · OT {monthly.totals?.overtimeHours ?? 0}h</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-extrabold">INR {fmtINR(monthly.estimatedNet || 0)}</div>
                      <div className="mt-1 text-xs text-slate-500">{salary ? `Structure INR ${fmtINR(salaryGross(salary))}` : "No salary structure"}</div>
                    </td>
                    <td className="px-4 py-3"><Badge label={payrollStatus} tone={payrollStatus === "PAID" ? "green" : payrollStatus === "FAILED" ? "rose" : "cyan"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          title="Save attendance for selected date"
                          onClick={() => markAttendance(employee)}
                          disabled={attendanceBusy}
                          className={cn("inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-sky-300 bg-sky-100 px-3 text-xs font-bold text-sky-700 hover:bg-sky-200", attendanceBusy && "opacity-60")}
                        >
                          <Clock3 size={14} /> Save
                        </button>
                        <button title="View profile" onClick={() => navigate(`/company/service/${encodeURIComponent(employee.employeeId)}`)} className={iconButtonClass}><FileText size={15} /></button>
                        <button
                          title="Edit"
                          onClick={() => {
                            const s = salaryByEmployee[employee.employeeId] || {};
                            setForm({
                              ...employee,
                              salaryBasic: s.basic ? String(s.basic) : "",
                              salaryHra: s.hra ? String(s.hra) : "",
                              salaryAllowance: s.specialAllowance ? String(s.specialAllowance) : "",
                              salaryDeductions: s.otherDeductions ? String(s.otherDeductions) : "",
                              overtimeRatePerHour: s.overtimeRatePerHour ? String(s.overtimeRatePerHour) : "",
                            });
                            setFormIsNew(false);
                            setModalOpen(true);
                          }}
                          className={iconButtonClass}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button title={employee.status === "ACTIVE" ? "Deactivate" : "Activate"} onClick={() => toggleStatus(employee)} className={iconButtonClass}><UserMinus size={15} /></button>
                        <button title="Delete employee" onClick={() => removeEmployee(employee)} className={iconButtonClass}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !filteredEmployees.length ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-slate-600">No employees matched the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      ) : attendanceView === "monthly" ? (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-bold text-slate-900">Monthly attendance register - {monthLabel(attendanceDate.slice(0, 7))}</div>
          <div className="mt-1 text-xs text-slate-500">Saved attendance is shown day wise. Blank future dates are still open for daily marking.</div>
        </div>
        <div className="max-h-[610px] overflow-auto">
          <table className="w-full min-w-[1860px] text-sm">
            <thead className="sticky top-0 z-10 bg-white text-slate-600">
              <tr className="border-b border-slate-200">
                {["Employee", "Department", "Working", "Payable", "Present", "Late", "Absent", "Leave", "Half", "Attendance %", "Estimated salary", ...Array.from({ length: Number(monthlyRows[0]?.days ? Object.keys(monthlyRows[0].days).length : 31) }, (_, index) => String(index + 1).padStart(2, "0"))].map((head) => (
                  <th key={head} className="px-3 py-3 text-left font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-900">
              {filteredMonthlyRows.map((row) => (
                <tr key={row.employeeId} className="border-t border-slate-200 hover:bg-sky-50">
                  <td className="sticky left-0 bg-white px-4 py-3">
                    <div className="font-bold">{row.name}</div>
                    <button onClick={() => navigate(`/company/service/${encodeURIComponent(row.employeeId)}`)} className="mt-1 text-xs text-sky-700 hover:text-sky-700">{row.employeeId}</button>
                  </td>
                  <td className="px-3 py-3">{row.department || "-"}</td>
                  <td className="px-3 py-3">{row.workingDays || 0}</td>
                  <td className="px-3 py-3">{row.payableDays || 0}</td>
                  <td className="px-3 py-3">{row.totals?.present || 0}</td>
                  <td className="px-3 py-3 text-amber-700">{row.totals?.late || 0}</td>
                  <td className="px-3 py-3 text-rose-700">{row.totals?.absent || 0}</td>
                  <td className="px-3 py-3">{row.totals?.onLeave || 0}</td>
                  <td className="px-3 py-3">{row.totals?.halfDay || 0}</td>
                  <td className="px-3 py-3">{row.attendancePct || 0}%</td>
                  <td className="px-3 py-3 font-bold">INR {fmtINR(row.estimatedNet || 0)}</td>
                  {Array.from({ length: Number(monthlyRows[0]?.days ? Object.keys(monthlyRows[0].days).length : 31) }, (_, index) => String(index + 1).padStart(2, "0")).map((day) => (
                    <td key={day} className="px-2 py-3">
                      <span className={cn(
                        "inline-flex min-w-8 justify-center rounded-md border px-2 py-1 text-xs font-bold",
                        row.days?.[day] === "A" ? "border-rose-400/20 bg-rose-500/10 text-rose-700" :
                        row.days?.[day] === "L" ? "border-amber-400/20 bg-amber-500/10 text-amber-700" :
                        row.days?.[day] ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-700" :
                        "border-slate-200 bg-slate-50 text-slate-500"
                      )}>{row.days?.[day] || "-"}</span>
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && !filteredMonthlyRows.length ? (
                <tr>
                  <td colSpan={42} className="px-4 py-12 text-center text-slate-600">No monthly attendance rows matched the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="text-sm font-bold text-slate-900">Yearly attendance register - {attendanceDate.slice(0, 4)}</div>
          <div className="mt-1 text-xs text-slate-500">Each month shows present days against working days, with yearly percentage for review.</div>
        </div>
        <div className="max-h-[610px] overflow-auto">
          <table className="w-full min-w-[1540px] text-sm">
            <thead className="sticky top-0 z-10 bg-white text-slate-600">
              <tr className="border-b border-slate-200">
                {["Employee", "Department", "Year present", "Year working", "Year %", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((head) => (
                  <th key={head} className="px-4 py-3 text-left font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-900">
              {filteredYearlyRows.map((row) => (
                <tr key={row.employeeId} className="border-t border-slate-200 hover:bg-sky-50">
                  <td className="sticky left-0 bg-white px-4 py-3">
                    <div className="font-bold">{row.name}</div>
                    <button onClick={() => navigate(`/company/service/${encodeURIComponent(row.employeeId)}`)} className="mt-1 text-xs text-sky-700 hover:text-sky-700">{row.employeeId}</button>
                  </td>
                  <td className="px-4 py-3">{row.department || "-"}</td>
                  <td className="px-4 py-3">{row.yearPresent || 0}</td>
                  <td className="px-4 py-3">{row.yearWorking || 0}</td>
                  <td className="px-4 py-3 font-bold">{row.yearPct || 0}%</td>
                  {(row.months || []).map((month: any) => (
                    <td key={month.month} className="px-4 py-3">
                      <div className="font-semibold">{month.present || 0}/{month.workingDays || 0}</div>
                      <div className="mt-1 text-xs text-slate-500">{month.pct || 0}%</div>
                    </td>
                  ))}
                </tr>
              ))}
              {!loading && !filteredYearlyRows.length ? (
                <tr>
                  <td colSpan={17} className="px-4 py-12 text-center text-slate-600">No yearly attendance rows matched the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="text-lg font-extrabold text-slate-900">{formIsNew ? "Add employee" : "Edit employee"}</div>
              <button onClick={() => setModalOpen(false)} className={iconButtonClass}>x</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Employee ID"><input value={form.id} onChange={(e) => setForm((p) => ({ ...p, id: e.target.value, employeeId: e.target.value }))} className={inputClass} /></Field>
              <Field label="Full name"><input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputClass} /></Field>
              <Field label="Email"><input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={inputClass} /></Field>
              <Field label="Phone"><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value, contact: e.target.value }))} className={inputClass} /></Field>
              <Field label="Department"><input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} className={inputClass} /></Field>
              <Field label="Designation"><input value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className={inputClass} /></Field>
              <Field label="Employment type"><input value={form.employmentType} onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value }))} className={inputClass} /></Field>
              <Field label="Joining date"><input type="date" value={form.joiningDate} onChange={(e) => setForm((p) => ({ ...p, joiningDate: e.target.value }))} className={inputClass} /></Field>
              <Field label="Manager"><input value={form.manager} onChange={(e) => setForm((p) => ({ ...p, manager: e.target.value }))} className={inputClass} /></Field>
              <Field label="Work location"><input value={form.workLocation} onChange={(e) => setForm((p) => ({ ...p, workLocation: e.target.value }))} className={inputClass} /></Field>
              <Field label="Shift name"><input value={form.shiftName} onChange={(e) => setForm((p) => ({ ...p, shiftName: e.target.value }))} className={inputClass} /></Field>
              <Field label="Shift start"><TimePicker value={form.shiftStart} onChange={(value) => setForm((p) => ({ ...p, shiftStart: value }))} /></Field>
              <Field label="Shift end"><TimePicker value={form.shiftEnd} onChange={(value) => setForm((p) => ({ ...p, shiftEnd: value }))} /></Field>
              <Field label="Employee status">
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as EmployeeStatus }))} className={inputClass}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-sky-700/80">Salary setup</div>
                <div className="grid gap-3 md:grid-cols-5">
                  <Field label="Basic"><input inputMode="numeric" value={form.salaryBasic} onChange={(e) => setForm((p) => ({ ...p, salaryBasic: e.target.value }))} className={inputClass} placeholder="0" /></Field>
                  <Field label="HRA"><input inputMode="numeric" value={form.salaryHra} onChange={(e) => setForm((p) => ({ ...p, salaryHra: e.target.value }))} className={inputClass} placeholder="0" /></Field>
                  <Field label="Allowance"><input inputMode="numeric" value={form.salaryAllowance} onChange={(e) => setForm((p) => ({ ...p, salaryAllowance: e.target.value }))} className={inputClass} placeholder="0" /></Field>
                  <Field label="Deductions"><input inputMode="numeric" value={form.salaryDeductions} onChange={(e) => setForm((p) => ({ ...p, salaryDeductions: e.target.value }))} className={inputClass} placeholder="0" /></Field>
                  <Field label="OT rate/hr"><input inputMode="numeric" value={form.overtimeRatePerHour} onChange={(e) => setForm((p) => ({ ...p, overtimeRatePerHour: e.target.value }))} className={inputClass} placeholder="0" /></Field>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className={buttonClass}>Cancel</button>
              <button onClick={saveEmployee} className={primaryButtonClass}>Save employee</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 text-xl font-black text-slate-900">{value}</div>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700">{icon}</span>
      </div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      {options.map((option) => <option key={option} value={option}>{option === "ALL" ? "All" : option.replace(/_/g, " ")}</option>)}
    </select>
  );
}

function FilterLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      {children}
    </label>
  );
}

function TimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parts = timeParts(value);
  const hours = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

  const update = (patch: Partial<ReturnType<typeof timeParts>>) => {
    const next = { ...parts, ...patch };
    if (!next.hour) {
      onChange("");
      return;
    }
    onChange(fromTimeParts(next.hour, next.minute || "00", next.meridiem || "AM"));
  };

  return (
    <div className="grid w-[190px] grid-cols-[1fr_1fr_58px] gap-1">
      <select aria-label="Hour" value={parts.hour} onChange={(e) => update({ hour: e.target.value })} className={compactSelectClass}>
        <option value="">HH</option>
        {hours.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
      </select>
      <select aria-label="Minute" value={parts.minute} onChange={(e) => update({ minute: e.target.value })} className={compactSelectClass}>
        {minutes.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
      </select>
      <select aria-label="AM or PM" value={parts.meridiem} onChange={(e) => update({ meridiem: e.target.value })} className={compactSelectClass}>
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: "green" | "rose" | "cyan" }) {
  const toneClass = tone === "green" ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-700" : tone === "rose" ? "border-rose-400/20 bg-rose-500/10 text-rose-700" : "border-sky-200 bg-sky-50 text-sky-700";
  return <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-bold", toneClass)}>{label.replace(/_/g, " ")}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">{label}</div>
      {children}
    </label>
  );
}

const inputClass = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500";
const compactSelectClass = "min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-900 outline-none";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100";
const primaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-100 px-4 py-3 text-sm font-bold text-sky-700 hover:bg-sky-200";
const iconButtonClass = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900 hover:bg-slate-100";
