import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaBriefcase,
  FaCalendarCheck,
  FaClock,
  FaDownload,
  FaIdCard,
  FaFileAlt,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPhoneAlt,
  FaSave,
  FaShieldAlt,
  FaUser,
  FaKey,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import companyApi from "../../api/company.api.js";

type EmployeeStatus = "ACTIVE" | "INACTIVE";

type EmployeeDetailsForm = {
  id: string;
  companyCode: string;
  name: string;
  role: string;
  department: string;
  contact: string;
  email: string;
  phone: string;
  username: string;
  status: EmployeeStatus;
  photoUrl: string;
  aadhaarNumber: string;
  aadhaarStatus: string;
  panNumber: string;
  panStatus: string;
  employmentType: string;
  joiningDate: string;
  manager: string;
  supervisorName: string;
  workLocation: string;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  weeklyOff: string;
  attendanceMode: string;
  geoTaggingEnabled: boolean;
  accessLevel: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
};

type ProfileTab =
  | "overview"
  | "login"
  | "personal"
  | "employment"
  | "attendance"
  | "leave"
  | "salary"
  | "payroll"
  | "documents"
  | "activity";

const cn = (...a: Array<string | false | undefined | null>) => a.filter(Boolean).join(" ");
const DEFAULT_ENTRY_TIME = "11:00";
const DEFAULT_EXIT_TIME = "18:00";
const LATE_GRACE_MINUTES = 10;

const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "HALF_DAY",
  "ON_LEAVE",
  "HOLIDAY",
  "WEEKLY_OFF",
  "WORK_FROM_HOME",
  "MISSING_CHECKOUT",
] as const;
type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

const attendanceLabels: Record<AttendanceStatus, string> = {
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

function hmToMinutes(value: string) {
  const [hour, minute] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function getShiftStart(employee: Pick<EmployeeDetailsForm, "shiftStart">) {
  return employee.shiftStart || DEFAULT_ENTRY_TIME;
}

function getShiftEnd(employee: Pick<EmployeeDetailsForm, "shiftEnd">) {
  return employee.shiftEnd || DEFAULT_EXIT_TIME;
}

function deriveManualAttendance(employee: Pick<EmployeeDetailsForm, "shiftStart" | "shiftEnd">, status: AttendanceStatus, checkIn: string) {
  const checkInMinutes = hmToMinutes(checkIn);
  const shiftStartMinutes = hmToMinutes(getShiftStart(employee));
  const lateMinutes = checkInMinutes != null && shiftStartMinutes != null ? Math.max(0, checkInMinutes - shiftStartMinutes) : 0;
  const normalTimedStatus = ["PRESENT", "LATE", "HALF_DAY", "MISSING_CHECKOUT"].includes(status);

  if (normalTimedStatus && checkIn && lateMinutes > LATE_GRACE_MINUTES) {
    return { status: "LATE" as AttendanceStatus, lateMinutes };
  }

  return { status, lateMinutes: 0 };
}

function formatDayName(date: string) {
  if (!date) return "-";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long" });
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

function generateResetPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
  const bytes = new Uint8Array(10);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

function createEmptyForm(): EmployeeDetailsForm {
  return {
    id: "",
    companyCode: "",
    name: "",
    role: "",
    department: "",
    contact: "",
    email: "",
    phone: "",
    username: "",
    status: "ACTIVE",
    photoUrl: "",
    aadhaarNumber: "",
    aadhaarStatus: "",
    panNumber: "",
    panStatus: "",
    employmentType: "",
    joiningDate: "",
    manager: "",
    supervisorName: "",
    workLocation: "",
    shiftName: "",
    shiftStart: "",
    shiftEnd: "",
    weeklyOff: "",
    attendanceMode: "",
    geoTaggingEnabled: false,
    accessLevel: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: "",
  };
}

function toForm(employee: any, fallbackCompanyCode: string): EmployeeDetailsForm {
  const emergency = employee?.emergencyContact || {};
  const phone = toText(employee?.phone || employee?.contact);
  return {
    ...createEmptyForm(),
    id: toText(employee?.id || employee?.employeeId),
    companyCode: toText(employee?.companyCode, fallbackCompanyCode),
    name: toText(employee?.name || employee?.employeeName),
    role: toText(employee?.designation || employee?.role, "Employee"),
    department: toText(employee?.department, "General"),
    contact: toText(employee?.contact || phone || employee?.email),
    email: toText(employee?.email),
    phone,
    username: toText(employee?.username),
    status: String(employee?.status || "ACTIVE").toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    photoUrl: toText(employee?.photoUrl),
    aadhaarNumber: toText(employee?.aadhaarNumber),
    aadhaarStatus: toText(employee?.aadhaarStatus),
    panNumber: toText(employee?.panNumber),
    panStatus: toText(employee?.panStatus),
    employmentType: toText(employee?.employmentType),
    joiningDate: toText(employee?.joiningDate),
    manager: toText(employee?.manager),
    supervisorName: toText(employee?.supervisorName),
    workLocation: toText(employee?.workLocation),
    shiftName: toText(employee?.shiftName),
    shiftStart: toText(employee?.shiftStart),
    shiftEnd: toText(employee?.shiftEnd),
    weeklyOff: toText(employee?.weeklyOff),
    attendanceMode: toText(employee?.attendanceMode),
    geoTaggingEnabled: Boolean(employee?.geoTaggingEnabled),
    accessLevel: toText(employee?.accessLevel),
    dateOfBirth: toText(employee?.dateOfBirth || employee?.dob),
    gender: toText(employee?.gender),
    address: toText(employee?.address),
    emergencyContactName: toText(employee?.emergencyContactName || emergency?.name),
    emergencyContactPhone: toText(employee?.emergencyContactPhone || emergency?.phone),
    notes: toText(employee?.notes),
  };
}

export default function CompanyEmployeeDetails() {
  const navigate = useNavigate();
  const { employeeId = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const [form, setForm] = useState<EmployeeDetailsForm>(createEmptyForm());
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [savingLogin, setSavingLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salaryStructures, setSalaryStructures] = useState<any[]>([]);
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salaryAttendance, setSalaryAttendance] = useState<any | null>(null);
  const [payrollItems, setPayrollItems] = useState<any[]>([]);
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    status: "PRESENT" as AttendanceStatus,
    checkIn: "",
    checkOut: "",
  });
  const [salaryForm, setSalaryForm] = useState({
    effectiveFrom: new Date().toISOString().slice(0, 10),
    basic: "",
    hra: "",
    specialAllowance: "",
    bonus: "",
    pf: "",
    esi: "",
    professionalTax: "",
    incomeTax: "",
    insurance: "",
    otherDeductions: "",
    overtimeRatePerHour: "",
  });

  const loadEmployee = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const companyId = await companyApi.resolveCompanyId();
      if (!companyId) {
        setLoadError("Company account was not found. Please log in again.");
        return;
      }

      const decodedId = decodeURIComponent(employeeId);
      const [dashboard, employeeResponse, attendanceResponse, salaryResponse, payrollResponse, salaryAttendanceResponse] = await Promise.all([
        companyApi.getCompanyDashboard(companyId).catch(() => null),
        companyApi.getCompanyEmployee(companyId, decodedId),
        companyApi.getCompanyAttendance(companyId, { employeeId: decodedId, month: attendanceMonth }).catch(() => null),
        companyApi.getCompanySalaryStructures(companyId, { employeeId: decodedId }).catch(() => null),
        companyApi.getCompanyPayroll(companyId).catch(() => null),
        companyApi.getAttendanceMonthly(companyId, { employeeId: decodedId, month: salaryMonth, limit: 1 }).catch(() => null),
      ]);
      const serviceAccess = dashboard?.serviceAccess || null;
      const resolvedCompanyCode = String(
        employeeResponse?.companyCode || dashboard?.company?.companyCode || serviceAccess?.companyCode || ""
      );
      setCompanyCode(resolvedCompanyCode);

      if (!employeeResponse?.success || !employeeResponse?.employee) {
        throw new Error(employeeResponse?.message || "Backend did not return employee details.");
      }

      const nextForm = toForm(employeeResponse.employee, resolvedCompanyCode);
      setForm(nextForm);
      setLoginForm({ username: nextForm.username || nextForm.id.toLowerCase(), password: "" });
      setAttendanceRecords(Array.isArray(attendanceResponse?.records) ? attendanceResponse.records : []);
      setSalaryStructures(Array.isArray(salaryResponse?.salaryStructures) ? salaryResponse.salaryStructures : []);
      setSalaryAttendance(Array.isArray(salaryAttendanceResponse?.rows) ? salaryAttendanceResponse.rows[0] || null : null);
      setPayrollItems(
        (payrollResponse?.payrollRuns || [])
          .flatMap((run: any) => (run.items || []).map((item: any) => ({ ...item, month: run.month, runStatus: run.status })))
          .filter((item: any) => String(item.employeeId) === decodedId)
      );
    } catch (error: any) {
      console.error("Failed to load employee details", error);
      setLoadError(error?.response?.data?.message || error?.message || "Failed to fetch employee details from backend.");
    } finally {
      setLoading(false);
    }
  }, [attendanceMonth, employeeId, salaryMonth]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  const completion = useMemo(() => {
    const fields = [
      form.name,
      form.role,
      form.department,
      form.email,
      form.phone,
      form.aadhaarNumber,
      form.panNumber,
      form.emergencyContactName,
      form.emergencyContactPhone,
      form.shiftName,
      form.attendanceMode,
      form.accessLevel,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [form]);

  const saveDetails = async () => {
    if (!form.id.trim() || !form.name.trim()) {
      alert("Employee ID and name are required.");
      return;
    }

    setSaving(true);
    try {
      const companyId = await companyApi.resolveCompanyId();
      if (!companyId) {
        throw new Error("Company account was not found. Please log in again.");
      }

      const saved = await companyApi.upsertCompanyEmployee(companyId, {
        ...form,
        companyCode: form.companyCode || companyCode,
        contact: form.phone || form.contact || form.email,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        username: form.username.trim().toLowerCase(),
      });
      if (!saved?.success || !saved?.employee) {
        throw new Error(saved?.message || "Employee details were not saved by the backend.");
      }
      setForm(toForm(saved.employee, form.companyCode || companyCode));
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.message || "Failed to save employee details.");
    } finally {
      setSaving(false);
    }
  };

  const savePortalLogin = async () => {
    const username = loginForm.username.trim().toLowerCase();
    const password = loginForm.password;
    if (!form.id.trim()) {
      alert("Employee ID is required before creating portal login.");
      return;
    }
    if (!username) {
      alert("Username is required.");
      return;
    }
    if (!form.username && password.length < 6) {
      alert("Password must be at least 6 characters for a new login.");
      return;
    }
    if (password && password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setSavingLogin(true);
    try {
      const companyId = await companyApi.resolveCompanyId();
      if (!companyId) throw new Error("Company account was not found. Please log in again.");
      const saved = await companyApi.saveEmployeePortalLogin(companyId, form.id, {
        username,
        password,
        email: form.email.trim().toLowerCase(),
      });
      if (!saved?.success) throw new Error(saved?.message || "Portal login was not saved.");
      const next = toForm(saved.employee || { ...form, username }, form.companyCode || companyCode);
      setForm(next);
      setLoginForm({ username: saved.login?.username || username, password: "" });
      alert(`Employee login saved.\nUsername: ${saved.login?.username || username}\nCompany code: ${saved.login?.companyCode || form.companyCode || companyCode}`);
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.message || "Failed to save employee portal login.");
    } finally {
      setSavingLogin(false);
    }
  };

  const saveSalaryStructure = async () => {
    try {
      const companyId = await companyApi.resolveCompanyId();
      if (!companyId) throw new Error("Company account was not found. Please log in again.");
      const res = await companyApi.upsertCompanySalaryStructure(companyId, {
        ...salaryForm,
        employeeId: form.id,
        employeeName: form.name,
      });
      if (!res?.success) throw new Error(res?.message || "Salary structure was not saved.");
      const [refreshed, salaryAttendanceResponse] = await Promise.all([
        companyApi.getCompanySalaryStructures(companyId, { employeeId: form.id }),
        companyApi.getAttendanceMonthly(companyId, { employeeId: form.id, month: salaryMonth, limit: 1 }).catch(() => null),
      ]);
      setSalaryStructures(Array.isArray(refreshed?.salaryStructures) ? refreshed.salaryStructures : []);
      setSalaryAttendance(Array.isArray(salaryAttendanceResponse?.rows) ? salaryAttendanceResponse.rows[0] || null : null);
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.message || "Failed to save salary structure.");
    }
  };

  const markDay = async () => {
    try {
      const companyId = await companyApi.resolveCompanyId();
      if (!companyId) throw new Error("Company account was not found. Please log in again.");
      const derived = deriveManualAttendance(form, attendanceForm.status, attendanceForm.checkIn);
      const savedMonth = attendanceForm.date.slice(0, 7);
      const res = await companyApi.upsertCompanyAttendance(companyId, {
        employeeId: form.id,
        employeeName: form.name,
        department: form.department,
        companyCode: form.companyCode || companyCode,
        workLocation: form.workLocation,
        date: attendanceForm.date,
        status: derived.status,
        checkIn: attendanceForm.checkIn,
        checkOut: attendanceForm.checkOut,
        shiftName: form.shiftName,
        shiftStart: getShiftStart(form),
        shiftEnd: getShiftEnd(form),
        lateMinutes: derived.lateMinutes,
        mode: "MANUAL",
        markedBy: "Company HR",
      });
      if (!res?.success) throw new Error(res?.message || "Attendance was not saved.");
      if (res.attendance) {
        setAttendanceRecords((prev) => {
          const savedDate = String(res.attendance.date || "");
          const withoutSaved = prev.filter((record) => String(record.date || "") !== savedDate);
          return [...withoutSaved, res.attendance].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
        });
        setAttendanceForm((prev) => ({
          ...prev,
          status: res.attendance.status || prev.status,
          checkIn: res.attendance.checkIn || "",
          checkOut: res.attendance.checkOut || "",
        }));
      }
      setAttendanceMonth(savedMonth);
      setSalaryMonth(savedMonth);
      const [refreshed, salaryAttendanceResponse] = await Promise.all([
        companyApi.getCompanyAttendance(companyId, {
          employeeId: form.id,
          month: savedMonth,
        }),
        companyApi.getAttendanceMonthly(companyId, { employeeId: form.id, month: savedMonth, limit: 1 }).catch(() => null),
      ]);
      setAttendanceRecords(Array.isArray(refreshed?.records) ? refreshed.records : []);
      setSalaryAttendance(Array.isArray(salaryAttendanceResponse?.rows) ? salaryAttendanceResponse.rows[0] || null : null);
    } catch (error: any) {
      alert(error?.response?.data?.message || error?.message || "Failed to mark attendance.");
    }
  };

  const setAttendanceTime = (field: "checkIn" | "checkOut", value: string) => {
    setAttendanceForm((prev) => ({
      ...prev,
      [field]: value,
      status: ["PRESENT", "LATE", "HALF_DAY", "MISSING_CHECKOUT"].includes(prev.status) ? "PRESENT" : prev.status,
    }));
  };

  const attendancePreview = deriveManualAttendance(form, attendanceForm.status, attendanceForm.checkIn);

  const exportEmployeeAttendance = () => {
    downloadCsv(
      `attendance-${form.id || "employee"}-${attendanceMonth}.csv`,
      ["Employee ID", "Name", "Date", "Day", "Status", "Check In", "Check Out", "Late Minutes", "Overtime Hours", "Locked For Payroll"],
      attendanceRecords.map((record) => [
        form.id,
        form.name,
        record.date,
        formatDayName(record.date),
        String(record.status || "").replace(/_/g, " "),
        record.checkIn || "",
        record.checkOut || "",
        record.lateMinutes || 0,
        record.overtimeHours || 0,
        record.lockedForPayroll ? "Yes" : "No",
      ])
    );
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
        Loading employee details...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/company/service")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          <FaArrowLeft /> Back to employees
        </button>
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
          <div className="font-bold">Employee details could not be loaded</div>
          <div className="mt-1 text-sm text-red-100/80">{loadError}</div>
          <button
            onClick={loadEmployee}
            className="mt-4 rounded-xl border border-red-200/20 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/company/service")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-900 transition hover:bg-slate-50"
              aria-label="Back to employee directory"
            >
              <FaArrowLeft />
            </button>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 text-2xl text-sky-700">
                {form.photoUrl ? <img src={form.photoUrl} alt={form.name} className="h-full w-full object-cover" /> : <FaUser />}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{form.name || "Employee Details"}</h1>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>{form.id || "-"}</span>
                  <span>{form.role || "Employee"}</span>
                  <span>{form.department || "General"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100">
              Profile {completion}% complete
            </div>
            <button
              onClick={saveDetails}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-60"
            >
              <FaSave /> {saving ? "Saving..." : "Save Details"}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        <div className="flex min-w-max gap-2">
          {profileTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-bold transition",
                activeTab === tab.id ? "bg-sky-100 text-sky-700" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-5 xl:grid-cols-4">
          <SummaryCard label="Employee ID" value={form.id || "-"} icon={<FaIdCard />} />
          <SummaryCard label="Portal Login" value={form.username ? form.username : "Not created"} icon={<FaKey />} />
          <SummaryCard label="Attendance Today" value={attendanceRecords.find((r) => r.date === new Date().toISOString().slice(0, 10))?.status?.replace(/_/g, " ") || "Not marked"} icon={<FaCalendarCheck />} />
          <SummaryCard label="Current Payroll" value={payrollItems[0]?.status || "Not started"} icon={<FaMoneyBillWave />} />
        </div>
      )}

      {activeTab === "login" && (
        <Panel title="Employee Portal Login" icon={<FaKey />}>
          <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Username">
                <input
                  value={loginForm.username}
                  onChange={(e) => setLoginForm((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/\s+/g, "") }))}
                  className={inputClass}
                  placeholder="employee username"
                />
              </Field>
              <Field label="Company Code">
                <input value={form.companyCode || companyCode || "-"} readOnly className={inputClass} />
              </Field>
              <Field label={form.username ? "New Password" : "Password"}>
                <input
                  type="text"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                  className={inputClass}
                  placeholder={form.username ? "Enter new password to reset" : "Minimum 6 characters"}
                />
              </Field>
              <Field label="Employee Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className={inputClass}
                  placeholder="employee@company.com"
                />
              </Field>
              <button
                onClick={savePortalLogin}
                disabled={savingLogin}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:opacity-60 sm:col-span-2"
              >
                <FaSave /> {savingLogin ? "Saving login..." : form.username ? "Reset / save login" : "Create portal login"}
              </button>
              <button
                type="button"
                onClick={() => setLoginForm((p) => ({ ...p, password: generateResetPassword() }))}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 sm:col-span-2"
              >
                <FaKey /> Generate reset password
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-extrabold text-slate-950">Give these details to the employee</div>
              <div className="mt-3 space-y-2">
                <LoginLine label="Username" value={loginForm.username || "-"} />
                <LoginLine label="Password" value={loginForm.password || (form.username ? "Enter or generate a new password to reset" : "-")} />
                <LoginLine label="Company code" value={form.companyCode || companyCode || "-"} />
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                If an employee forgets their password, generate or type a new password here, save it, then share the new password with the employee. Old passwords are never shown because they are stored securely as hashes.
              </p>
            </div>
          </div>
        </Panel>
      )}

      {activeTab === "attendance" && (
        <Panel title="Attendance" icon={<FaCalendarCheck />}>
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-end sm:justify-between">
            <Field label="Showing month" className="sm:w-56">
              <input type="month" value={attendanceMonth} onChange={(e) => setAttendanceMonth(e.target.value || new Date().toISOString().slice(0, 7))} className={inputClass} />
            </Field>
            <button onClick={exportEmployeeAttendance} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
              <FaDownload /> Export records
            </button>
          </div>
          <div className="mb-4 grid gap-3 lg:grid-cols-5">
            <Field label="Date">
              <input
                type="date"
                value={attendanceForm.date}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setAttendanceForm((p) => ({ ...p, date: nextDate }));
                  if (nextDate) setAttendanceMonth(nextDate.slice(0, 7));
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Status">
              <select value={attendanceForm.status} onChange={(e) => setAttendanceForm((p) => ({ ...p, status: e.target.value as AttendanceStatus }))} className={selectClass}>
                {ATTENDANCE_STATUSES.map((s) => (
                  <option key={s} value={s}>{attendanceLabels[s]}</option>
                ))}
              </select>
            </Field>
            <Field label="Check in">
              <TimePicker value={attendanceForm.checkIn} onChange={(value) => setAttendanceTime("checkIn", value)} />
              {attendanceForm.checkIn ? (
                <div className={cn("mt-1 text-xs font-semibold", attendancePreview.status === "LATE" ? "text-amber-700" : "text-emerald-700")}>
                  Will save: {attendanceLabels[attendancePreview.status]}{attendancePreview.lateMinutes > 0 ? ` · ${attendancePreview.lateMinutes} min late` : ""}
                </div>
              ) : null}
            </Field>
            <Field label="Check out">
              <TimePicker value={attendanceForm.checkOut} onChange={(value) => setAttendanceTime("checkOut", value)} />
            </Field>
            <button onClick={markDay} className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
              <FaSave /> Mark day
            </button>
          </div>
          <RecordTable
            empty="No attendance records saved for this month."
            headers={["Date", "Day", "Status", "Check in", "Check out", "Late", "Overtime", "Locked"]}
            rows={attendanceRecords.map((record) => [
              record.date,
              formatDayName(record.date),
              String(record.status || "").replace(/_/g, " "),
              record.checkIn || "-",
              record.checkOut || "-",
              `${record.lateMinutes || 0} min`,
              `${record.overtimeHours || 0} hrs`,
              record.lockedForPayroll ? "Yes" : "No",
            ])}
          />
        </Panel>
      )}

      {activeTab === "leave" && (
        <Panel title="Leave & Corrections" icon={<FaCalendarCheck />}>
          <RecordTable
            empty="No leave or correction records."
            headers={["Date", "Type", "Status", "Reason"]}
            rows={attendanceRecords
              .flatMap((record) => [
                record.status === "ON_LEAVE" ? [record.date, "Leave", "Recorded", record.notes || "-"] : null,
                ...(record.correctionRequests || []).map((request: any) => [
                  record.date,
                  "Correction",
                  request.status,
                  request.reason || "-",
                ]),
              ])
              .filter(Boolean)}
          />
        </Panel>
      )}

      {activeTab === "salary" && (
        <Panel title="Salary Structure" icon={<FaMoneyBillWave />}>
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Field label="Salary month" className="sm:w-56">
                <input type="month" value={salaryMonth} onChange={(e) => setSalaryMonth(e.target.value || new Date().toISOString().slice(0, 7))} className={inputClass} />
              </Field>
              <div className="text-xs text-slate-500">
                Salary is calculated from saved attendance for this month.
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SalaryImpact label="Working days" value={salaryAttendance?.workingDays ?? 0} />
              <SalaryImpact label="Payable days" value={salaryAttendance?.payableDays ?? 0} />
              <SalaryImpact label="Present days" value={salaryAttendance?.presentDays ?? salaryAttendance?.totals?.present ?? 0} />
              <SalaryImpact label="Late days" value={salaryAttendance?.lateDays ?? salaryAttendance?.totals?.late ?? 0} />
              <SalaryImpact label="Absent days" value={salaryAttendance?.absentDays ?? salaryAttendance?.totals?.absent ?? 0} />
              <SalaryImpact label="Attendance deduction" value={money(salaryAttendance?.attendanceDeduction)} />
              <SalaryImpact label="Total deductions" value={money(salaryAttendance?.totalDeductions)} />
              <SalaryImpact label="Estimated net salary" value={money(salaryAttendance?.estimatedNet)} strong />
            </div>
            {!salaryAttendance?.hasSalaryStructure ? (
              <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">
                Add a salary structure below to calculate real net salary from attendance.
              </div>
            ) : null}
          </div>
          <div className="mb-4 grid gap-3 lg:grid-cols-4">
            <Field label="Effective from">
              <input type="date" value={salaryForm.effectiveFrom} onChange={(e) => setSalaryForm((p) => ({ ...p, effectiveFrom: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Basic">
              <input value={salaryForm.basic} onChange={(e) => setSalaryForm((p) => ({ ...p, basic: e.target.value }))} className={inputClass} placeholder="0" />
            </Field>
            <Field label="HRA">
              <input value={salaryForm.hra} onChange={(e) => setSalaryForm((p) => ({ ...p, hra: e.target.value }))} className={inputClass} placeholder="0" />
            </Field>
            <Field label="Special allowance">
              <input value={salaryForm.specialAllowance} onChange={(e) => setSalaryForm((p) => ({ ...p, specialAllowance: e.target.value }))} className={inputClass} placeholder="0" />
            </Field>
            <Field label="Bonus">
              <input value={salaryForm.bonus} onChange={(e) => setSalaryForm((p) => ({ ...p, bonus: e.target.value }))} className={inputClass} placeholder="0" />
            </Field>
            <Field label="PF">
              <input value={salaryForm.pf} onChange={(e) => setSalaryForm((p) => ({ ...p, pf: e.target.value }))} className={inputClass} placeholder="0" />
            </Field>
            <Field label="ESI">
              <input value={salaryForm.esi} onChange={(e) => setSalaryForm((p) => ({ ...p, esi: e.target.value }))} className={inputClass} placeholder="0" />
            </Field>
            <Field label="Professional tax">
              <input value={salaryForm.professionalTax} onChange={(e) => setSalaryForm((p) => ({ ...p, professionalTax: e.target.value }))} className={inputClass} placeholder="0" />
            </Field>
            <Field label="Income tax">
              <input value={salaryForm.incomeTax} onChange={(e) => setSalaryForm((p) => ({ ...p, incomeTax: e.target.value }))} className={inputClass} placeholder="0" />
            </Field>
            <Field label="Insurance">
              <input value={salaryForm.insurance} onChange={(e) => setSalaryForm((p) => ({ ...p, insurance: e.target.value }))} className={inputClass} placeholder="0" />
            </Field>
            <Field label="Other deductions">
              <input value={salaryForm.otherDeductions} onChange={(e) => setSalaryForm((p) => ({ ...p, otherDeductions: e.target.value }))} className={inputClass} placeholder="0" />
            </Field>
            <Field label="Overtime rate/hr">
              <input value={salaryForm.overtimeRatePerHour} onChange={(e) => setSalaryForm((p) => ({ ...p, overtimeRatePerHour: e.target.value }))} className={inputClass} placeholder="0" />
            </Field>
            <button onClick={saveSalaryStructure} className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 lg:col-span-4">
              <FaSave /> Save effective salary structure
            </button>
          </div>
          <RecordTable
            empty="No salary structure has been added yet."
            headers={["Effective from", "Basic", "HRA", "Allowances", "Bonus", "Deductions"]}
            rows={salaryStructures.map((row) => [
              row.effectiveFrom,
              money(row.basic),
              money(row.hra),
              money(Number(row.conveyance || 0) + Number(row.medicalAllowance || 0) + Number(row.specialAllowance || 0)),
              money(row.bonus),
              money(Number(row.pf || 0) + Number(row.esi || 0) + Number(row.professionalTax || 0) + Number(row.incomeTax || 0) + Number(row.insurance || 0) + Number(row.otherDeductions || 0)),
            ])}
          />
        </Panel>
      )}

      {activeTab === "payroll" && (
        <Panel title="Payroll History" icon={<FaMoneyBillWave />}>
          <RecordTable
            empty="No payroll history yet."
            headers={["Month", "Working", "Present", "Gross", "Deductions", "Net", "Status"]}
            rows={payrollItems.map((item) => [
              item.month,
              item.workingDays,
              item.presentDays,
              money(item.grossSalary),
              money(item.totalDeductions),
              money(item.netSalary),
              item.status,
            ])}
          />
        </Panel>
      )}

      {activeTab === "documents" && (
        <Panel title="Documents" icon={<FaFileAlt />}>
          <RecordTable
            empty="No uploaded employee documents yet."
            headers={["Document", "Status", "Action"]}
            rows={[
              ["Aadhaar", form.aadhaarStatus || "Not checked", form.aadhaarNumber ? "Available" : "Missing"],
              ["PAN", form.panStatus || "Not checked", form.panNumber ? "Available" : "Missing"],
            ]}
          />
        </Panel>
      )}

      {activeTab === "activity" && (
        <Panel title="Activity Log" icon={<FaShieldAlt />}>
          <RecordTable
            empty="No activity yet."
            headers={["Event", "Details"]}
            rows={[
              ["Profile status", `${completion}% complete`],
              ["Login", form.username ? `Username ${form.username}` : "No login username"],
              ["Payroll records", `${payrollItems.length} payroll item(s)`],
              ["Attendance records", `${attendanceRecords.length} attendance day(s)`],
            ]}
          />
        </Panel>
      )}

      {(activeTab === "overview" || activeTab === "personal") && <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Identity & Verification" icon={<FaIdCard />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Photo URL">
              <input value={form.photoUrl} onChange={(e) => setForm((p) => ({ ...p, photoUrl: e.target.value }))} className={inputClass} placeholder="https://..." />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as EmployeeStatus }))} className={selectClass}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </Field>
            <Field label="Aadhaar Number">
              <input value={form.aadhaarNumber} onChange={(e) => setForm((p) => ({ ...p, aadhaarNumber: e.target.value }))} className={inputClass} placeholder="XXXX XXXX XXXX" />
            </Field>
            <Field label="Aadhaar Verification">
              <select value={form.aadhaarStatus} onChange={(e) => setForm((p) => ({ ...p, aadhaarStatus: e.target.value }))} className={selectClass}>
                <option value="">Not checked</option>
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </Field>
            <Field label="PAN Number">
              <input value={form.panNumber} onChange={(e) => setForm((p) => ({ ...p, panNumber: e.target.value.toUpperCase() }))} className={inputClass} placeholder="ABCDE1234F" />
            </Field>
            <Field label="PAN Verification">
              <select value={form.panStatus} onChange={(e) => setForm((p) => ({ ...p, panStatus: e.target.value }))} className={selectClass}>
                <option value="">Not checked</option>
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </Field>
          </div>
        </Panel>

        <Panel title="Contact & Emergency" icon={<FaPhoneAlt />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Work Email">
              <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={inputClass} placeholder="employee@company.com" />
            </Field>
            <Field label="Phone Number">
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value, contact: e.target.value }))} className={inputClass} placeholder="+91 98765 43210" />
            </Field>
            <Field label="Emergency Contact Name">
              <input value={form.emergencyContactName} onChange={(e) => setForm((p) => ({ ...p, emergencyContactName: e.target.value }))} className={inputClass} placeholder="Contact person" />
            </Field>
            <Field label="Emergency Contact Phone">
              <input value={form.emergencyContactPhone} onChange={(e) => setForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))} className={inputClass} placeholder="+91 98765 43210" />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <textarea value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className={textareaClass} placeholder="Current address" />
            </Field>
          </div>
        </Panel>
      </div>}

      {(activeTab === "overview" || activeTab === "employment") && <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Work Details" icon={<FaBriefcase />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full Name">
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Employee ID">
              <input value={form.id} onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Role">
              <input value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Department">
              <input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Employment Type">
              <select value={form.employmentType} onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value }))} className={selectClass}>
                <option value="">Select type</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
              </select>
            </Field>
            <Field label="Joining Date">
              <input type="date" value={form.joiningDate} onChange={(e) => setForm((p) => ({ ...p, joiningDate: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Reporting Manager">
              <input value={form.manager} onChange={(e) => setForm((p) => ({ ...p, manager: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Supervisor">
              <input value={form.supervisorName} onChange={(e) => setForm((p) => ({ ...p, supervisorName: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Work Location" className="sm:col-span-2">
              <input value={form.workLocation} onChange={(e) => setForm((p) => ({ ...p, workLocation: e.target.value }))} className={inputClass} placeholder="Office / Branch / Remote" />
            </Field>
          </div>
        </Panel>

        <Panel title="Attendance & Shift" icon={<FaCalendarCheck />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Attendance Mode">
              <select value={form.attendanceMode} onChange={(e) => setForm((p) => ({ ...p, attendanceMode: e.target.value }))} className={selectClass}>
                <option value="">Select mode</option>
                <option value="Check-in / Check-out">Check-in / Check-out</option>
                <option value="Manual">Manual</option>
                <option value="Supervisor marked">Supervisor marked</option>
              </select>
            </Field>
            <Field label="Shift Name">
              <input value={form.shiftName} onChange={(e) => setForm((p) => ({ ...p, shiftName: e.target.value }))} className={inputClass} placeholder="Morning / Evening" />
            </Field>
            <Field label="Shift Start">
              <TimePicker value={form.shiftStart} onChange={(value) => setForm((p) => ({ ...p, shiftStart: value }))} />
            </Field>
            <Field label="Shift End">
              <TimePicker value={form.shiftEnd} onChange={(value) => setForm((p) => ({ ...p, shiftEnd: value }))} />
            </Field>
            <Field label="Weekly Off">
              <input value={form.weeklyOff} onChange={(e) => setForm((p) => ({ ...p, weeklyOff: e.target.value }))} className={inputClass} placeholder="Sunday" />
            </Field>
            <Field label="Access Level">
              <select value={form.accessLevel} onChange={(e) => setForm((p) => ({ ...p, accessLevel: e.target.value }))} className={selectClass}>
                <option value="">Select access</option>
                <option value="Worker">Worker</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Admin">Admin</option>
              </select>
            </Field>
            <label className="sm:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
              <span className="inline-flex items-center gap-2">
                <FaMapMarkerAlt className="text-sky-600" /> Geo-tag attendance
              </span>
              <input
                type="checkbox"
                checked={form.geoTaggingEnabled}
                onChange={(e) => setForm((p) => ({ ...p, geoTaggingEnabled: e.target.checked }))}
                className="h-4 w-4 accent-sky-500"
              />
            </label>
          </div>
        </Panel>
      </div>}

      {(activeTab === "overview" || activeTab === "personal" || activeTab === "activity") && <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Personal Details" icon={<FaClock />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date of Birth">
              <input type="date" value={form.dateOfBirth} onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Gender">
              <select value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))} className={selectClass}>
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </Field>
          </div>
        </Panel>

        <Panel title="Internal Notes" icon={<FaShieldAlt />}>
          <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className={textareaClass} placeholder="Manual override notes, alerts, or internal reminders" />
        </Panel>
      </div>}
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none placeholder:text-slate-500";
const selectClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none";
const compactSelectClass = "min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-semibold text-slate-900 outline-none";
const textareaClass = "min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none placeholder:text-slate-500";

const profileTabs: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "login", label: "Portal login" },
  { id: "personal", label: "Personal details" },
  { id: "employment", label: "Employment details" },
  { id: "attendance", label: "Attendance" },
  { id: "leave", label: "Leave" },
  { id: "salary", label: "Salary structure" },
  { id: "payroll", label: "Payroll history" },
  { id: "documents", label: "Documents" },
  { id: "activity", label: "Activity log" },
];

function money(value: unknown) {
  return `INR ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 text-lg font-extrabold text-slate-900">{value}</div>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700">
          {icon}
        </span>
      </div>
    </div>
  );
}

function SalaryImpact({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={cn("mt-1 text-lg text-slate-900", strong ? "font-black text-sky-700" : "font-bold")}>{value}</div>
    </div>
  );
}

function LoginLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <span className="text-xs font-semibold uppercase text-slate-500">{label}</span>
      <span className="text-right font-mono text-sm font-bold text-slate-950">{value}</span>
    </div>
  );
}

function RecordTable({ headers, rows, empty }: { headers: string[]; rows: any[]; empty: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="max-h-[360px] overflow-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 bg-white text-slate-600">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 text-left font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-900">
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-slate-200">
                {row.map((cell: any, cellIndex: number) => (
                  <td key={cellIndex} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center text-slate-600">
                  {empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70 sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
        <span className="text-sky-600">{icon}</span>
        {title}
      </div>
      {children}
    </section>
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
    <div className="grid w-full grid-cols-[1fr_1fr_68px] gap-2">
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

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">{label}</div>
      {children}
    </label>
  );
}
