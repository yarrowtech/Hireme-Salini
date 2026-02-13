import React, { useMemo, useRef, useState } from "react";
import {
  IndianRupee,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Landmark,
  QrCode,
  CreditCard,
  Upload,
  ReceiptText,
  ArrowRight,
  Info,
  X,
  Download,
  FileText,
} from "lucide-react";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * ✅ FRONTEND ONLY
 * - No fetch
 * - No axios
 * - No backend
 * - Dummy data only
 */

type PayStatus = "PENDING" | "INITIATED" | "SUBMITTED" | "CONFIRMED" | "FAILED";
type PaymentMethod = "BANK_TRANSFER" | "UPI" | "CARD";

type EmployeeSalaryRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  month: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPay: number;
  status: PayStatus;
};

type PaymentTxn = {
  id: string;
  createdAt: string;
  companyName: string;
  month: string;
  method: PaymentMethod;
  amount: number;
  referenceNo: string;
  note?: string;
  proofName?: string;
  status: "SUBMITTED" | "CONFIRMED" | "FAILED";
};

const cn = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(" ");

const fmtINR = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const makeId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DEFAULT_COMPANY = "company Company"; // ✅ fixed value (manual typing removed)

/** demo wallet for funds check */
const COMPANY_BALANCE = 200000;

const STATUS_BADGE: Record<PayStatus, string> = {
  PENDING: "bg-white/10 border-white/15 text-slate-200",
  INITIATED: "bg-cyan-500/10 border-cyan-400/20 text-cyan-200",
  SUBMITTED: "bg-blue-500/10 border-blue-400/20 text-blue-200",
  CONFIRMED: "bg-emerald-500/10 border-emerald-400/20 text-emerald-200",
  FAILED: "bg-rose-500/10 border-rose-400/20 text-rose-200",
};

const statusIcon = (s: PayStatus) => {
  if (s === "CONFIRMED") return <CheckCircle2 size={16} />;
  if (s === "FAILED") return <XCircle size={16} />;
  return <Clock size={16} />;
};

const methodIcon = (m: PaymentMethod) => {
  if (m === "BANK_TRANSFER") return <Landmark size={16} />;
  if (m === "UPI") return <QrCode size={16} />;
  return <CreditCard size={16} />;
};

/** ✅ SAFE: works without ES2021 replaceAll */
const formatMethod = (m: PaymentMethod) => m.replace(/_/g, " ");

const seedRows = (): EmployeeSalaryRow[] => [
  {
    id: makeId("SAL"),
    employeeId: "EMP-1001",
    employeeName: "A. Roy",
    role: "Frontend Developer",
    month: "Dec 2025",
    baseSalary: 35000,
    bonus: 3000,
    deductions: 1200,
    netPay: 36800,
    status: "PENDING",
  },
  {
    id: makeId("SAL"),
    employeeId: "EMP-1002",
    employeeName: "K. Das",
    role: "Backend Developer",
    month: "Dec 2025",
    baseSalary: 42000,
    bonus: 4000,
    deductions: 1500,
    netPay: 44500,
    status: "PENDING",
  },
  {
    id: makeId("SAL"),
    employeeId: "EMP-1003",
    employeeName: "S. Khan",
    role: "HR Executive",
    month: "Dec 2025",
    baseSalary: 28000,
    bonus: 1500,
    deductions: 800,
    netPay: 28700,
    status: "INITIATED",
  },
  {
    id: makeId("SAL"),
    employeeId: "EMP-1004",
    employeeName: "R. Singh",
    role: "Support",
    month: "Dec 2025",
    baseSalary: 22000,
    bonus: 1000,
    deductions: 500,
    netPay: 22500,
    status: "CONFIRMED",
  },
];

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border", tone)}>
      {children}
    </span>
  );
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-3xl rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/90 to-blue-950/90 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-white/10">
          <div className="min-w-0">
            <div className="text-white text-xl font-bold">{title}</div>
            {subtitle ? <div className="text-slate-300/80 text-sm mt-1">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/** ---------- PDF HELPERS (SCROLL SAFE) ---------- */
/**
 * ✅ Exports FULL content even if list/history uses overflow scroll.
 * - Clones the element off-screen
 * - Turns any [data-scrollbox="true"] into overflow-visible for export
 */
async function exportElementToPdf(element: HTMLElement, fileName: string) {
  const clone = element.cloneNode(true) as HTMLElement;

  // Offscreen mount
  clone.style.position = "fixed";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  clone.style.width = `${element.scrollWidth || element.clientWidth}px`;
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";

  // Turn scroll boxes into full-height boxes in the clone
  const scrollBoxes = clone.querySelectorAll<HTMLElement>('[data-scrollbox="true"]');
  scrollBoxes.forEach((sb) => {
    sb.style.maxHeight = "none";
    sb.style.height = "auto";
    sb.style.overflow = "visible";
  });

  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#0b1220",
      useCORS: true,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    const imgProps = (pdf as any).getImageProperties(imgData);
    const imgW = pdfW;
    const imgH = (imgProps.height * imgW) / imgProps.width;

    let heightLeft = imgH;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
    heightLeft -= pdfH;

    while (heightLeft > 0) {
      position -= pdfH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      heightLeft -= pdfH;
    }

    pdf.save(fileName);
  } finally {
    document.body.removeChild(clone);
  }
}

function safeDate(d: string) {
  try {
    return new Date(d).toLocaleString("en-IN");
  } catch {
    return d;
  }
}

function receiptPdf(txn: PaymentTxn) {
  const pdf = new jsPDF("p", "mm", "a4");
  const w = pdf.internal.pageSize.getWidth();

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Transaction Receipt", w / 2, 18, { align: "center" });

  pdf.setDrawColor(180);
  pdf.line(14, 24, w - 14, 24);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  const rows: Array<[string, string]> = [
    ["Receipt ID", txn.id],
    ["Status", txn.status],
    ["Company", txn.companyName],
    ["Month", txn.month],
    ["Payment Method", formatMethod(txn.method)],
    ["Amount", `₹ ${fmtINR(txn.amount)}`],
    ["Reference / UTR", txn.referenceNo],
    ["Created At", safeDate(txn.createdAt)],
    ["Proof File", txn.proofName || "—"],
    ["Note", txn.note || "—"],
  ];

  let y = 34;
  for (const [k, v] of rows) {
    pdf.setFont("helvetica", "bold");
    pdf.text(`${k}:`, 14, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(String(v), 55, y);
    y += 9;
  }

  pdf.setDrawColor(180);
  pdf.line(14, y + 2, w - 14, y + 2);

  pdf.setFontSize(10);
  pdf.text("Generated from demo UI (no backend validation).", 14, y + 12);

  pdf.save(`receipt_${txn.referenceNo || txn.id}.pdf`);
}

/** ---------- VALIDATION ---------- */
function validateEmployees(list: EmployeeSalaryRow[]) {
  for (const emp of list) {
    if (!emp.employeeId?.trim() || !emp.employeeName?.trim()) {
      return "Invalid employee record detected (missing ID or Name).";
    }
    if (!emp.role?.trim()) return `Invalid role for ${emp.employeeName || emp.employeeId}`;
    if (emp.netPay <= 0) return `Invalid net pay for ${emp.employeeName}`;
    if (emp.status === "CONFIRMED") return `${emp.employeeName} is already paid.`;
  }
  return null;
}

export default function companySalaryPayment() {
  const displayCompany = DEFAULT_COMPANY;

  const [rows, setRows] = useState<EmployeeSalaryRow[]>(() => seedRows());
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("Dec 2025");
  const [statusFilter, setStatusFilter] = useState<PayStatus | "ALL">("ALL");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const [openPay, setOpenPay] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [referenceNo, setReferenceNo] = useState("");
  const [note, setNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  /** export refs */
  const salaryExportRef = useRef<HTMLDivElement | null>(null);
  const historyExportRef = useRef<HTMLDivElement | null>(null);

  const [txns, setTxns] = useState<PaymentTxn[]>(() => [
    {
      id: makeId("TXN"),
      createdAt: new Date().toISOString(),
      companyName: DEFAULT_COMPANY,
      month: "Nov 2025",
      method: "UPI",
      amount: 93200,
      referenceNo: "UPI-8H2K9P",
      note: "November salary payout batch",
      proofName: "payment_screenshot.png",
      status: "CONFIRMED",
    },
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.month !== month) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeId.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q)
      );
    });
  }, [rows, query, month, statusFilter]);

  const selectedRows = useMemo(() => filtered.filter((r) => selectedIds[r.id]), [filtered, selectedIds]);

  const payableAmount = useMemo(() => {
    const list = selectedRows.length ? selectedRows : filtered;
    return list
      .filter((r) => r.status !== "CONFIRMED")
      .reduce((s, r) => s + (r.netPay || 0), 0);
  }, [selectedRows, filtered]);

  const totals = useMemo(() => {
    const list = selectedRows.length ? selectedRows : filtered;
    const net = list.reduce((s, r) => s + (r.netPay || 0), 0);
    const covered = list.filter((r) => r.status === "CONFIRMED").length;
    const pending = list.filter((r) => r.status === "PENDING").length;
    const initiated = list.filter((r) => r.status === "INITIATED").length;
    const submitted = list.filter((r) => r.status === "SUBMITTED").length;
    return { net, covered, pending, initiated, submitted, count: list.length };
  }, [filtered, selectedRows]);

  const allChecked = useMemo(
    () => filtered.length > 0 && filtered.every((r) => selectedIds[r.id]),
    [filtered, selectedIds]
  );

  const toggleAll = () => {
    const next: Record<string, boolean> = { ...selectedIds };
    if (allChecked) filtered.forEach((r) => delete next[r.id]);
    else filtered.forEach((r) => (next[r.id] = true));
    setSelectedIds(next);
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const openPayModal = () => {
    const list = selectedRows.length ? selectedRows : filtered;
    const payables = list.filter((r) => r.status !== "CONFIRMED");
    if (!payables.length) return;

    const err = validateEmployees(payables);
    if (err) return alert(err);

    if (payableAmount > COMPANY_BALANCE) {
      alert("Insufficient funds to process this payment.");
      return;
    }

    setRows((prev) =>
      prev.map((r) =>
        payables.some((x) => x.id === r.id) && r.status === "PENDING" ? { ...r, status: "INITIATED" } : r
      )
    );

    setMethod("BANK_TRANSFER");
    setReferenceNo("");
    setNote("");
    setProofFile(null);
    setOpenPay(true);
  };

  const submitPayment = () => {
    if (!referenceNo.trim()) return alert("Please enter Reference / UTR / Transaction ID.");

    const list = selectedRows.length ? selectedRows : filtered;
    const payables = list.filter((r) => r.status !== "CONFIRMED");

    const err = validateEmployees(payables);
    if (err) return alert(err);

    if (payableAmount > COMPANY_BALANCE) return alert("Insufficient funds to process this payment.");

    setRows((prev) => prev.map((r) => (payables.some((x) => x.id === r.id) ? { ...r, status: "SUBMITTED" } : r)));

    setTxns((prev) => [
      {
        id: makeId("TXN"),
        createdAt: new Date().toISOString(),
        companyName: displayCompany,
        month,
        method,
        amount: payableAmount,
        referenceNo: referenceNo.trim(),
        note: note.trim() || undefined,
        proofName: proofFile?.name,
        status: "SUBMITTED",
      },
      ...prev,
    ]);

    setSelectedIds({});
    setOpenPay(false);
  };

  const markTxnConfirmedDemo = (txnId: string) => {
    setTxns((prev) => prev.map((t) => (t.id === txnId ? { ...t, status: "CONFIRMED" } : t)));
    setRows((prev) =>
      prev.map((r) => (r.month === month && r.status === "SUBMITTED" ? { ...r, status: "CONFIRMED" } : r))
    );
  };

  /** EXPORT */
  const exportSalaryPdf = async () => {
    if (!salaryExportRef.current) return;
    await exportElementToPdf(salaryExportRef.current, `salary_${displayCompany}_${month}.pdf`);
  };

  const exportHistoryPdf = async () => {
    if (!historyExportRef.current) return;
    await exportElementToPdf(historyExportRef.current, `payment_history_${displayCompany}.pdf`);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden">
      {/* glow bg */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white shadow-lg">
              <IndianRupee />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Company{" "}
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Salary Payment
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <div className="text-slate-300 text-sm flex items-center gap-2">
              <Users size={16} /> Employees (view)
            </div>
            <div className="text-white text-2xl font-bold mt-2">{totals.count}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <div className="text-slate-300 text-sm flex items-center gap-2">
              <IndianRupee size={16} /> Net Pay (view)
            </div>
            <div className="text-white text-2xl font-bold mt-2">₹ {fmtINR(totals.net)}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <div className="text-slate-300 text-sm flex items-center gap-2">
              <CheckCircle2 size={16} /> Confirmed
            </div>
            <div className="text-white text-2xl font-bold mt-2">{totals.covered}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <div className="text-slate-300 text-sm flex items-center gap-2">
              <Clock size={16} /> Pending / Init / Sub
            </div>
            <div className="text-white text-2xl font-bold mt-2">
              {totals.pending}/{totals.initiated}/{totals.submitted}
            </div>
          </div>
        </div>

        {/* Filters + Pay + Export */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-3xl p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative w-full md:w-[320px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300/70" size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search employee / id / role..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white outline-none focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="text-slate-200/80" size={16} />
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white outline-none"
                >
                  <option className="bg-slate-900" value="Dec 2025">
                    Dec 2025
                  </option>
                  <option className="bg-slate-900" value="Nov 2025">
                    Nov 2025
                  </option>
                  <option className="bg-slate-900" value="Oct 2025">
                    Oct 2025
                  </option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white outline-none"
                >
                  <option className="bg-slate-900" value="ALL">
                    All Status
                  </option>
                  <option className="bg-slate-900" value="PENDING">
                    Pending
                  </option>
                  <option className="bg-slate-900" value="INITIATED">
                    Initiated
                  </option>
                  <option className="bg-slate-900" value="SUBMITTED">
                    Submitted
                  </option>
                  <option className="bg-slate-900" value="CONFIRMED">
                    Confirmed
                  </option>
                  <option className="bg-slate-900" value="FAILED">
                    Failed
                  </option>
                </select>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="text-slate-200/80 text-sm inline-flex items-center gap-2">
                <Info size={16} />
                {selectedRows.length ? (
                  <span>
                    Selected: <b className="text-white">{selectedRows.length}</b> employees
                  </span>
                ) : (
                  <span>Select employees (optional) or pay full month.</span>
                )}
              </div>

              <button
                type="button"
                onClick={exportSalaryPdf}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold inline-flex items-center gap-2"
              >
                <Download size={16} /> Export Salary PDF
              </button>

              <button
                type="button"
                onClick={openPayModal}
                disabled={payableAmount <= 0}
                className={cn(
                  "px-4 py-3 rounded-2xl font-semibold text-white transition-all duration-300",
                  "bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg",
                  payableAmount <= 0 ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02]"
                )}
              >
                <span className="inline-flex items-center gap-2">
                  Pay HireMe <ArrowRight size={16} />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Salary Export Wrapper */}
        <div ref={salaryExportRef} className="space-y-4">
          <div className="bg-gradient-to-br from-slate-800/40 to-blue-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
            <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="text-white font-bold text-lg">Salary Payout List</div>
              <Pill tone="bg-white/10 border-white/15 text-slate-200">
                {selectedRows.length ? "Selected rows will be paid" : "Payable rows in current view"}
              </Pill>
            </div>

            {/* ✅ SCROLL SYSTEM (Salary List) */}
            <div
              data-scrollbox="true"
              className="max-h-[520px] overflow-y-auto overflow-x-auto"
            >
              <table className="min-w-[1100px] w-full text-left">
                {/* ✅ Sticky header while scrolling */}
                <thead className="text-slate-200/80 text-sm sticky top-0 z-10">
                  <tr className="bg-slate-900/70 backdrop-blur border-b border-white/10">
                    <th className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={toggleAll}
                        className="h-4 w-4 accent-cyan-400"
                      />
                    </th>
                    <th className="py-3 px-4 font-semibold">Employee</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Month</th>
                    <th className="py-3 px-4 font-semibold">Base</th>
                    <th className="py-3 px-4 font-semibold">Bonus</th>
                    <th className="py-3 px-4 font-semibold">Deductions</th>
                    <th className="py-3 px-4 font-semibold">Net Pay</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="text-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={!!selectedIds[r.id]}
                          onChange={() => toggleOne(r.id)}
                          className="h-4 w-4 accent-cyan-400"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{r.employeeName}</div>
                        <div className="text-xs text-slate-300/80">{r.employeeId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-200">{r.role}</td>
                      <td className="py-3 px-4 text-slate-200">{r.month}</td>
                      <td className="py-3 px-4 text-slate-200">₹ {fmtINR(r.baseSalary)}</td>
                      <td className="py-3 px-4 text-slate-200">₹ {fmtINR(r.bonus)}</td>
                      <td className="py-3 px-4 text-slate-200">₹ {fmtINR(r.deductions)}</td>
                      <td className="py-3 px-4 font-bold text-white">₹ {fmtINR(r.netPay)}</td>
                      <td className="py-3 px-4">
                        <Pill tone={STATUS_BADGE[r.status]}>
                          {statusIcon(r.status)} {r.status}
                        </Pill>
                      </td>
                    </tr>
                  ))}

                  {!filtered.length ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-300/80">
                        No rows matched for current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-4 border-t border-white/10 text-sm text-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                Payable Amount: <b className="text-white">₹ {fmtINR(payableAmount)}</b>
              </div>
              <div className="text-xs text-slate-300/70">
                Tip: Scroll list • Sticky header enabled • PDF exports full list
              </div>
            </div>
          </div>
        </div>

        {/* History Export Wrapper */}
        <div
          ref={historyExportRef}
          className="mt-8 bg-white/10 backdrop-blur-sm border border-white/15 rounded-3xl overflow-hidden"
        >
          <div className="px-4 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-white font-bold text-lg">Payment History (Company → HireMe)</div>

            <div className="flex items-center gap-3">
              <Pill tone="bg-white/10 border-white/15 text-slate-200">Latest first</Pill>
              <button
                type="button"
                onClick={exportHistoryPdf}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm inline-flex items-center gap-2"
              >
                <Download size={16} /> Export History PDF
              </button>
            </div>
          </div>

          {/* ✅ SCROLL SYSTEM (History) */}
          <div data-scrollbox="true" className="p-5 max-h-[560px] overflow-y-auto space-y-4">
            {txns.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-white font-semibold">
                    {t.companyName} • <span className="text-slate-200">{t.month}</span>
                  </div>
                  <div className="text-sm text-slate-300/80 mt-1 flex flex-wrap gap-2 items-center">
                    <span className="inline-flex items-center gap-2">
                      {methodIcon(t.method)} {formatMethod(t.method)}
                    </span>
                    <span>•</span>
                    <span>₹ {fmtINR(t.amount)}</span>
                    <span>•</span>
                    <span className="truncate">Ref: {t.referenceNo}</span>
                    {t.proofName ? (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-2">
                          <ReceiptText size={16} /> {t.proofName}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-300/60 mt-2">Created: {safeDate(t.createdAt)}</div>
                  {t.note ? <div className="text-xs text-slate-300/70 mt-2">{t.note}</div> : null}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Pill
                    tone={
                      t.status === "CONFIRMED"
                        ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-200"
                        : t.status === "FAILED"
                        ? "bg-rose-500/10 border-rose-400/20 text-rose-200"
                        : "bg-blue-500/10 border-blue-400/20 text-blue-200"
                    }
                  >
                    {t.status === "CONFIRMED" ? (
                      <CheckCircle2 size={16} />
                    ) : t.status === "FAILED" ? (
                      <XCircle size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                    {t.status}
                  </Pill>

                  <button
                    type="button"
                    onClick={() => receiptPdf(t)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm inline-flex items-center gap-2"
                  >
                    <FileText size={16} /> Receipt PDF
                  </button>

                  {t.status === "SUBMITTED" ? (
                    <button
                      type="button"
                      onClick={() => markTxnConfirmedDemo(t.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/20 border border-emerald-400/20 text-emerald-200 font-semibold text-sm"
                    >
                      Mark Confirmed 
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal */}
        <Modal
          open={openPay}
          title="Pay HireMe"
          subtitle="Frontend demo only. Enter reference and optional proof."
          onClose={() => setOpenPay(false)}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-1 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-white font-bold flex items-center gap-2">
                <ReceiptText size={18} /> Payment Summary
              </div>

              <div className="mt-4 space-y-3 text-slate-200/90 text-sm">
                <div className="flex items-center justify-between">
                  <span>Company</span>
                  <b className="text-white">{displayCompany}</b>
                </div>
                <div className="flex items-center justify-between">
                  <span>Month</span>
                  <b className="text-white">{month}</b>
                </div>
                <div className="flex items-center justify-between">
                  <span>Payable</span>
                  <b className="text-white">₹ {fmtINR(payableAmount)}</b>
                </div>
                <div className="flex items-center justify-between">
                  <span>Balance</span>
                  <b className={cn("text-white", payableAmount > COMPANY_BALANCE && "text-rose-200")}>
                    ₹ {fmtINR(COMPANY_BALANCE)}
                  </b>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-white font-bold flex items-center gap-2">
                <IndianRupee size={18} /> Payment Details
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-200/80 text-sm font-semibold">Payment Method</label>

                  {/* ✅ always clickable */}
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["BANK_TRANSFER", "UPI", "CARD"] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMethod(m);
                        }}
                        className={cn(
                          "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                          method === m
                            ? "bg-cyan-500/15 border-cyan-400/25 text-cyan-200"
                            : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {methodIcon(m)} {m === "BANK_TRANSFER" ? "Bank" : m}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 text-xs text-slate-300">
                    Selected: <b className="text-white">{method}</b>
                  </div>
                </div>

                <div>
                  <label className="text-slate-200/80 text-sm font-semibold">
                    Reference / UTR / Txn ID <span className="text-rose-300">*</span>
                  </label>
                  <input
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="UTR / UPI reference..."
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-slate-200/80 text-sm font-semibold">Note (optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Any note (optional)"
                    className="mt-2 w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-slate-200/80 text-sm font-semibold">Upload Proof (optional)</label>
                  <div className="mt-2 flex flex-col md:flex-row gap-3 md:items-center">
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      accept="image/*,.pdf"
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold inline-flex items-center gap-2"
                    >
                      <Upload size={16} /> Choose File
                    </button>

                    <div className="text-slate-300/80 text-sm truncate">{proofFile ? proofFile.name : "No file selected"}</div>

                    {proofFile ? (
                      <button
                        type="button"
                        onClick={() => setProofFile(null)}
                        className="px-4 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-400/20 text-rose-200 font-semibold"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-end">
                <button
                  type="button"
                  onClick={() => setOpenPay(false)}
                  className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={submitPayment}
                  disabled={payableAmount > COMPANY_BALANCE}
                  className={cn(
                    "px-4 py-3 rounded-2xl font-semibold text-white shadow-lg transition-all inline-flex items-center gap-2",
                    payableAmount > COMPANY_BALANCE
                      ? "bg-white/10 border border-white/15 opacity-60 cursor-not-allowed"
                      : "bg-gradient-to-r from-cyan-400 to-blue-500 hover:scale-[1.02]"
                  )}
                >
                  <Upload size={16} /> Submit Payment
                </button>
              </div>

              <div className="mt-4 text-xs text-slate-300/70">
                Demo UI only: no backend / no API calls. Export uses html2canvas + jsPDF.
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
