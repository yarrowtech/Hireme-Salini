import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calculator,
  CheckCircle2,
  Download,
  FileText,
  IndianRupee,
  Landmark,
  Lock,
  Pencil,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import companyApi from "../../api/company.api.js";

type PayrollStatus = "DRAFT" | "CALCULATED" | "UNDER_REVIEW" | "APPROVED" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";

type PayrollItem = {
  _id?: string;
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  workingDays: number;
  presentDays: number;
  paidLeave: number;
  unpaidLeave: number;
  overtimeHours: number;
  grossSalary: number;
  attendanceDeduction: number;
  statutoryDeductions: number;
  totalDeductions: number;
  netSalary: number;
  status: PayrollStatus;
  payment?: {
    paymentDate?: string;
    paymentMethod?: string;
    amount?: number;
    referenceNo?: string;
    proofName?: string;
    paidBy?: string;
    confirmationDate?: string;
    failureReason?: string;
  };
};

type PayrollRun = {
  _id: string;
  month: string;
  periodStart: string;
  periodEnd: string;
  attendanceLocked: boolean;
  status: PayrollStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  items: PayrollItem[];
};

type SalaryStructure = {
  _id?: string;
  employeeId: string;
  effectiveFrom: string;
  currency: string;
  basic: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  bonus: number;
  overtimeRatePerHour: number;
  pf: number;
  esi: number;
  professionalTax: number;
  incomeTax: number;
  insurance: number;
  otherDeductions: number;
};

type MonthlyRow = {
  employeeId: string;
  workingDays: number;
  payableDays: number;
  attendancePct: number;
  estimatedNet: number;
  totals: {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    onLeave: number;
    overtimeHours: number;
  };
};

type Employee = {
  employeeId: string;
  name: string;
  department: string;
  role: string;
  status: string;
  companyCode: string;
};

const cn = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(" ");
const fmtINR = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const currentMonth = () => new Date().toISOString().slice(0, 7);
const num = (v: unknown) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
};

const statusTone: Record<string, string> = {
  DRAFT: "border-slate-200 bg-slate-50 text-slate-700",
  CALCULATED: "border-sky-200 bg-sky-50 text-sky-700",
  UNDER_REVIEW: "border-amber-200 bg-amber-50 text-amber-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PROCESSING: "border-sky-200 bg-sky-50 text-sky-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-600",
  NOT_CREATED: "border-slate-200 bg-slate-50 text-slate-600",
  NOT_SET: "border-slate-200 bg-slate-50 text-slate-600",
};

function structureGross(s?: SalaryStructure | null) {
  if (!s) return 0;
  return num(s.basic) + num(s.hra) + num(s.conveyance) + num(s.medicalAllowance) + num(s.specialAllowance) + num(s.bonus);
}
function structureFixedDeductions(s?: SalaryStructure | null) {
  if (!s) return 0;
  return num(s.pf) + num(s.esi) + num(s.professionalTax) + num(s.incomeTax) + num(s.insurance) + num(s.otherDeductions);
}

/** Mirrors backend utils/payrollCalc.computePayItem so the estimate matches the real run. */
function estimatePay(structure: SalaryStructure | null, monthly: MonthlyRow | undefined) {
  const workingDays = monthly?.workingDays || 30;
  const present = num(monthly?.totals?.present);
  const onLeave = num(monthly?.totals?.onLeave);
  const overtimeHours = num(monthly?.totals?.overtimeHours);
  const accounted = Math.min(workingDays, present + onLeave);
  const unpaidDays = Math.max(0, Math.round((workingDays - accounted) * 100) / 100);

  const gross = structureGross(structure);
  const perDay = workingDays ? gross / workingDays : 0;
  const attendanceDeduction = Math.round(perDay * unpaidDays);
  const overtimePay = Math.round(num(structure?.overtimeRatePerHour) * overtimeHours);
  const statutoryDeductions = structureFixedDeductions(structure);
  const totalDeductions = Math.round(attendanceDeduction + statutoryDeductions);
  const grossSalary = Math.round(gross + overtimePay);
  const netSalary = Math.max(0, Math.round(gross + overtimePay - totalDeductions));

  return { workingDays, present, onLeave, overtimeHours, unpaidDays, attendanceDeduction, statutoryDeductions, totalDeductions, grossSalary, netSalary, hasStructure: Boolean(structure) };
}

function normalizeRun(value: any): PayrollRun | null {
  if (!value?._id) return null;
  return {
    _id: String(value._id),
    month: String(value.month || currentMonth()),
    periodStart: String(value.periodStart || ""),
    periodEnd: String(value.periodEnd || ""),
    attendanceLocked: Boolean(value.attendanceLocked),
    status: String(value.status || "DRAFT") as PayrollStatus,
    totalGross: num(value.totalGross),
    totalDeductions: num(value.totalDeductions),
    totalNet: num(value.totalNet),
    items: Array.isArray(value.items) ? value.items : [],
  };
}

function blankStructure(employeeId: string, month: string): SalaryStructure {
  return {
    employeeId,
    effectiveFrom: `${month}-01`,
    currency: "INR",
    basic: 0,
    hra: 0,
    conveyance: 0,
    medicalAllowance: 0,
    specialAllowance: 0,
    bonus: 0,
    overtimeRatePerHour: 0,
    pf: 0,
    esi: 0,
    professionalTax: 0,
    incomeTax: 0,
    insurance: 0,
    otherDeductions: 0,
  };
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

export default function CompanySalaryPayment() {
  const [companyId, setCompanyId] = useState("");
  const [month, setMonth] = useState(currentMonth());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [structureByEmployee, setStructureByEmployee] = useState<Record<string, SalaryStructure>>({});
  const [monthlyByEmployee, setMonthlyByEmployee] = useState<Record<string, MonthlyRow>>({});
  const [run, setRun] = useState<PayrollRun | null>(null);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [structureForm, setStructureForm] = useState<SalaryStructure | null>(null);
  const [structureEmployeeName, setStructureEmployeeName] = useState("");

  const [payment, setPayment] = useState({
    paymentMethod: "BANK_TRANSFER",
    referenceNo: "",
    proofName: "",
    paidBy: "Company HR",
  });

  const load = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError("");
    try {
      const id = await companyApi.resolveCompanyId();
      if (!id) {
        setError("Company account was not found. Please log in again.");
        return;
      }
      setCompanyId(id);

      const [employeesRes, structuresRes, monthlyRes, payrollRes] = await Promise.all([
        companyApi.getCompanyEmployees(id),
        companyApi.getCompanySalaryStructures(id).catch(() => null),
        companyApi.getAttendanceMonthly(id, { month: targetMonth, limit: 1000 }).catch(() => null),
        companyApi.getCompanyPayroll(id, { month: targetMonth }).catch(() => null),
      ]);

      const list: Employee[] = (Array.isArray(employeesRes?.employees) ? employeesRes.employees : []).map((e: any) => ({
        employeeId: String(e.employeeId || e.id || ""),
        name: String(e.name || e.employeeName || "Employee"),
        department: String(e.department || "General"),
        role: String(e.designation || e.role || "Employee"),
        status: String(e.status || "ACTIVE").toUpperCase(),
        companyCode: String(e.companyCode || ""),
      }));
      setEmployees(list);

      const structs: Record<string, SalaryStructure> = {};
      for (const s of structuresRes?.salaryStructures || []) {
        const key = String(s.employeeId);
        // list is sorted effectiveFrom desc — keep the first (latest) per employee
        if (!structs[key]) {
          structs[key] = {
            _id: s._id,
            employeeId: key,
            effectiveFrom: String(s.effectiveFrom || ""),
            currency: String(s.currency || "INR"),
            basic: num(s.basic),
            hra: num(s.hra),
            conveyance: num(s.conveyance),
            medicalAllowance: num(s.medicalAllowance),
            specialAllowance: num(s.specialAllowance),
            bonus: num(s.bonus),
            overtimeRatePerHour: num(s.overtimeRatePerHour),
            pf: num(s.pf),
            esi: num(s.esi),
            professionalTax: num(s.professionalTax),
            incomeTax: num(s.incomeTax),
            insurance: num(s.insurance),
            otherDeductions: num(s.otherDeductions),
          };
        }
      }
      setStructureByEmployee(structs);

      const monthly: Record<string, MonthlyRow> = {};
      for (const r of monthlyRes?.rows || []) {
        monthly[String(r.employeeId)] = {
          employeeId: String(r.employeeId),
          workingDays: num(r.workingDays),
          payableDays: num(r.payableDays),
          attendancePct: num(r.attendancePct),
          estimatedNet: num(r.estimatedNet),
          totals: {
            present: num(r.totals?.present),
            absent: num(r.totals?.absent),
            late: num(r.totals?.late),
            halfDay: num(r.totals?.halfDay),
            onLeave: num(r.totals?.onLeave),
            overtimeHours: num(r.totals?.overtimeHours),
          },
        };
      }
      setMonthlyByEmployee(monthly);

      const current = normalizeRun(payrollRes?.payrollRun);
      setRun(current?.month === targetMonth ? current : null);
      setSelected({});
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load payroll data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(month);
  }, [load, month]);

  const runItemByEmployee = useMemo(() => {
    const map: Record<string, PayrollItem> = {};
    for (const item of run?.items || []) map[String(item.employeeId)] = item;
    return map;
  }, [run]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees
      .filter((e) => e.status !== "INACTIVE")
      .filter(
        (e) =>
          !q ||
          [e.employeeId, e.name, e.department, e.role].some((v) => String(v || "").toLowerCase().includes(q))
      )
      .map((employee) => {
        const structure = structureByEmployee[employee.employeeId] || null;
        const monthly = monthlyByEmployee[employee.employeeId];
        const estimate = estimatePay(structure, monthly);
        const item = runItemByEmployee[employee.employeeId];
        return { employee, structure, monthly, estimate, item };
      });
  }, [employees, monthlyByEmployee, query, runItemByEmployee, structureByEmployee]);

  const totals = useMemo(() => {
    const withStructure = rows.filter((r) => r.structure).length;
    const estNet = rows.reduce((sum, r) => sum + (r.item ? num(r.item.netSalary) : r.estimate.netSalary), 0);
    const estGross = rows.reduce((sum, r) => sum + (r.item ? num(r.item.grossSalary) : r.estimate.grossSalary), 0);
    const paid = (run?.items || []).filter((i) => i.status === "PAID").length;
    const awaiting = (run?.items || []).filter((i) => ["APPROVED", "PROCESSING"].includes(i.status)).length;
    const failed = (run?.items || []).filter((i) => i.status === "FAILED").length;
    const completion = run?.items?.length ? Math.round((paid / run.items.length) * 100) : 0;
    return { withStructure, estNet, estGross, paid, awaiting, failed, completion };
  }, [rows, run]);

  const runStatus = run?.status || "NOT_CREATED";
  const canLock = Boolean(run) && !run?.attendanceLocked && !["PAID", "PROCESSING", "APPROVED"].includes(runStatus);
  const canCalculate = Boolean(run?.attendanceLocked) && !["PAID"].includes(runStatus);
  const canApprove = ["CALCULATED", "UNDER_REVIEW"].includes(runStatus);
  const canPay = ["APPROVED", "PROCESSING", "FAILED"].includes(runStatus);

  const runAction = async (action: "create" | "lock" | "calculate" | "approve") => {
    setSaving(true);
    setNotice("");
    try {
      let res: any = null;
      if (action === "create") res = await companyApi.createPayrollRun(companyId, { month });
      if (action === "lock" && run?._id) res = await companyApi.lockPayrollAttendance(companyId, run._id, { force: true });
      if (action === "calculate" && run?._id) res = await companyApi.calculatePayrollRun(companyId, run._id);
      if (action === "approve" && run?._id) res = await companyApi.approvePayrollRun(companyId, run._id, { approvedBy: "Company HR" });
      const next = normalizeRun(res?.payrollRun);
      if (next) setRun(next);
      await load(month);
      setNotice(
        action === "create"
          ? "Payroll month created. Lock attendance next."
          : action === "lock"
          ? "Attendance locked for this month. You can now calculate payroll."
          : action === "calculate"
          ? "Payroll calculated from locked attendance."
          : "Payroll approved. Record payments below."
      );
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Payroll action failed.");
    } finally {
      setSaving(false);
    }
  };

  const confirmPayment = async (scope: "selected" | "all") => {
    if (!run?._id) return;
    if (!payment.referenceNo.trim()) {
      alert("Enter a bank reference / UTR before confirming payment.");
      return;
    }
    const ids =
      scope === "all"
        ? (run.items || []).filter((i) => ["APPROVED", "PROCESSING", "FAILED"].includes(i.status)).map((i) => String(i.employeeId))
        : Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) {
      alert(scope === "all" ? "No approved employees to pay." : "Select at least one employee.");
      return;
    }
    if (!window.confirm(`Mark ${ids.length} employee(s) as PAID for ${run.month}?`)) return;
    setSaving(true);
    try {
      const res = await companyApi.confirmPayrollPayment(companyId, run._id, {
        ...payment,
        employeeIds: ids,
        paymentDate: new Date().toISOString(),
      });
      const next = normalizeRun(res?.payrollRun);
      if (next) setRun(next);
      setSelected({});
      setNotice(`Recorded payment for ${ids.length} employee(s).`);
      await load(month);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  const openStructure = (employeeId: string, name: string) => {
    setStructureForm(structureByEmployee[employeeId] || blankStructure(employeeId, month));
    setStructureEmployeeName(name);
  };

  const saveStructure = async () => {
    if (!structureForm) return;
    setSaving(true);
    try {
      const res = await companyApi.upsertCompanySalaryStructure(companyId, {
        ...structureForm,
        employeeName: structureEmployeeName,
        createdBy: "Company HR",
        notes: "Saved from salary & payroll page",
      });
      if (!res?.success) throw new Error(res?.message || "Salary structure was not saved.");
      setStructureForm(null);
      setNotice(`Salary structure saved for ${structureEmployeeName}.`);
      await load(month);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to save salary structure.");
    } finally {
      setSaving(false);
    }
  };

  const downloadPayslip = async (item: PayrollItem) => {
    if (!run) return;
    try {
      const res = await companyApi.getEmployeePayslip(companyId, item.employeeId, { month: run.month });
      const payslip = res?.payslip;
      if (!payslip) {
        alert("Payslip is available only after the payment is recorded.");
        return;
      }
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("Payslip", 105, 18, { align: "center" });
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      const lines: Array<[string, string]> = [
        ["Company", payslip.company?.CompanyName || "Company"],
        ["Employee", `${item.employeeName} (${item.employeeId})`],
        ["Department / Role", `${item.department} / ${item.role}`],
        ["Payroll Month", run.month],
        ["Working Days", String(item.workingDays)],
        ["Present Days", String(item.presentDays)],
        ["Paid Leave", String(item.paidLeave)],
        ["Unpaid Leave", String(item.unpaidLeave)],
        ["Overtime Hours", String(item.overtimeHours)],
        ["Gross Salary", `INR ${fmtINR(item.grossSalary)}`],
        ["Attendance Deduction", `INR ${fmtINR(item.attendanceDeduction)}`],
        ["Statutory Deductions", `INR ${fmtINR(item.statutoryDeductions)}`],
        ["Total Deductions", `INR ${fmtINR(item.totalDeductions)}`],
        ["Net Salary", `INR ${fmtINR(item.netSalary)}`],
        ["Payment Date", item.payment?.paymentDate ? new Date(item.payment.paymentDate).toLocaleDateString("en-IN") : "-"],
        ["Payment Method", item.payment?.paymentMethod || "-"],
        ["Transaction Reference", item.payment?.referenceNo || "-"],
      ];
      lines.forEach(([label, value], index) => {
        const y = 32 + index * 8.5;
        pdf.setFont("helvetica", "bold");
        pdf.text(`${label}:`, 14, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(String(value), 78, y);
      });
      pdf.save(`payslip_${item.employeeId}_${run.month}.pdf`);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to generate payslip.");
    }
  };

  const exportCsv = () => {
    downloadCsv(
      `salary-register-${month}.csv`,
      [
        "Employee ID",
        "Name",
        "Department",
        "Role",
        "Month",
        "Structure Gross",
        "Fixed Deductions",
        "OT Rate/hr",
        "Working Days",
        "Present",
        "Paid Leave",
        "Absent",
        "Unpaid Days",
        "Overtime Hours",
        "Estimated Gross",
        "Attendance Deduction",
        "Estimated Net",
        "Payroll Status",
        "Paid Amount",
        "Payment Reference",
      ],
      rows.map(({ employee, structure, estimate, item }) => [
        employee.employeeId,
        employee.name,
        employee.department,
        employee.role,
        month,
        structureGross(structure),
        structureFixedDeductions(structure),
        num(structure?.overtimeRatePerHour),
        estimate.workingDays,
        estimate.present,
        estimate.onLeave,
        num(monthlyByEmployee[employee.employeeId]?.totals?.absent),
        estimate.unpaidDays,
        estimate.overtimeHours,
        item ? item.grossSalary : estimate.grossSalary,
        item ? item.attendanceDeduction : estimate.attendanceDeduction,
        item ? item.netSalary : estimate.netSalary,
        item?.status || (structure ? "NOT_CREATED" : "NOT_SET"),
        item?.payment?.amount || "",
        item?.payment?.referenceNo || "",
      ])
    );
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700/80">Employee Operations</div>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Salary &amp; Payroll</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Salary structures and the {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })} attendance
              register feed a live net-pay estimate for every employee. Lock the month, calculate on the server, approve, then record payments.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonth())}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none"
            />
            <button onClick={() => load(month)} className={buttonClass}><RefreshCw size={16} /> Refresh</button>
            <button onClick={exportCsv} className={buttonClass}><Download size={16} /> Export CSV</button>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} className="text-xs font-bold text-emerald-700 hover:text-emerald-900">Dismiss</button>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Employees" value={String(rows.length)} icon={<FileText size={18} />} />
        <Kpi label="Salary structure set" value={`${totals.withStructure} / ${rows.length}`} icon={<ShieldCheck size={18} />} />
        <Kpi label={run ? "Payroll net (this run)" : "Estimated monthly net"} value={`INR ${fmtINR(run ? run.totalNet : totals.estNet)}`} icon={<IndianRupee size={18} />} />
        <Kpi label="Awaiting payment" value={String(totals.awaiting)} icon={<Landmark size={18} />} />
        <Kpi label="Completion" value={`${totals.completion}%`} icon={<CheckCircle2 size={18} />} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Run status:</span>
          <span className={cn("rounded-full border px-2 py-0.5 font-bold", statusTone[runStatus] || statusTone.DRAFT)}>{runStatus.replace(/_/g, " ")}</span>
          {run ? <span>· Attendance {run.attendanceLocked ? "locked" : "open"}</span> : null}
          {run ? <span>· {run.periodStart} → {run.periodEnd}</span> : null}
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          <WorkflowButton disabled={saving || Boolean(run)} onClick={() => runAction("create")} icon={<FileText size={16} />} label="Create payroll month" />
          <WorkflowButton disabled={saving || !canLock} onClick={() => runAction("lock")} icon={<Lock size={16} />} label="Lock attendance" />
          <WorkflowButton disabled={saving || !canCalculate} onClick={() => runAction("calculate")} icon={<Calculator size={16} />} label="Calculate payroll" />
          <WorkflowButton disabled={saving || !canApprove} onClick={() => runAction("approve")} icon={<ShieldCheck size={16} />} label="Approve payroll" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-lg font-extrabold text-slate-900">Salary Register</div>
              <div className="mt-1 text-xs text-slate-500">Estimate uses the latest salary structure and this month's saved attendance. Locked runs show server-calculated figures.</div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search size={16} className="text-slate-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search employee..." className="bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-500" />
            </div>
          </div>

          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead className="sticky top-0 bg-white text-slate-600">
                <tr className="border-b border-slate-200">
                  {canPay ? <th className="px-3 py-3" /> : null}
                  {["Employee", "Structure", "Attendance (month)", "Est. gross", "Deductions", "Est. net", "Payroll", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-900">
                {rows.map(({ employee, structure, estimate, item }) => {
                  const gross = item ? num(item.grossSalary) : estimate.grossSalary;
                  const net = item ? num(item.netSalary) : estimate.netSalary;
                  const attDed = item ? num(item.attendanceDeduction) : estimate.attendanceDeduction;
                  const statDed = item ? num(item.statutoryDeductions) : estimate.statutoryDeductions;
                  const payable = canPay && item && ["APPROVED", "PROCESSING", "FAILED"].includes(item.status);
                  return (
                    <tr key={employee.employeeId} className="border-t border-slate-200 hover:bg-sky-50">
                      {canPay ? (
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            disabled={!payable}
                            checked={Boolean(selected[employee.employeeId])}
                            onChange={(e) => setSelected((p) => ({ ...p, [employee.employeeId]: e.target.checked }))}
                            className="h-4 w-4 accent-sky-500 disabled:opacity-30"
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <div className="font-bold">{employee.name}</div>
                        <div className="text-xs text-slate-500">{employee.employeeId} · {employee.department} · {employee.role}</div>
                      </td>
                      <td className="px-4 py-3">
                        {structure ? (
                          <>
                            <div className="font-semibold">INR {fmtINR(structureGross(structure))}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              Fixed ded. INR {fmtINR(structureFixedDeductions(structure))}
                              {structure.overtimeRatePerHour ? ` · OT INR ${fmtINR(structure.overtimeRatePerHour)}/h` : ""}
                            </div>
                          </>
                        ) : (
                          <span className="rounded-full border border-slate-400/20 bg-slate-400/10 px-2 py-0.5 text-xs font-bold text-slate-600">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">
                          {estimate.present} / {estimate.workingDays} present
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Leave {estimate.onLeave} · Absent {num(monthlyByEmployee[employee.employeeId]?.totals?.absent)} · Unpaid {estimate.unpaidDays}d · OT {estimate.overtimeHours}h
                        </div>
                      </td>
                      <td className="px-4 py-3">INR {fmtINR(gross)}</td>
                      <td className="px-4 py-3">
                        <div>INR {fmtINR(item ? num(item.totalDeductions) : estimate.totalDeductions)}</div>
                        <div className="mt-1 text-xs text-slate-500">Att. {fmtINR(attDed)} · Stat. {fmtINR(statDed)}</div>
                      </td>
                      <td className="px-4 py-3 font-extrabold">INR {fmtINR(net)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", statusTone[item?.status || (structure ? "NOT_CREATED" : "NOT_SET")] || statusTone.DRAFT)}>
                          {(item?.status || (structure ? "NOT_CREATED" : "NOT_SET")).replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openStructure(employee.employeeId, employee.name)} className={smallButtonClass}>
                            <Pencil size={13} /> {structure ? "Edit" : "Set"} salary
                          </button>
                          <button
                            disabled={item?.status !== "PAID"}
                            onClick={() => item && downloadPayslip(item)}
                            className={cn(smallButtonClass, "disabled:opacity-30")}
                          >
                            <Download size={13} /> Payslip
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && !rows.length ? (
                  <tr>
                    <td colSpan={canPay ? 9 : 8} className="px-4 py-12 text-center text-slate-600">
                      No active employees found. Add employees on the Service page first.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Record Payment</div>
            <p className="mt-1 text-xs text-slate-500">
              Available after the run is approved. Payments are recorded manually against the bank transfer you completed.
            </p>
          </div>
          <div className="space-y-3">
            <Field label="Payment method">
              <select value={payment.paymentMethod} onChange={(e) => setPayment((p) => ({ ...p, paymentMethod: e.target.value }))} className={inputClass}>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Bank reference / UTR">
              <input value={payment.referenceNo} onChange={(e) => setPayment((p) => ({ ...p, referenceNo: e.target.value }))} className={inputClass} placeholder="UTR / reference" />
            </Field>
            <Field label="Payment proof name">
              <input value={payment.proofName} onChange={(e) => setPayment((p) => ({ ...p, proofName: e.target.value }))} className={inputClass} placeholder="proof.pdf" />
            </Field>
            <Field label="Paid by">
              <input value={payment.paidBy} onChange={(e) => setPayment((p) => ({ ...p, paidBy: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <div className="space-y-2">
            <button disabled={saving || !canPay || !selectedCount} onClick={() => confirmPayment("selected")} className={cn(primaryButtonClass, "w-full")}>
              <Send size={15} /> Pay selected ({selectedCount})
            </button>
            <button disabled={saving || !canPay} onClick={() => confirmPayment("all")} className={cn(buttonClass, "w-full")}>
              <Send size={15} /> Pay all approved
            </button>
          </div>
          {totals.failed ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
              <XCircle size={14} /> {totals.failed} payment(s) marked failed — re-record to retry.
            </div>
          ) : null}
        </aside>
      </div>

      {structureForm ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="text-lg font-extrabold text-slate-900">Salary structure — {structureEmployeeName}</div>
              <button onClick={() => setStructureForm(null)} className={smallButtonClass}>Close</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Field label="Effective from">
                <input type="date" value={structureForm.effectiveFrom} onChange={(e) => setStructureForm((p) => (p ? { ...p, effectiveFrom: e.target.value } : p))} className={inputClass} />
              </Field>
              {(
                [
                  ["basic", "Basic"],
                  ["hra", "HRA"],
                  ["conveyance", "Conveyance"],
                  ["medicalAllowance", "Medical allowance"],
                  ["specialAllowance", "Special allowance"],
                  ["bonus", "Bonus"],
                  ["overtimeRatePerHour", "Overtime rate / hour"],
                  ["pf", "PF"],
                  ["esi", "ESI"],
                  ["professionalTax", "Professional tax"],
                  ["incomeTax", "Income tax (TDS)"],
                  ["insurance", "Insurance"],
                  ["otherDeductions", "Other deductions"],
                ] as Array<[keyof SalaryStructure, string]>
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    inputMode="numeric"
                    value={String(structureForm[key] ?? "")}
                    onChange={(e) =>
                      setStructureForm((p) => (p ? { ...p, [key]: e.target.value === "" ? 0 : Number(e.target.value) || 0 } : p))
                    }
                    className={inputClass}
                    placeholder="0"
                  />
                </Field>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">
              <span>Monthly gross</span>
              <span className="font-extrabold">INR {fmtINR(structureGross(structureForm))}</span>
              <span>Fixed deductions</span>
              <span className="font-extrabold">INR {fmtINR(structureFixedDeductions(structureForm))}</span>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setStructureForm(null)} className={buttonClass}>Cancel</button>
              <button disabled={saving} onClick={saveStructure} className={primaryButtonClass}>Save salary structure</button>
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
          <div className="mt-1 text-lg font-black text-slate-900">{value}</div>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700">{icon}</span>
      </div>
    </div>
  );
}

function WorkflowButton({ disabled, onClick, icon, label }: { disabled: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button disabled={disabled} onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-100 px-4 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40">
      {icon} {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-semibold uppercase text-slate-500">{label}</div>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-500";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
const primaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-100 px-4 py-3 text-sm font-bold text-sky-700 hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40";
const smallButtonClass = "inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-900 hover:bg-slate-50";
