
import React, { useMemo, useRef, useState } from "react";
import {
  FaCrown,
  FaBolt,
  FaLeaf,
  FaCheckCircle,
  FaTimesCircle,
  FaCreditCard,
  FaRegClock,
  FaRedoAlt,
  FaShieldAlt,
  FaFileAlt,
  FaHistory,
  FaTrash,
  FaDownload,
} from "react-icons/fa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type PlanKey = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
type Billing = "MONTHLY" | "YEARLY";
type SubStatus = "ACTIVE" | "EXPIRED" | "NONE";

type Plan = {
  key: PlanKey;
  title: string;
  subtitle: string;
  tagline: string;
  icon: React.ReactNode;
  highlight?: boolean;
  features: string[];
  limits: {
    employees: string;
    hrlogin: string;
    reports: string;
    support: string;
  };
  pricing:
    | { type: "FIXED"; monthly: number; yearly: number }
    | { type: "CUSTOM" };
};

const cn = (...a: Array<string | false | undefined | null>) =>
  a.filter(Boolean).join(" ");

const PLANS: Plan[] = [
  {
    key: "STARTER",
    title: "Starter",
    subtitle: "Small teams & startups",
    tagline: "Best for individual companys & small startups",
    icon: <FaLeaf />,
    features: ["Up to 25 employees", "1 HR login", "Basic reports", "Email support"],
    limits: { employees: "25", hrlogin: "1", reports: "Basic", support: "Email" },
    pricing: { type: "FIXED", monthly: 999, yearly: 9990 },
  },
  {
    key: "PROFESSIONAL",
    title: "Professional",
    subtitle: "Growing business",
    tagline: "For growing companies with steady hiring needs",
    icon: <FaBolt />,
    highlight: true,
    features: ["Up to 100 employees", "3 HR login", "Advanced reports", "Priority support"],
    limits: { employees: "100", hrlogin: "3", reports: "Advanced", support: "Priority" },
    pricing: { type: "FIXED", monthly: 9999, yearly: 99990 },
  },
  {
    key: "ENTERPRISE",
    title: "Enterprise",
    subtitle: "Large organizations",
    tagline: "Custom setup, scale & dedicated support",
    icon: <FaCrown />,
    features: ["Unlimited employees", "Custom HR roles", "Admin dashboard", "API access", "Dedicated manager"],
    limits: { employees: "Unlimited", hrlogin: "Custom", reports: "Pro", support: "Dedicated" },
    pricing: { type: "CUSTOM" },
  },
];

const STORAGE_KEY = "companySubscription";

type SubHistoryItem = {
  planKey: PlanKey;
  billing: Billing;
  purchasedAt: string;
  expiresAt: string;
};

type StoredSubscription = {
  planKey: PlanKey;
  billing: Billing;
  purchasedAt: string;
  expiresAt: string;

  purchaseCount: number;
  renewCount: number;
  history: SubHistoryItem[];
};

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function priceText(plan: Plan, billing: Billing) {
  if (plan.pricing.type === "CUSTOM") return "Custom Pricing";
  const value = billing === "MONTHLY" ? plan.pricing.monthly : plan.pricing.yearly;
  return `${formatINR(value)} / ${billing === "MONTHLY" ? "month" : "year"}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysLeft(expiresAtISO: string) {
  const now = new Date();
  const exp = new Date(expiresAtISO);
  const diff = exp.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function safeReadSubscription(): StoredSubscription | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.planKey || !parsed?.expiresAt) return null;

    const purchaseCount = Number(parsed.purchaseCount ?? 1);
    const renewCount =
      typeof parsed.renewCount === "number" ? parsed.renewCount : Math.max(purchaseCount - 1, 0);

    const history: SubHistoryItem[] = Array.isArray(parsed.history) ? parsed.history : [];

    return {
      planKey: parsed.planKey,
      billing: parsed.billing,
      purchasedAt: parsed.purchasedAt,
      expiresAt: parsed.expiresAt,
      purchaseCount,
      renewCount,
      history,
    } as StoredSubscription;
  } catch {
    return null;
  }
}

function computeStatus(sub: StoredSubscription | null): SubStatus {
  if (!sub) return "NONE";
  return daysLeft(sub.expiresAt) >= 0 ? "ACTIVE" : "EXPIRED";
}

export default function companySubscription() {
  const exportRef = useRef<HTMLDivElement | null>(null);

  const [billing, setBilling] = useState<Billing>("MONTHLY");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("PROFESSIONAL");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  // ✅ history open state (button moved near billing toggle)
  const [historyOpen, setHistoryOpen] = useState(true);

  const [stored, setStored] = useState<StoredSubscription | null>(() => safeReadSubscription());

  const status: SubStatus = useMemo(() => computeStatus(stored), [stored]);

  const selectedPlanObj = useMemo(
    () => PLANS.find((p) => p.key === selectedPlan)!,
    [selectedPlan]
  );

  const accessBlocked = status !== "ACTIVE";
  const canPurchase = selectedPlanObj.pricing.type === "FIXED";

  const handlePurchase = () => {
    if (!canPurchase) return;

    const now = new Date();
    const expires = billing === "MONTHLY" ? addDays(now, 30) : addDays(now, 365);

    const prev = safeReadSubscription();
    const nextPurchaseCount = (prev?.purchaseCount ?? 0) + 1;
    const nextRenewCount = Math.max(nextPurchaseCount - 1, 0);

    const historyItem: SubHistoryItem = {
      planKey: selectedPlan,
      billing,
      purchasedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };

    const next: StoredSubscription = {
      planKey: selectedPlan,
      billing,
      purchasedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      purchaseCount: nextPurchaseCount,
      renewCount: nextRenewCount,
      history: [...(prev?.history ?? []), historyItem],
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStored(next);
    setConfirmOpen(false);
    setInvoiceOpen(true);
  };

  const handleRenew = () => setConfirmOpen(true);

  const handleRemoveLocal = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStored(null);
  };

  // ✅ Export to PDF (whole page inside exportRef)
  const exportToPDF = async () => {
    const node = exportRef.current;
    if (!node) return;

    // Ensure modals are closed (optional)
    // setConfirmOpen(false);
    // setInvoiceOpen(false);

    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#020617", // slate-950-ish
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // image size in pdf
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = position - pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save("company-Subscription.pdf");
  };

  return (
    <div className="min-h-[calc(100vh-40px)] w-full p-4 sm:p-6 lg:p-8">
      {/* ✅ Everything we want in PDF goes inside this wrapper */}
      <div ref={exportRef}>
        {/* HEADER */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-white">
                <FaShieldAlt className="text-cyan-300" />
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Subscription & Access
                </h1>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border",
                    status === "ACTIVE"
                      ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-200"
                      : status === "EXPIRED"
                      ? "bg-red-500/10 border-red-400/20 text-red-200"
                      : "bg-white/5 border-white/10 text-slate-200"
                  )}
                >
                  {status === "ACTIVE" ? (
                    <FaCheckCircle />
                  ) : status === "EXPIRED" ? (
                    <FaTimesCircle />
                  ) : (
                    <FaRegClock />
                  )}
                  {status === "ACTIVE"
                    ? "Subscription Active"
                    : status === "EXPIRED"
                    ? "Subscription Expired"
                    : "No Subscription Found"}
                </span>

                {stored && (
                  <span className="text-xs text-slate-400">
                    Expires:{" "}
                    <span className="text-slate-200 font-semibold">
                      {new Date(stored.expiresAt).toLocaleDateString()}
                    </span>{" "}
                    ({Math.max(daysLeft(stored.expiresAt), 0)} days left)
                  </span>
                )}
              </div>

              {/* Counts */}
              {stored && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                    Purchases:{" "}
                    <span className="text-white font-semibold">{stored.purchaseCount}</span>
                  </span>

                  <span className="text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                    Renewals:{" "}
                    <span className="text-white font-semibold">{stored.renewCount}</span>
                  </span>
                </div>
              )}
            </div>

            {/* ACCESS CARD */}
            <div
              className={cn(
                "rounded-2xl border p-4 sm:p-5 w-full sm:w-[360px]",
                accessBlocked
                  ? "border-red-500/20 bg-red-500/5"
                  : "border-emerald-500/20 bg-emerald-500/5"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-2xl grid place-items-center border",
                    accessBlocked
                      ? "bg-red-500/10 border-red-500/20 text-red-200"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                  )}
                >
                  {accessBlocked ? <FaTimesCircle /> : <FaCheckCircle />}
                </div>

                <div className="min-w-0">
                  <div className="text-white font-bold">
                    {accessBlocked ? "Service Locked" : "Service Unlocked"}
                  </div>
                  <div className="text-sm text-slate-300 mt-1">
                    {accessBlocked
                      ? "Your company must renew/purchase a subscription to continue accessing the services."
                      : "Your company can access all enabled services based on your plan limits."}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/30 text-cyan-100"
                >
                  <FaCreditCard />
                  {status === "ACTIVE" ? "Upgrade / Extend" : "Purchase Subscription"}
                </button>

                {stored && (
                  <>
                    <button
                      onClick={() => setInvoiceOpen(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border bg-white/5 hover:bg-white/10 border-white/10 text-white transition"
                    >
                      <FaFileAlt />
                      View Invoice
                    </button>

                    <button
                      onClick={handleRemoveLocal}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-200 transition"
                    >
                      <FaTrash />
                      Remove Local
                    </button>
                  </>
                )}
              </div>

              {status === "EXPIRED" && (
                <div className="mt-3 text-xs text-red-200/90">
                  Tip: Renew now to continue accessing the platform without interruption.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PLANS */}
        <div className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-white font-extrabold text-lg">Choose a Plan</div>
              <div className="text-sm text-slate-300 mt-1">
                Pick a plan and billing cycle. Renew anytime to continue access.
              </div>
            </div>

            {/* ✅ Right side actions: Monthly/Yearly + History + Export PDF */}
            <div className="flex flex-wrap items-center gap-2">
              {/* billing toggle */}
              <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
                <button
                  onClick={() => setBilling("MONTHLY")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-semibold transition",
                    billing === "MONTHLY"
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:text-white"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBilling("YEARLY")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-semibold transition",
                    billing === "YEARLY"
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:text-white"
                  )}
                >
                  Yearly <span className="text-xs text-emerald-200 ml-1"></span>
                </button>
              </div>

              {/* ✅ history toggle button moved here */}
              <button
                onClick={() => setHistoryOpen((s) => !s)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                  "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                )}
                title="Show/Hide history"
              >
                <FaHistory className="text-cyan-300" />
                History
                {stored?.history?.length ? (
                  <span className="ml-1 text-xs font-bold bg-white/10 border border-white/10 px-2 py-0.5 rounded-full">
                    {stored.history.length}
                  </span>
                ) : null}
              </button>

              {/* ✅ export pdf */}
              <button
                onClick={exportToPDF}
                className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/30 text-cyan-100"
              >
                <FaDownload />
                Export PDF
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {PLANS.map((p) => {
              const isSelected = selectedPlan === p.key;

              return (
                <button
                  key={p.key}
                  onClick={() => setSelectedPlan(p.key)}
                  className={cn(
                    "text-left rounded-3xl border p-5 transition relative overflow-hidden",
                    isSelected
                      ? "border-cyan-400/35 bg-gradient-to-b from-cyan-500/10 to-blue-500/5"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  )}
                >
                  

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-white font-extrabold text-lg">
                        <span className="text-cyan-300">{p.icon}</span>
                        {p.title}
                      </div>
                      <div className="text-sm text-slate-300 mt-1">{p.subtitle}</div>
                      <div className="text-xs text-slate-400 mt-1">{p.tagline}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-white font-extrabold text-base">
                        {priceText(p, billing)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <InfoPill label="Employees" value={p.limits.employees} />
                    <InfoPill label="HR Login" value={p.limits.hrlogin} />
                    <InfoPill label="Reports" value={p.limits.reports} />
                    <InfoPill label="Support" value={p.limits.support} />
                  </div>

                  <div className="mt-4 space-y-2">
                    {p.features.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-200">
                        <FaCheckCircle className="text-emerald-300" />
                        <span className="truncate">{f}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5">
                    <div
                      className={cn(
                        "w-full rounded-2xl px-4 py-3 text-center text-sm font-semibold border transition",
                        isSelected
                          ? "bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/30 text-cyan-100"
                          : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
                      )}
                    >
                      {isSelected ? "Selected" : "Select Plan"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="min-w-0">
              <div className="text-white font-bold">Selected Plan</div>
              <div className="text-sm text-slate-300 mt-1">
                {selectedPlanObj.title} • {billing} •{" "}
                <span className="text-white font-semibold">{priceText(selectedPlanObj, billing)}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Renew required if expired to continue accessing services.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/30 text-cyan-100 transition"
              >
                <FaCreditCard />
                {selectedPlanObj.pricing.type === "CUSTOM"
                  ? "Contact Sales"
                  : status === "ACTIVE"
                  ? "Upgrade / Extend"
                  : "Purchase"}
              </button>

              {status !== "ACTIVE" && (
                <button
                  onClick={handleRenew}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border bg-white/5 hover:bg-white/10 border-white/10 text-white transition"
                >
                  <FaRedoAlt />
                  Renew
                </button>
              )}
            </div>
          </div>
        </div>

        {/* HISTORY (toggle controlled by button near billing) */}
        {stored && historyOpen && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-white font-extrabold">
                <FaHistory className="text-cyan-300" />
                Subscription History
                <span className="ml-2 text-xs font-semibold text-slate-200 bg-white/10 border border-white/10 px-2 py-1 rounded-full">
                  {stored.history.length}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {stored.history
                .slice()
                .reverse()
                .map((h, i) => (
                  <div
                    key={`${h.purchasedAt}-${i}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="text-sm text-white font-semibold">
                      {h.planKey} • {h.billing}
                    </div>
                    <div className="text-xs text-slate-300">
                      {new Date(h.purchasedAt).toLocaleDateString()} →{" "}
                      {new Date(h.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* CONFIRM MODAL */}
      {confirmOpen && (
        <ModalShell onClose={() => setConfirmOpen(false)} title="Confirm Subscription">
          {selectedPlanObj.pricing.type === "CUSTOM" ? (
            <div className="text-sm text-slate-300">
              Enterprise uses <span className="text-white font-semibold">custom pricing</span>.
              Please contact sales to activate this plan.
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-2 transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm text-slate-300 leading-relaxed">
                You are about to purchase{" "}
                <span className="text-white font-semibold">{selectedPlanObj.title}</span>{" "}
                on <span className="text-white font-semibold">{billing}</span>.
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Price</span>
                  <span className="text-white font-bold">{priceText(selectedPlanObj, billing)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-slate-300">Duration</span>
                  <span className="text-white font-semibold">
                    {billing === "MONTHLY" ? "30 days" : "365 days"}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-2 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePurchase}
                  className="rounded-xl border border-cyan-400/30 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 font-semibold px-4 py-2 transition"
                >
                  Confirm & Pay 
                </button>
              </div>
            </>
          )}
        </ModalShell>
      )}

      {/* INVOICE MODAL */}
      {invoiceOpen && stored && (
        <ModalShell onClose={() => setInvoiceOpen(false)} title="Invoice">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-slate-300">
              Plan:{" "}
              <span className="text-white font-semibold">
                {PLANS.find((p) => p.key === stored.planKey)?.title}
              </span>
            </div>
            <div className="text-sm text-slate-300 mt-2">
              Billing: <span className="text-white font-semibold">{stored.billing}</span>
            </div>
            <div className="text-sm text-slate-300 mt-2">
              Purchased:{" "}
              <span className="text-white font-semibold">
                {new Date(stored.purchasedAt).toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-slate-300 mt-2">
              Expires:{" "}
              <span className="text-white font-semibold">
                {new Date(stored.expiresAt).toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-slate-300 mt-2">
              Purchases:{" "}
              <span className="text-white font-semibold">{stored.purchaseCount}</span> • Renewals:{" "}
              <span className="text-white font-semibold">{stored.renewCount}</span>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={() => setInvoiceOpen(false)}
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-2 transition"
            >
              Close
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

/* UI helpers */
function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-white truncate">{value}</div>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="text-white font-extrabold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white px-3 py-2 transition"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
        <div className="p-4 border-t border-white/10 text-xs text-slate-400 flex items-center gap-2">
          <FaRegClock className="text-slate-300" />
           mode: Payment is simulated .
        </div>
      </div>
    </div>
  );
}
