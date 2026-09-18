import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBuilding,
  FaPhoneAlt,
  FaEnvelope,
  FaIdCard,
  FaMapMarkerAlt,
  FaFilePdf,
  FaTimes,
  FaEye,
  FaDownload,
  FaUserTie,
  FaCrown,
  FaCalendarAlt,
  FaCheck,
  FaBan,
  FaSpinner,
  FaTrash,
} from "react-icons/fa";
import { toast } from "react-toastify";
import api, { buildFileUrl } from "../../api/axios.js";

import {
  getPendingCompanyRequests,
  getApprovedCompanyRequests,
  getRejectedCompanyRequests,
  approveCompanyRequest,
  rejectCompanyRequest,
  getCompanyDocuments,
  getCompanyDocument,
  getCompanyDocumentBlob,
  deleteCompany,
  getCompanyDetails,
} from "../../api/admin.api.js";

/* ===================== TYPES ===================== */
type DocKey = "PAN" | "ESI" | "PF" | "MOA" | "MSME" | "GST" | "TRADE";
type PartnerDocs = Partial<Record<DocKey, { url: string; name: string }>>;

type SubscriptionInfo = {
  planName: string;
  planKey?: string;
  amount: number;
  status: string;
  startDate: string;
  endDate: string;
};

type Partner = {
  id: string;
  companyCode?: string;
  partnerName: string;
  companyName: string;
  contactNumber: string;
  email: string;
  cinNumber: string;
  panNumber: string;
  companyAddress: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  createdAt: string;
  subscription?: SubscriptionInfo;
  docs: PartnerDocs;
};

type HistoryItem = {
  id: number;
  name: string;
  action: "Approved" | "Rejected";
  time: string;
};

const cn = (...x: Array<string | false | null | undefined>) => x.filter(Boolean).join(" ");
const unwrap = (res: any) => {
  if (!res || typeof res !== "object") return res;
  if ("success" in res && "data" in res) return res.data; // ✅ your backend
  if ("data" in res) return res.data;
  return res;
};


/* ===================== DOC META ===================== */
const DOC_META: Array<{
  key: DocKey;
  title: string;
  required: boolean;
  placeholder: string;
}> = [
  { key: "PAN", title: "PAN Card", required: true, placeholder: "Click to view PAN Card" },
  { key: "ESI", title: "ESI Certificate", required: true, placeholder: "Click to view ESI Certificate" },
  { key: "PF", title: "PF Registration", required: true, placeholder: "Click to view PF Registration" },
  { key: "MOA", title: "MOA Document", required: true, placeholder: "Click to view MOA Document" },
  { key: "MSME", title: "MSME Certificate", required: false, placeholder: "Click to view MSME Certificate" },
  { key: "GST", title: "GST Certificate", required: true, placeholder: "Click to view GST Certificate" },
  { key: "TRADE", title: "Trade License", required: true, placeholder: "Click to view Trade License" },
];

function safeDate(val?: any) {
  if (!val) return "-";
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10); // ✅ always YYYY-MM-DD
  return String(val).slice(0, 10);
}

function addMonthsSafe(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

function addYearsSafe(date: Date, years: number) {
  const d = new Date(date);
  const month = d.getMonth();
  d.setFullYear(d.getFullYear() + years);
  if (d.getMonth() !== month) d.setDate(0);
  return d;
}

/* ===================== PLAN PICKER ===================== */
function pickPlan(doc: any): SubscriptionInfo | undefined {
  const planKey =
    doc?.planKey ||
    doc?.plan_key ||
    doc?.subscription?.planKey ||
    doc?.subscription?.plan_key ||
    doc?.pricing?.planKey ||
    doc?.pricing?.plan_key ||
    "";
  const planName =
    doc?.planName ||
    doc?.subscription?.planName ||
    doc?.pricing?.planName ||
    doc?.subscription?.plan ||
    doc?.pricing?.plan ||
    doc?.selectedPlan ||
    (planKey ? String(planKey) : "") ||
    "";

  const amount =
    Number(doc?.planPrice) ||
    Number(doc?.plan_price) ||
    Number(doc?.subscription?.planPrice) ||
    Number(doc?.subscription?.plan_price) ||
    Number(doc?.pricing?.planPrice) ||
    Number(doc?.pricing?.plan_price) ||
    Number(doc?.planAmount) ||
    Number(doc?.subscription?.amount) ||
    Number(doc?.pricing?.amount) ||
    Number(doc?.amount) ||
    0;

  const status =
    doc?.planStatus ||
    doc?.subscription?.status ||
    doc?.pricing?.status ||
    doc?.status ||
    "Pending";

  if (!planName && !planKey) return undefined;

  const startRaw =
    doc?.subscription?.startDate ||
    doc?.planStartDate ||
    doc?.approvedAt ||
    doc?.createdAt ||
    null;

  const endRaw =
    doc?.subscription?.endDate ||
    doc?.planEndDate ||
    null;

  const billing = String(
    doc?.subscription?.billingCycle || doc?.billingCycle || ""
  ).toUpperCase(); // MONTHLY/YEARLY

  const startD = startRaw ? new Date(startRaw) : null;
  let endD = endRaw ? new Date(endRaw) : null;

  // ✅ Fallback: if backend endDate is missing, compute from start + billingCycle
  if ((!endRaw || (endD && isNaN(endD.getTime()))) && startD && !isNaN(startD.getTime())) {
    endD = billing === "YEARLY" ? addYearsSafe(startD, 1) : addMonthsSafe(startD, 1);
  }

  return {
    planName: String(planName || planKey),
    planKey: planKey ? String(planKey) : undefined,
    amount,
    status: String(status || "Pending"),
    startDate: safeDate(startD),
    endDate: safeDate(endD),
  };
}


/* ===================== SMART DOC PICKER ===================== */
const DOC_ALIASES: Record<DocKey, string[]> = {
  PAN: ["PAN", "pan", "panCard", "pan_card", "pancard"],
  ESI: ["ESI", "esi", "esiCertificate", "esi_certificate"],
  PF: ["PF", "pf", "pfRegistration", "pf_registration"],
  MOA: ["MOA", "moa", "moaDocument", "moa_document"],
  MSME: ["MSME", "msme", "msmeCertificate", "msme_certificate"],
  GST: ["GST", "gst", "gstCertificate", "gst_certificate"],
  TRADE: ["TRADE", "trade", "tradeLicense", "trade_license", "tradeLicence", "trade_licence"],
};

function normalizeDocNode(node: any, fallbackName: string) {
  if (!node) return undefined;

  const n = node?.file || node?.document || node;

  const url =
    n?.url ||
    n?.secure_url ||
    n?.downloadUrl ||
    n?.download_url ||
    n?.path ||
    n?.link ||
    n?.Location ||
    "";

  const name =
    n?.name || n?.original_filename || n?.filename || n?.fileName || n?.file_name || fallbackName;

  if (!url) return undefined;
  return { url: String(url), name: String(name) };
}

function deepPickDoc(source: any, key: DocKey, fallbackName: string) {
  if (!source) return undefined;

  // Case: docs array like [{ key:"PAN", url:"..." }]
  if (Array.isArray(source)) {
    const found = source.find((x: any) =>
      DOC_ALIASES[key].includes(String(x?.key || x?.type || x?.docKey || "").trim())
    );
    return normalizeDocNode(found, fallbackName);
  }

  // Try alias keys directly on object
  for (const k of DOC_ALIASES[key]) {
    if (source?.[k]) {
      const out = normalizeDocNode(source[k], fallbackName);
      if (out?.url) return out;
    }
  }

  return undefined;
}

function pickDocs(doc: any): PartnerDocs {
  const containers = [
    doc?.docs,
    doc?.documents,
    doc?.files,
    doc?.data?.docs,
    doc?.data?.documents,
    doc?.data?.files,
    doc,
  ].filter(Boolean);

  const get = (key: DocKey, fallbackName: string) => {
    for (const c of containers) {
      const out = deepPickDoc(c, key, fallbackName);
      if (out?.url) return out;
    }
    return undefined;
  };

  return {
    PAN: get("PAN", "pan.pdf"),
    ESI: get("ESI", "esi.pdf"),
    PF: get("PF", "pf.pdf"),
    MOA: get("MOA", "moa.pdf"),
    MSME: get("MSME", "msme.pdf"),
    GST: get("GST", "gst.pdf"),
    TRADE: get("TRADE", "trade.pdf"),
  };
}

/* ===================== MAPPER ===================== */
function mapRequestToPartner(doc: any): Partner {
  return {
    id: String(doc?._id || doc?.id || ""),
    companyCode: String(doc?.companyCode || doc?.code || doc?.companyId || doc?.company_id || ""),
    partnerName: doc?.partnerName || doc?.ownerName || doc?.contactPerson || doc?.fullName || "—",
    companyName: doc?.CompanyName || doc?.companyName || doc?.company || doc?.name || "—",
    contactNumber: doc?.Contact || doc?.contactNumber || doc?.phone || doc?.mobile || "—",
    email: doc?.Email || doc?.email || "—",
    cinNumber: doc?.CIN || doc?.cinNumber || "—",
    panNumber: doc?.PAN_No || doc?.panNumber || "—",
    companyAddress: doc?.Address || doc?.companyAddress || "—",
    status: String(doc?.status || "PENDING").toUpperCase(),
    createdAt: safeDate(doc?.createdAt || doc?.created_on),
    subscription: pickPlan(doc),
    docs: pickDocs(doc),
  };
}

export default function AdminUserManagement() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "history">("pending");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selected, setSelected] = useState<Partner | null>(null);

  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  const [rejecting, setRejecting] = useState<Partner | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [docPreview, setDocPreview] = useState<{
    open: boolean;
    title?: string;
    url?: string;
  }>(() => ({ open: false }));

  const addHistory = (p: Partner, action: HistoryItem["action"]) => {
    setHistory((prev) => [
      { id: Date.now(), name: p.companyName, action, time: new Date().toLocaleString() },
      ...prev,
    ]);
  };

  /* ===================== FETCH LISTS ===================== */
  const fetchByTab = async (activeTab = tab) => {
    try {
      setLoading(true);

      let resRaw: any;
      if (activeTab === "pending") resRaw = await getPendingCompanyRequests();
      else if (activeTab === "approved") resRaw = await getApprovedCompanyRequests();
      else if (activeTab === "rejected") resRaw = await getRejectedCompanyRequests();
      else return;

      const res = unwrap(resRaw);

      const rows = Array.isArray(res)
        ? res
        : Array.isArray(res?.requests)
        ? res.requests
        : Array.isArray(res?.data)
        ? res.data
        : [];

      setPartners(rows.map(mapRequestToPartner));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchByTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const pendingCount = useMemo(
    () => partners.filter((p) => String(p.status).toUpperCase() === "PENDING").length,
    [partners]
  );
  const approvedCount = useMemo(
    () => partners.filter((p) => String(p.status).toUpperCase() === "APPROVED").length,
    [partners]
  );
  const rejectedCount = useMemo(
    () => partners.filter((p) => String(p.status).toUpperCase() === "REJECTED").length,
    [partners]
  );

  /* ===================== DOCUMENT VIEW ===================== */
const viewDocByKey = async (partnerId: string, key: DocKey) => {
  try {
    setDocLoading(true);

    const direct = selected?.docs?.[key]?.url;
    const raw = direct || unwrap(await getCompanyDocument(partnerId, key))?.url;

    if (!raw) throw new Error("Document URL missing");

    const url = buildFileUrl(raw);
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (e: any) {
    toast.error(e?.response?.data?.message || e?.message || "Failed to open document");
  } finally {
    setDocLoading(false);
  }
};


const downloadDocByKey = async (partnerId: string, key: DocKey, filename?: string) => {
  try {
    setDocLoading(true);

    const direct = selected?.docs?.[key]?.url;
    const url = direct || (unwrap(await getCompanyDocument(partnerId, key))?.url);

    if (!url) throw new Error("Document URL missing");

    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `${key}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e: any) {
    toast.error(e?.response?.data?.message || e?.message || "Download failed");
  } finally {
    setDocLoading(false);
  }
};


  /* ===================== OPEN DETAILS ===================== */
  const openDetails = async (p: Partner) => {
    setSelected(p);

    try {
      setDocLoading(true);

      const detailsResRaw: any = await getCompanyDetails(p.id);
      const companyDoc = unwrap(detailsResRaw);

      const mapped = mapRequestToPartner(companyDoc);
      setSelected(mapped);

      try {
        const docsResRaw: any = await getCompanyDocuments(p.id);
const docsRes = unwrap(docsResRaw);

// ✅ docsRes is { companyId, companyCode, docs }
const docsObj = docsRes?.docs || {};

const mergedDocs = {
  ...mapped.docs,
  ...pickDocs({ docs: docsObj }),
};

const companyCode = docsRes?.companyCode || mapped.companyCode || "";

setSelected((prev) =>
  prev
    ? {
        ...prev,
        companyCode,
        docs: mergedDocs,
      }
    : prev
);

      } catch {
        // ignore docs error
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to load company details");
    } finally {
      setDocLoading(false);
    }
  };

  /* ===================== ACTIONS ===================== */
  const handleApprove = async (p: Partner) => {
    try {
      setActionLoadingId(p.id);
      const resRaw: any = await approveCompanyRequest(p.id);
      const res = unwrap(resRaw);
      toast.success(res?.message || "Approved");
      addHistory(p, "Approved");
      setSelected(null);
      await fetchByTab(tab);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Approve failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejecting) return;
    if (!rejectReason.trim()) return toast.error("Please enter a rejection reason.");

    try {
      setActionLoadingId(rejecting.id);
      const resRaw: any = await rejectCompanyRequest(rejecting.id, { reason: rejectReason.trim() });
      const res = unwrap(resRaw);
      toast.success(res?.message || "Rejected");
      addHistory(rejecting, "Rejected");

      setRejecting(null);
      setRejectReason("");
      setSelected(null);

      await fetchByTab(tab);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Reject failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (p: Partner) => {
    const ok = window.confirm(`Delete "${p.companyName}" permanently?`);
    if (!ok) return;

    try {
      setActionLoadingId(p.id);
      const resRaw: any = await deleteCompany(p.id);
      const res = unwrap(resRaw);
      toast.success(res?.message || "Deleted");
      if (selected?.id === p.id) setSelected(null);
      await fetchByTab(tab);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Delete failed");
    } finally {
      setActionLoadingId(null);
    }
  };

  const showDelete = tab === "approved" || tab === "rejected";

  /* ===================== UI ===================== */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Partner Requests</h2>
            <p className="text-sm text-slate-500 mt-1">Manage company registration requests</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Stat label="Pending" value={tab === "pending" ? partners.length : pendingCount} />
            <Stat label="Approved" value={tab === "approved" ? partners.length : approvedCount} />
            <Stat label="Rejected" value={tab === "rejected" ? partners.length : rejectedCount} />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex flex-wrap gap-2">
          <TabButton active={tab === "pending"} onClick={() => setTab("pending")}>
            Pending
          </TabButton>
          <TabButton active={tab === "approved"} onClick={() => setTab("approved")}>
            Approved
          </TabButton>
          <TabButton active={tab === "rejected"} onClick={() => setTab("rejected")}>
            Rejected
          </TabButton>
          <TabButton active={tab === "history"} onClick={() => setTab("history")}>
            History
          </TabButton>

          <button
            onClick={() => fetchByTab(tab)}
            className="ml-auto px-4 py-2 rounded-2xl text-sm font-extrabold transition border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <FaSpinner className="animate-spin" /> Refreshing
              </span>
            ) : (
              "Refresh"
            )}
          </button>
        </div>
      </div>

      {/* TABLE */}
      {tab !== "history" && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="max-h-[62vh] overflow-y-auto thin-scrollbar">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold">Company</th>
                    <th className="px-6 py-4 text-left font-semibold">Company Code</th>
                    <th className="px-6 py-4 text-left font-semibold">Plan</th>
                    <th className="px-6 py-4 text-left font-semibold">Contact</th>
                    <th className="px-6 py-4 text-left font-semibold">Status</th>
                    <th className="px-6 py-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                        <span className="inline-flex items-center gap-2">
                          <FaSpinner className="animate-spin" /> Loading...
                        </span>
                      </td>
                    </tr>
                  ) : partners.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        No {tab} requests found.
                      </td>
                    </tr>
                  ) : (
                    partners.map((p) => (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{p.companyName}</div>
                          <div className="text-xs text-slate-500">Requested: {p.createdAt}</div>
                        </td>

                        <td className="px-6 py-4">
                          {p.companyCode ? (
                            <span className="inline-flex items-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-extrabold text-sky-700">
                              {p.companyCode}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {p.subscription ? (
                            <div className="inline-flex items-center gap-2">
                              <span className="text-sky-700 font-extrabold">₹{p.subscription.amount}</span>
                              <span className={planPill(p.subscription.status)}>
                                {p.subscription.planName}
                                {p.subscription.planKey ? ` • ${p.subscription.planKey}` : ""} •{" "}
                                {p.subscription.status}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">No plan</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          <div className="text-xs">{p.contactNumber}</div>
                          <div className="text-xs text-slate-500">{p.email}</div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={statusPill(String(p.status))}>{String(p.status).toUpperCase()}</span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => openDetails(p)}
                              className="px-3 py-1.5 rounded-lg text-xs font-extrabold border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100 transition"
                            >
                              View
                            </button>

                            {String(p.status).toUpperCase() === "PENDING" ? (
                              <>
                                <button
                                  onClick={() => handleApprove(p)}
                                  disabled={actionLoadingId === p.id}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-extrabold border transition inline-flex items-center gap-2",
                                    actionLoadingId === p.id
                                      ? "border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                                      : "border-emerald-400/30 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25"
                                  )}
                                >
                                  {actionLoadingId === p.id ? (
                                    <>
                                      <FaSpinner className="animate-spin" /> Approving
                                    </>
                                  ) : (
                                    <>
                                      <FaCheck /> Approve
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => {
                                    setRejecting(p);
                                    setRejectReason("");
                                  }}
                                  disabled={actionLoadingId === p.id}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-extrabold border transition inline-flex items-center gap-2",
                                    actionLoadingId === p.id
                                      ? "border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                                      : "border-rose-400/30 bg-rose-500/15 text-rose-700 hover:bg-rose-500/25"
                                  )}
                                >
                                  <FaBan /> Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500">No actions</span>
                            )}

                            {showDelete && (
                              <button
                                onClick={() => handleDelete(p)}
                                disabled={actionLoadingId === p.id}
                                className={cn(
                                  "ml-2 w-10 h-9 grid place-items-center rounded-xl border transition",
                                  actionLoadingId === p.id
                                    ? "border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                                    : "border-rose-400/30 bg-rose-500/15 text-rose-700 hover:bg-rose-500/25"
                                )}
                                title="Delete company"
                              >
                                {actionLoadingId === p.id ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="h-4" />
          </div>
        </div>
      )}

      {/* HISTORY */}
      {tab === "history" && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Approval Activity Log</h3>
            </div>

            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
              Total Logs: <span className="text-slate-900 font-bold">{history.length}</span>
            </div>
          </div>

          <div className="mt-5 max-h-[62vh] overflow-y-auto thin-scrollbar pr-1">
            {history.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No activity recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className={cn("mt-2 h-3 w-3 rounded-full", actionDot(h.action))} />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-slate-900 font-semibold truncate">{h.name}</span>
                        <span className={actionBadge(h.action)}>{h.action}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{h.time}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="h-2" />
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-slate-900/45" onClick={() => setSelected(null)} />

            <motion.div
              className="relative w-full max-w-5xl rounded-3xl border border-slate-200 bg-slate-500 backdrop-blur-xl shadow-2xl overflow-hidden"
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200 bg-slate-50">
                <div>
                  <div className="text-lg font-extrabold text-slate-900">Company Request Details</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {selected.companyName} • {selected.email}
                  </div>
                  <div className="mt-2">
                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700">
                      Company Code: {selected.companyCode || "—"}
                    </span>
                    {docLoading && (
                      <span className="ml-2 text-xs text-slate-500 inline-flex items-center gap-2">
                        <FaSpinner className="animate-spin" /> Loading details...
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="w-10 h-10 grid place-items-center rounded-2xl border border-slate-200 bg-white text-slate-900 hover:bg-black/40"
                  aria-label="Close"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto thin-scrollbar">
                <SectionTitle icon={<FaCrown />} title="Subscription Plan Details" />
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900/40 via-blue-950/30 to-indigo-950/30 p-5">
                  {selected.subscription ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field
                        icon={<FaCrown />}
                        label="Plan"
                        value={`${selected.subscription.planName} (₹${selected.subscription.amount})`}
                      />
                      <Field icon={<FaIdCard />} label="Status" value={String(selected.subscription.status)} />
                      <Field icon={<FaIdCard />} label="Plan Key" value={selected.subscription.planKey || "—"} />
                      <Field icon={<FaCalendarAlt />} label="Start Date" value={selected.subscription.startDate} />
                      <Field icon={<FaCalendarAlt />} label="End Date" value={selected.subscription.endDate} />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                      No plan selected or plan not saved yet.
                    </div>
                  )}
                </div>

                <SectionTitle icon={<FaBuilding />} title="Company Information" />
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900/40 via-blue-950/30 to-indigo-950/30 p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field icon={<FaBuilding />} label="Company Name" value={selected.companyName} />
                    <Field icon={<FaPhoneAlt />} label="Contact Number" value={selected.contactNumber} />
                    <Field icon={<FaEnvelope />} label="Email Address" value={selected.email} />
                    <Field icon={<FaIdCard />} label="CIN Number" value={selected.cinNumber} />
                  </div>

                  <div className="mt-4">
                    <Field icon={<FaIdCard />} label="PAN Number" value={selected.panNumber} full />
                  </div>

                  <div className="mt-4">
                    <Field
                      icon={<FaMapMarkerAlt />}
                      label="Company Address"
                      value={selected.companyAddress}
                      textarea
                      full
                    />
                  </div>
                </div>

                <SectionTitle icon={<FaFilePdf />} title="Document Upload" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DOC_META.map((d) => {
                    const file = selected.docs[d.key];
                    const uploaded = Boolean(file?.url);

                    return (
                      <div
                        key={d.key}
                        className="rounded-3xl border border-slate-200 p-5 bg-gradient-to-br from-white/5 to-black/20"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-sky-100 border border-sky-200 grid place-items-center text-sky-700">
                              <FaFilePdf />
                            </div>
                            <div className="min-w-0">
                              <div className="text-slate-900 font-extrabold">{d.title}</div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {d.required ? "Required" : "Optional"} • PDF only
                              </div>
                            </div>
                          </div>

                          <span
                            className={cn(
                              "text-[11px] font-extrabold px-3 py-1 rounded-full border",
                              uploaded
                                ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-700"
                                : "border-rose-400/30 bg-rose-500/15 text-rose-700"
                            )}
                          >
                            {uploaded ? "Uploaded" : "Not Uploaded"}
                          </span>
                        </div>

                        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-black/25 p-4 flex items-center justify-between gap-3">
                          <div className="text-xs text-slate-600 truncate">
                            {uploaded ? file!.name : d.placeholder}
                          </div>

                          <div className="flex gap-2">
                            <button
                              disabled={!uploaded || docLoading}
                              onClick={() => viewDocByKey(selected.id, d.key, d.title)}
                              className={cn(
                                "px-3 py-2 rounded-xl text-xs font-extrabold border transition inline-flex items-center gap-2",
                                uploaded && !docLoading
                                  ? "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
                                  : "border-white/5 bg-slate-50 text-slate-500 cursor-not-allowed"
                              )}
                              title="View"
                            >
                              {docLoading ? <FaSpinner className="animate-spin" /> : <FaEye />}
                            </button>

                            <button
                              disabled={!uploaded || docLoading}
                              onClick={() => downloadDocByKey(selected.id, d.key, file?.name || `${d.key}.pdf`)}
                              className={cn(
                                "px-3 py-2 rounded-xl text-xs font-extrabold border transition inline-flex items-center",
                                uploaded && !docLoading
                                  ? "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
                                  : "border-white/5 bg-slate-50 text-slate-500 cursor-not-allowed"
                              )}
                              title="Download"
                            >
                              {docLoading ? <FaSpinner className="animate-spin" /> : <FaDownload />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 grid place-items-center text-slate-900">
                      <FaUserTie />
                    </div>
                    <div>
                      <div className="text-slate-900 font-extrabold">{selected.companyName}</div>
                      <div className="text-xs text-slate-500">
                        Status:{" "}
                        <span className="text-sky-700 font-bold">{String(selected.status).toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelected(null)}
                    className="px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-extrabold hover:bg-slate-100 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject modal */}
      <AnimatePresence>
        {rejecting && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-slate-900/45" onClick={() => setRejecting(null)} />

            <motion.div
              className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-slate-500 backdrop-blur-xl shadow-2xl overflow-hidden"
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 18, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold text-slate-900">Reject Request</div>
                  <div className="text-xs text-slate-500 mt-1">{rejecting.companyName}</div>
                </div>
                <button
                  onClick={() => setRejecting(null)}
                  className="w-10 h-10 grid place-items-center rounded-2xl border border-slate-200 bg-white text-slate-900 hover:bg-black/40"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <label className="text-sm font-extrabold text-slate-700">Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-sky-300 text-slate-900 placeholder-slate-400"
                  placeholder="Write reason for rejection..."
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setRejecting(null)}
                    className="px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-extrabold hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleReject}
                    disabled={actionLoadingId === rejecting.id}
                    className={cn(
                      "px-5 py-3 rounded-2xl border font-extrabold transition inline-flex items-center gap-2",
                      actionLoadingId === rejecting.id
                        ? "border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                        : "border-rose-400/30 bg-rose-500/15 text-rose-700 hover:bg-rose-500/25"
                    )}
                  >
                    {actionLoadingId === rejecting.id ? (
                      <>
                        <FaSpinner className="animate-spin" /> Rejecting
                      </>
                    ) : (
                      <>
                        <FaBan /> Reject
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------- UI Helpers -------------------- */

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-2xl text-sm font-extrabold transition border",
        active
          ? "border-sky-300 bg-gradient-to-r from-cyan-500/25 via-blue-500/15 to-indigo-500/20 text-slate-900 shadow-lg"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}

function actionBadge(action: HistoryItem["action"]) {
  if (action === "Approved")
    return "text-[11px] font-extrabold px-3 py-1 rounded-full border border-emerald-400/30 bg-gradient-to-r from-emerald-500/25 to-cyan-500/15 text-emerald-700";
  return "text-[11px] font-extrabold px-3 py-1 rounded-full border border-rose-400/30 bg-gradient-to-r from-rose-500/25 to-fuchsia-500/15 text-rose-700";
}

function actionDot(action: HistoryItem["action"]) {
  if (action === "Approved") return "bg-emerald-400";
  return "bg-rose-400";
}

function planPill(status: string) {
  const s = String(status || "").toLowerCase();
  if (s === "active")
    return "text-[11px] font-extrabold px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-700";
  if (s === "pending")
    return "text-[11px] font-extrabold px-3 py-1 rounded-full border border-amber-400/30 bg-amber-500/15 text-amber-700";
  if (s === "cancelled")
    return "text-[11px] font-extrabold px-3 py-1 rounded-full border border-rose-400/30 bg-rose-500/15 text-rose-700";
  return "text-[11px] font-extrabold px-3 py-1 rounded-full border border-slate-400/20 bg-slate-50 text-slate-700";
}

function statusPill(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING")
    return "px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-400/20";
  if (s === "APPROVED")
    return "px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-400/20";
  if (s === "REJECTED")
    return "px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 border border-rose-400/20";
  return "px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-900 border border-slate-200";
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-2xl bg-sky-100 border border-sky-200 grid place-items-center text-sky-700">
        {icon}
      </div>
      <div className="text-lg font-extrabold text-slate-900">{title}</div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  full,
  textarea,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  full?: boolean;
  textarea?: boolean;
}) {
  return (
    <div className={cn(full ? "w-full" : "")}>
      <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
        <span className="text-sky-700">{icon}</span>
        <span>{label}</span>
      </div>

      {textarea ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-700 min-h-[110px]">
          {value}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
          {value}
        </div>
      )}
    </div>
  );
}
