import React, { useEffect, useMemo, useState } from "react";
import { FaCrown, FaUsers, FaClock, FaArrowUp, FaSearch, FaCheck, FaTimes, FaEye } from "react-icons/fa";
import { toast } from "react-toastify";

// ✅ IMPORTANT: import from TS wrapper (NO .js)
import {
  getPendingCompanyRequests,
  getApprovedCompanyRequests,
  getRejectedCompanyRequests,
  approveCompanyRequest,
  rejectCompanyRequest,
  getCompanyDetails,
  getAdminPlans,
  updateCompanySubscription,
} from "../../api/admin.api";

type Tab = "Subscribers" | "Requests" | "History" | "Payments" | "Upgrade Plan";
type BillingCycle = "MONTHLY" | "YEARLY";

type AdminPlan = {
  key: string; // STARTER / PROFESSIONAL / ENTERPRISE
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  badges: Array<{ label: string; value: string }>;
  points: string[];
};

type CompanyRow = any;

const cn = (...x: Array<string | false | null | undefined>) => x.filter(Boolean).join(" ");

/* =========================
   ✅ STRICT company display helpers
   ✅ NO "name" fallback anywhere
   (so person name can never appear)
========================= */
function getCompanyName(row: any) {
  // your backend already returns company object -> CompanyName should exist
  // but we still add safe fallbacks for different DB shapes
  const v =
    row?.CompanyName ||
    row?.company_name ||
    row?.businessName ||
    row?.business_name ||
    row?.organizationName ||
    row?.organization_name ||
    row?.company_title ||
    row?.companyTitle ||
    row?.company ||
    row?.legalName ||
    row?.legal_name ||
    row?.tradeName ||
    row?.trade_name ||
    "";
  return String(v || "").trim() || "Company";
}

function getCompanyEmail(row: any) {
  const v = row?.companyEmail || row?.company_email || row?.email || "";
  return String(v || "").trim();
}

/* -------------------- Date helpers -------------------- */
function safeDate(d: any) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/* -------------------- API payload helpers -------------------- */
function pickRows(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

/* -------------------- Subscription helpers -------------------- */
function getPlanName(row: any) {
  return (
    row?.subscription?.planName ||
    row?.subscription?.plan ||
    row?.planKey ||
    row?.selectedPlan ||
    row?.planName ||
    row?.plan ||
    ""
  );
}

function getPlanAmount(row: any) {
  const raw =
    row?.subscription?.amount ??
    row?.planPrice ??
    row?.amount ??
    row?.planAmount ??
    row?.pricing?.amount ??
    0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

function getBillingCycle(row: any): BillingCycle {
  const raw = row?.subscription?.billingCycle || row?.billingCycle || row?.billing_cycle || "MONTHLY";
  const v = String(raw).toUpperCase();
  return v === "YEARLY" ? "YEARLY" : "MONTHLY";
}

function resolveStartDate(row: any) {
  const x = row?.subscription?.startDate || row?.planStartDate || row?.approvedAt || row?.createdAt || null;
  const dt = safeDate(x);
  return dt ? toISODate(dt) : "";
}

function resolveEndDate(row: any) {
  const x = row?.subscription?.endDate || row?.planEndDate || null;
  const dt = safeDate(x);
  return dt ? toISODate(dt) : "";
}

function isExpiredByEnd(endISO: string) {
  if (!endISO) return false;
  return new Date(endISO + "T23:59:59").getTime() < Date.now();
}

function statusBadge(endISO: string, planName: string) {
  if (!planName) return "No Plan";
  return isExpiredByEnd(endISO) ? "Expired" : "Active";
}

export default function AdminSubscription() {
  const [activeTab, setActiveTab] = useState<Tab>("Subscribers");
  const [loading, setLoading] = useState(true);

  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [pendingRows, setPendingRows] = useState<CompanyRow[]>([]);
  const [approvedRows, setApprovedRows] = useState<CompanyRow[]>([]);
  const [rejectedRows, setRejectedRows] = useState<CompanyRow[]>([]);

  const [query, setQuery] = useState("");

  // view modal
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewRow, setViewRow] = useState<any>(null);

  // upgrade state
  const [upgradeCompanyId, setUpgradeCompanyId] = useState<string>("");
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const [pRes, aRes, rRes, planRes] = await Promise.all([
          getPendingCompanyRequests(),
          getApprovedCompanyRequests(),
          getRejectedCompanyRequests(),
          getAdminPlans(),
        ]);

        if (!alive) return;

        setPendingRows(pickRows(pRes));
        setApprovedRows(pickRows(aRes));
        setRejectedRows(pickRows(rRes));
        setPlans(pickRows(planRes));
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Failed to load subscription data");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const allRows = useMemo(() => [...pendingRows, ...approvedRows, ...rejectedRows], [
    pendingRows,
    approvedRows,
    rejectedRows,
  ]);

  // ✅ FIX: search ONLY by CompanyName + companyEmail (no person name)
  const filteredSubscribers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = approvedRows || [];
    if (!q) return rows;

    return rows.filter((r: any) => {
      const name = getCompanyName(r).toLowerCase();
      const email = getCompanyEmail(r).toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [approvedRows, query]);

  const kpi = useMemo(() => {
    const totalApproved = approvedRows.length;

    const active = approvedRows.filter((r) => {
      const plan = getPlanName(r);
      const endISO = resolveEndDate(r);
      return plan && !isExpiredByEnd(endISO);
    }).length;

    const expired = approvedRows.filter((r) => {
      const plan = getPlanName(r);
      const endISO = resolveEndDate(r);
      return plan && isExpiredByEnd(endISO);
    }).length;

    const pending = pendingRows.length;

    return { totalApproved, active, expired, pending };
  }, [approvedRows, pendingRows]);

  const paymentsView = useMemo(() => {
    const paid = approvedRows
      .filter((r) => getPlanName(r) && getPlanAmount(r) > 0)
      .map((r) => ({
        id: String(r?._id),
        company: getCompanyName(r),
        email: getCompanyEmail(r),
        plan: getPlanName(r),
        amount: getPlanAmount(r),
        cycle: getBillingCycle(r),
        date: resolveStartDate(r) || "",
        status: "PAID" as const,
      }));

    const due = approvedRows
      .filter((r) => !getPlanName(r) || getPlanAmount(r) <= 0)
      .map((r) => ({
        id: String(r?._id),
        company: getCompanyName(r),
        email: getCompanyEmail(r),
        plan: getPlanName(r) || "No Plan",
        amount: getPlanAmount(r),
        cycle: getBillingCycle(r),
        date: resolveStartDate(r) || "",
        status: "DUE" as const,
      }));

    return { paid, due };
  }, [approvedRows]);

  async function refreshLists() {
    try {
      setLoading(true);
      const [pRes, aRes, rRes] = await Promise.all([
        getPendingCompanyRequests(),
        getApprovedCompanyRequests(),
        getRejectedCompanyRequests(),
      ]);
      setPendingRows(pickRows(pRes));
      setApprovedRows(pickRows(aRes));
      setRejectedRows(pickRows(rRes));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  async function onApprove(id: string) {
    try {
      await approveCompanyRequest(id);
      toast.success("Company approved");
      await refreshLists();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Approve failed");
    }
  }

  async function onReject(id: string) {
    const reason = window.prompt("Enter rejection reason") || "";
    if (!reason.trim()) return;
    try {
      await rejectCompanyRequest(id, { reason });
      toast.success("Company rejected");
      await refreshLists();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Reject failed");
    }
  }

  async function openView(companyId: string) {
    try {
      setViewOpen(true);
      setViewLoading(true);
      const res = await getCompanyDetails(companyId);
      // typical axios: res.data => { success, data: {...} }
      const row = res?.data?.data || res?.data || res;
      setViewRow(row);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load company details");
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  }

  function openUpgrade(companyId: string) {
    setUpgradeCompanyId(companyId);
    setActiveTab("Upgrade Plan");

    const row = approvedRows.find((r: any) => String(r?._id) === String(companyId));
    if (row) {
      setCycle(getBillingCycle(row));
      const pk = String(row?.planKey || row?.subscription?.planKey || "").toUpperCase();
      setSelectedPlanKey(pk || "");
    }
  }

  const upgradeTarget = useMemo(() => {
    if (!upgradeCompanyId) return null;
    return approvedRows.find((r: any) => String(r?._id) === String(upgradeCompanyId)) || null;
  }, [approvedRows, upgradeCompanyId]);

  const selectedPlan = useMemo(() => {
    if (!selectedPlanKey) return null;
    return plans.find((p) => String(p.key).toUpperCase() === String(selectedPlanKey).toUpperCase()) || null;
  }, [plans, selectedPlanKey]);

  async function submitUpgrade() {
    if (!upgradeTarget) return toast.info("Pick a subscriber first");
    if (!selectedPlan) return toast.info("Select a plan");

    const now = new Date();
    const startDate = toISODate(now);
    const endDate = cycle === "MONTHLY" ? toISODate(addDays(now, 30 - 1)) : toISODate(addDays(now, 365 - 1));

    const planPrice = cycle === "MONTHLY" ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice;

    try {
      await updateCompanySubscription(String(upgradeTarget._id), {
        planKey: selectedPlan.key,
        billingCycle: cycle,
        planPrice,
        startDate,
        endDate,
      });

      toast.success("Subscription updated");
      await refreshLists();
      setActiveTab("Subscribers");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Upgrade failed");
    }
  }

  const tabs: Tab[] = ["Subscribers", "Requests", "History", "Payments", "Upgrade Plan"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-400/20 grid place-items-center text-cyan-200">
              <FaCrown />
            </div>
            <div>
              <div className="text-xl font-extrabold text-white">Subscription</div>
              <div className="text-xs text-slate-400 mt-1">
                {loading ? "Loading…" : "Backend connected"}{" "}
                {loading ? "" : `• Approved: ${kpi.totalApproved} • Active: ${kpi.active}`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Kpi icon={<FaUsers />} label="Approved" value={kpi.totalApproved} />
            <Kpi icon={<FaCheck />} label="Active" value={kpi.active} />
            <Kpi icon={<FaTimes />} label="Expired" value={kpi.expired} />
            <Kpi icon={<FaClock />} label="Pending" value={kpi.pending} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "px-4 py-2 rounded-2xl text-sm font-extrabold transition border",
                activeTab === t
                  ? "border-cyan-400/30 bg-gradient-to-r from-cyan-500/25 via-blue-500/15 to-indigo-500/20 text-white shadow-lg"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW MODAL */}
      {viewOpen && (
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-white font-extrabold text-lg">Partner Details</div>
                <div className="text-xs text-slate-400 mt-1">Company + subscription + expiry</div>
              </div>
              <button
                onClick={() => setViewOpen(false)}
                className="px-3 py-2 rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              {viewLoading ? (
                <div className="text-slate-300">Loading…</div>
              ) : (
                <>
                  {/* ✅ CompanyName ONLY */}
                  <div className="text-white font-extrabold text-xl">{getCompanyName(viewRow)}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Email: <span className="text-slate-200">{getCompanyEmail(viewRow)}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-slate-400">Subscription</div>
                      <div className="text-white font-extrabold mt-1">{getPlanName(viewRow) || "No Plan"}</div>
                      <div className="text-xs text-slate-400 mt-2">
                        Amount: <span className="text-cyan-200 font-extrabold">₹{getPlanAmount(viewRow)}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">
                        Cycle: <span className="text-slate-200">{getBillingCycle(viewRow)}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-slate-400">Validity</div>
                      <div className="text-xs text-slate-400 mt-2">
                        Start: <span className="text-slate-200">{resolveStartDate(viewRow) || "-"}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-2">
                        End: <span className="text-slate-200">{resolveEndDate(viewRow) || "-"}</span>
                      </div>
                      <div className="mt-3">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-extrabold border",
                            statusBadge(resolveEndDate(viewRow), getPlanName(viewRow)) === "Active"
                              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                              : "border-rose-400/30 bg-rose-500/15 text-rose-200"
                          )}
                        >
                          {statusBadge(resolveEndDate(viewRow), getPlanName(viewRow))}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subscribers */}
      {activeTab === "Subscribers" && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 w-fit">
              <FaSearch className="text-slate-300" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search partner (company/email)"
                className="bg-transparent outline-none text-sm text-white placeholder:text-slate-500 w-[240px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-5 py-3 text-left">Partner</th>
                  <th className="px-5 py-3 text-left">Plan</th>
                  <th className="px-5 py-3 text-left">Start</th>
                  <th className="px-5 py-3 text-left">End</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {filteredSubscribers.map((r: any) => {
                  const id = String(r?._id);

                  // ✅ CompanyName ONLY (no row.name)
                  const CompanyName = getCompanyName(r);
                  const companyEmail = getCompanyEmail(r);

                  const plan = getPlanName(r);
                  const startISO = resolveStartDate(r);
                  const endISO = resolveEndDate(r);
                  const st = statusBadge(endISO, plan);

                  return (
                    <tr key={id} className="hover:bg-white/5">
                      <td className="px-5 py-3">
                        <div className="text-white font-semibold">{CompanyName}</div>
                        <div className="text-xs text-slate-500">{companyEmail}</div>
                      </td>

                      <td className="px-5 py-3 text-slate-200">
                        {plan ? (
                          <>
                            {plan} • <span className="text-cyan-200 font-extrabold">₹{getPlanAmount(r)}</span>
                          </>
                        ) : (
                          <span className="text-slate-400">No Plan</span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-slate-300">{startISO || "-"}</td>
                      <td className="px-5 py-3 text-slate-300">{endISO || "-"}</td>

                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-extrabold border",
                            st === "Active"
                              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                              : st === "Expired"
                              ? "border-rose-400/30 bg-rose-500/15 text-rose-200"
                              : "border-white/10 bg-white/5 text-slate-300"
                          )}
                        >
                          {st}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => openView(id)}
                            className="px-4 py-2 rounded-2xl border border-white/10 bg-white/5 text-slate-200 font-extrabold hover:bg-white/10"
                          >
                            <FaEye className="inline mr-2" />
                            View
                          </button>
                          <button
                            onClick={() => openUpgrade(id)}
                            className="px-4 py-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/15 text-cyan-100 font-extrabold hover:bg-cyan-500/20"
                          >
                            Upgrade
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredSubscribers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No subscribers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Requests (Pending) */}
      {activeTab === "Requests" && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
          {pendingRows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-slate-300">No pending requests</div>
          ) : (
            pendingRows.map((r: any) => {
              const id = String(r?._id);

              // ✅ CompanyName ONLY
              const CompanyName = getCompanyName(r);
              const companyEmail = getCompanyEmail(r);

              const plan = getPlanName(r);
              const amt = getPlanAmount(r);

              return (
                <div
                  key={id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div>
                    <div className="text-white font-extrabold">{CompanyName}</div>
                    <div className="text-xs text-slate-500">{companyEmail}</div>

                    <div className="mt-2 text-xs text-slate-400">
                      Selected Plan:{" "}
                      <span className="text-cyan-200 font-extrabold">
                        {plan || "Not selected"} {amt ? `• ₹${amt}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onApprove(id)}
                      className="px-4 py-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/15 text-emerald-200 font-extrabold"
                    >
                      <FaCheck className="inline mr-2" /> Approve
                    </button>
                    <button
                      onClick={() => onReject(id)}
                      className="px-4 py-2 rounded-2xl border border-rose-400/25 bg-rose-500/15 text-rose-200 font-extrabold"
                    >
                      <FaTimes className="inline mr-2" /> Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* History */}
      {activeTab === "History" && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          {allRows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-slate-300">No history yet</div>
          ) : (
            <div className="space-y-3">
              {allRows.map((r: any) => {
                const id = String(r?._id);

                // ✅ CompanyName ONLY
                const CompanyName = getCompanyName(r);
                const companyEmail = getCompanyEmail(r);
                const st = String(r?.status || "").toUpperCase();

                const badge =
                  st === "APPROVED"
                    ? "border-emerald-400/25 bg-emerald-500/15 text-emerald-200"
                    : st === "REJECTED"
                    ? "border-rose-400/25 bg-rose-500/15 text-rose-200"
                    : "border-amber-400/25 bg-amber-500/15 text-amber-200";

                return (
                  <div key={id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-white font-extrabold">{CompanyName}</div>
                        <div className="text-xs text-slate-500">{companyEmail}</div>
                      </div>
                      <span className={cn("px-3 py-1 rounded-full text-xs font-extrabold border", badge)}>
                        {st || "UNKNOWN"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">Registered: {resolveStartDate(r) || "-"}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Payments */}
      {activeTab === "Payments" && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-white font-extrabold mb-3">Paid</div>
              {paymentsView.paid.length === 0 ? (
                <div className="text-slate-400 text-sm">No paid payments</div>
              ) : (
                <div className="space-y-3">
                  {paymentsView.paid.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-white font-extrabold">{p.company}</div>
                        <div className="text-xs text-slate-500">
                          {p.plan} • {p.cycle} • Start: {p.date || "-"}
                        </div>
                      </div>
                      <div className="text-cyan-200 font-extrabold">₹{p.amount}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-white font-extrabold mb-3">Due</div>
              {paymentsView.due.length === 0 ? (
                <div className="text-slate-400 text-sm">No pending dues</div>
              ) : (
                <div className="space-y-3">
                  {paymentsView.due.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-white font-extrabold">{p.company}</div>
                        <div className="text-xs text-slate-200/80">
                          {p.plan} • {p.cycle}
                        </div>
                      </div>
                      <button
                        onClick={() => openUpgrade(p.id)}
                        className="px-4 py-2 rounded-2xl border border-cyan-400/25 bg-cyan-500/15 text-cyan-100 font-extrabold hover:bg-cyan-500/20"
                      >
                        Set Plan
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Plan */}
      {activeTab === "Upgrade Plan" && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="text-white font-extrabold text-lg">Choose a Plan</div>
              <div className="text-xs text-slate-400 mt-1">Pick a plan and billing cycle.</div>
            </div>

            <div className="inline-flex rounded-2xl border border-white/10 bg-black/30 p-1">
              <button
                onClick={() => setCycle("MONTHLY")}
                className={cn(
                  "px-4 py-2 rounded-2xl text-xs font-extrabold transition",
                  cycle === "MONTHLY" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setCycle("YEARLY")}
                className={cn(
                  "px-4 py-2 rounded-2xl text-xs font-extrabold transition",
                  cycle === "YEARLY" ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                )}
              >
                Yearly
              </button>
            </div>
          </div>

          {upgradeTarget ? (
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs text-slate-400">Partner</div>
              <div className="text-white font-extrabold text-lg">{getCompanyName(upgradeTarget)}</div>
              <div className="text-xs text-slate-400 mt-1">
                Current:{" "}
                <span className="text-cyan-200 font-extrabold">
                  {getPlanName(upgradeTarget) || "No Plan"} ₹{getPlanAmount(upgradeTarget) || 0}
                </span>{" "}
                • {resolveStartDate(upgradeTarget) || "-"} → {resolveEndDate(upgradeTarget) || "-"}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-black/30 p-4 text-slate-300">
              Open upgrade from <span className="text-white font-bold">Subscribers</span> → click{" "}
              <span className="text-cyan-200 font-bold">Upgrade</span>.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {plans.map((p) => {
              const isSelected = String(selectedPlanKey).toUpperCase() === String(p.key).toUpperCase();
              const price = cycle === "MONTHLY" ? p.monthlyPrice : p.yearlyPrice;
              const suffix = cycle === "MONTHLY" ? "/ month" : "/ year";

              return (
                <div
                  key={p.key}
                  className={cn(
                    "rounded-3xl border bg-black/30 p-5 transition",
                    isSelected
                      ? "border-cyan-400/40 shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_18px_40px_rgba(34,211,238,0.12)]"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-extrabold">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.tagline}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-extrabold text-lg">₹{price.toLocaleString()}</div>
                      <div className="text-xs text-slate-400">{suffix}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {p.badges.map((b, idx) => (
                      <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                        <div className="text-[10px] text-slate-400 font-bold">{b.label}</div>
                        <div className="text-xs text-white font-extrabold mt-1">{b.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    {p.points.map((t, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                        <span className="mt-[3px] inline-block w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-400/25" />
                        <span className="text-[13px]">{t}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    disabled={!upgradeTarget}
                    onClick={() => setSelectedPlanKey(p.key)}
                    className={cn(
                      "mt-5 w-full px-4 py-3 rounded-2xl border font-extrabold transition",
                      !upgradeTarget
                        ? "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
                        : isSelected
                        ? "border-cyan-400/30 bg-gradient-to-r from-cyan-500/35 via-blue-500/20 to-indigo-500/25 text-white"
                        : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                    )}
                  >
                    {isSelected ? "Selected" : "Select Plan"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="text-xs text-slate-400">Your selected plan will be attached to this partner.</div>

            <button
              onClick={submitUpgrade}
              disabled={!upgradeTarget || !selectedPlan}
              className={cn(
                "px-5 py-3 rounded-2xl border font-extrabold transition",
                upgradeTarget && selectedPlan
                  ? "border-cyan-400/25 bg-gradient-to-r from-cyan-500/25 via-blue-500/15 to-indigo-500/20 text-white"
                  : "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
              )}
            >
              <FaArrowUp className="inline mr-2" />
              Update Subscription
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- UI Parts -------------------- */
function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 min-w-[110px]">
      <div className="text-[11px] text-slate-400 flex items-center gap-2">
        <span className="text-cyan-200">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-lg font-extrabold text-white mt-1 leading-tight">{value}</div>
    </div>
  );
}
