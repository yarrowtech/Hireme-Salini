export const cn = (...x: Array<string | false | null | undefined>) => x.filter(Boolean).join(" ");

export const formatINR = (n: number) => `Rs ${Number(n || 0).toLocaleString("en-IN")}`;

export const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const formatISTTime = (date = new Date(), withSeconds = false) => {
  const text = date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hour12: true,
  });
  return text.replace(/\s?(am|pm)$/i, "");
};

export const formatIST24Time = (date = new Date()) =>
  date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export const formatDisplayTime = (value?: string | null) => {
  if (!value) return "";
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return String(value);
  const hour24 = Number(match[1]);
  const minute = match[2];
  if (!Number.isFinite(hour24)) return String(value);
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute}`;
};

export const getISTMinutes = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
};

export const readAuthUser = () => {
  try {
    const raw = localStorage.getItem("authUser");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const fallbackEmployee = () => {
  const user = readAuthUser();
  return {
    employeeId: user.employeeId || user.username || "EMP-001",
    name: user.name || user.employeeName || user.username || "Employee",
    role: user.role || "Employee",
    department: user.department || "General",
    designation: user.designation || user.role || "Employee",
    email: user.email || "",
    phone: user.phone || user.contact || "",
    shiftStart: "09:00",
    shiftEnd: "18:00",
    shiftName: "Day Shift",
    weeklyOff: "Sunday",
    workLocation: "Main Office",
    joiningDate: "",
    status: "ACTIVE",
    attendanceMode: "SELF",
  };
};

export const fallbackDashboard = (month = currentMonthKey()) => ({
  employee: fallbackEmployee(),
  company: {
    name: localStorage.getItem("companyName") || "Company",
    code: localStorage.getItem("companyCode") || readAuthUser().companyCode || "",
    email: "",
    phone: "",
  },
  todayAttendance: {
    date: new Date().toISOString().slice(0, 10),
    checkIn: null,
    checkOut: null,
    status: "NOT_MARKED",
    workingHours: 0,
  },
  monthlySummary: {
    month,
    workingDays: 26,
    presentDays: 0,
    absentDays: 0,
    paidLeave: 0,
    attendancePct: 0,
  },
  salary: {
    structure: null,
    latestPayroll: null,
    history: [],
  },
  recentAttendance: [],
});
