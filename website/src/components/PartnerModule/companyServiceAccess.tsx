import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaLock,
  FaCheckCircle,
  FaTimesCircle,
  FaRegClock,
  FaSearch,
  FaPlus,
  FaTrash,
  FaEdit,
  FaArrowRight,
  FaIdBadge,
  FaBuilding,
  FaPhoneAlt,
  FaUser,
  FaUsers,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaCopy,
  FaFileDownload,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import companyApi from "../../api/company.api.js";
import { getResolvedSubscription, loadCompanyBundle, normalizePlanKey, syncCompanyStorage } from "./companyHelpers";

type SubStatus = "ACTIVE" | "EXPIRED" | "NONE";

type StoredSubscription = {
  expiresAt: string;
  planKey?: string;
  billing?: "MONTHLY" | "YEARLY";
};

type Employee = {
  id: string;
  companyCode: string;
  name: string;
  role: string;
  department: string;
  contact: string;
  email: string;
  username: string;
  status: "ACTIVE" | "INACTIVE";
  hasLogin?: boolean;
  loginUpdatedAt?: string | null;
  passwordUpdatedAt?: string | null;
};

const cn = (...a: Array<string | false | undefined | null>) => a.filter(Boolean).join(" ");

type CredentialPreview = {
  username: string;
  password: string;
  generated?: boolean;
};

/* ---------------- Subscription helpers ---------------- */

function readSubscription(): StoredSubscription | null {
  try {
    const raw = localStorage.getItem("companySubscription");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt) return null;
    return parsed as StoredSubscription;
  } catch {
    return null;
  }
}

function daysLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

  function getStatus(sub: StoredSubscription | null): SubStatus {
  if (!sub) return "NONE";
  return daysLeft(sub.expiresAt) >= 0 ? "ACTIVE" : "EXPIRED";
}

/* ---------------- Page ---------------- */

export default function companyEmployeeManagement() {
  const navigate = useNavigate();

  const [sub, setSub] = useState<StoredSubscription | null>(null);
  const [liveSubscriptionActive, setLiveSubscriptionActive] = useState(false);
  const status = useMemo(() => getStatus(sub), [sub]);
  const accessAllowed = liveSubscriptionActive || status === "ACTIVE";

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyCode, setCompanyCode] = useState("");

  /* ---------------- Modal State ---------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [credentialPreview, setCredentialPreview] = useState<CredentialPreview | null>(null);

  const [form, setForm] = useState<{
    id: string;
    companyCode: string; // ✅ NEW
    name: string;
    role: string;
    department: string;
    contact: string;
    email: string;
    username: string;
    password: string;
    status: "ACTIVE" | "INACTIVE";
  }>({
    id: "",
    companyCode: "", // ✅ NEW
    name: "",
    role: "",
    department: "",
    contact: "",
    email: "",
    username: "",
    password: "",
    status: "ACTIVE",
  });

  const refreshFromBackend = useCallback(async () => {
    setLoading(true);
    const cached = readSubscription();
    try {
      const bundle = await loadCompanyBundle(await companyApi.resolveCompanyId());
      const companyId = bundle?.companyId;

      if (!companyId) {
        if (cached) setSub(cached);
        return;
      }

      const dashboard = bundle?.dashboard || null;
      const backendSubscription = getResolvedSubscription({
        dashboard,
        subscription: bundle?.subscription,
        serviceAccess: dashboard?.serviceAccess || bundle?.subscription?.serviceAccess || null,
      });
      const subscription =
        backendSubscription ||
        dashboard?.subscription ||
        bundle?.subscription?.subscription ||
        bundle?.subscription?.serviceAccess?.subscription ||
        null;
      const serviceAccess = dashboard?.serviceAccess || bundle?.subscription?.serviceAccess || null;
      const synced = syncCompanyStorage(bundle, companyId);

      if (synced.subscription) {
        setSub(synced.subscription as StoredSubscription);
      } else if (subscription?.endsAt || subscription?.startsAt) {
        setSub({
          expiresAt: subscription.endsAt || subscription.expiresAt || new Date().toISOString(),
          planKey: normalizePlanKey(
            subscription.planKey || subscription.plan || subscription.planPrice || subscription.amount || "STARTER"
          ),
          billing: String(subscription.billing || subscription.billingCycle || "MONTHLY").toUpperCase() as "MONTHLY" | "YEARLY",
        });
      } else if (cached) {
        setSub(cached);
      }

      const subscriptionActive =
        dashboard?.subscriptionActive ??
        (String(subscription?.status || "").toUpperCase() === "ACTIVE" &&
          (!subscription?.endsAt || new Date(String(subscription.endsAt)).getTime() >= Date.now()));
      setLiveSubscriptionActive(Boolean(subscriptionActive));

      setCompanyCode(String(dashboard?.company?.companyCode || serviceAccess?.companyCode || ""));

      const employeeResponse = await companyApi.getCompanyEmployees(companyId);
      const list = Array.isArray(employeeResponse?.employees) && employeeResponse.employees.length
        ? employeeResponse.employees
        : Array.isArray(serviceAccess?.employees)
        ? serviceAccess.employees
        : [];

      setEmployees(
        list.map((e: any, idx: number) => ({
          id: e.id || e.employeeId || `EMP-${idx + 1}`,
          companyCode: e.companyCode || dashboard?.company?.companyCode || serviceAccess?.companyCode || "",
          name: e.name || e.employeeName || "Employee",
          role: e.designation || e.role || "Employee",
          department: e.department || "General",
          contact: e.contact || e.email || e.phone || "-",
          email: e.email || "",
          username: e.username || "",
          status: e.status || "ACTIVE",
          hasLogin: Boolean(e.hasLogin || e.userId || e.username),
          loginUpdatedAt: e.loginUpdatedAt || null,
          passwordUpdatedAt: e.passwordUpdatedAt || null,
        }))
      );
    } catch (error) {
      console.error("Failed to load employees", error);
      if (cached) setSub(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [e.id, e.companyCode, e.name, e.role, e.department, e.contact, e.status].some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [employees, query]);

  const openAddModal = () => {
    setEditId(null);
    setShowPassword(false);
    setCredentialPreview(null);
    setForm({
      id: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      companyCode: companyCode || "", // ✅ auto-fill from backend
      name: "",
      role: "",
      department: "",
      contact: "",
      email: "",
      username: "",
      password: "",
      status: "ACTIVE",
    });
    setModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditId(emp.id);
    setShowPassword(false);
    setCredentialPreview(null);
    setForm({
      id: emp.id,
      companyCode: emp.companyCode, // ✅
      name: emp.name,
      role: emp.role,
      department: emp.department,
      contact: emp.contact,
      email: emp.email || "",
      username: emp.username || "",
      password: "",
      status: emp.status,
    });
    setModalOpen(true);
  };

  useEffect(() => {
    refreshFromBackend();
  }, [refreshFromBackend]);

  const closeModal = () => setModalOpen(false);

  const saveEmployee = async () => {
    if (
      !form.companyCode.trim() ||
      !form.name.trim() ||
      !form.id.trim() ||
      !form.role.trim() ||
      !form.department.trim() ||
      !form.contact.trim() ||
      !form.email.trim() ||
      !form.username.trim()
    ) {
      alert("Please fill all fields.");
      return;
    }

    if (form.username.trim().length < 3) {
      alert("Username must be at least 3 characters.");
      return;
    }

    if (form.password && form.password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (!editId && employees.some((e) => e.id === form.id)) {
      alert("Employee ID already exists. Change ID.");
      return;
    }

    const companyId = await companyApi.resolveCompanyId();
    if (companyId) {
      const isEmail = form.contact.includes("@");
      try {
        const res = await companyApi.upsertCompanyEmployee(companyId, {
          id: form.id,
          companyCode: form.companyCode,
          name: form.name,
          role: form.role.trim(),
          department: form.department.trim(),
          contact: form.contact,
          email: form.email.trim().toLowerCase(),
          phone: isEmail ? "" : form.contact,
          username: form.username.trim().toLowerCase(),
          password: form.password,
          status: form.status,
        });
        const preview = res?.credentialPreview;
        if (preview?.password) {
          setCredentialPreview({
            username: String(preview.username || form.username.trim().toLowerCase()),
            password: String(preview.password),
            generated: Boolean(preview.generated),
          });
        }
      } catch (error: any) {
        alert(error?.response?.data?.message || "Failed to save employee.");
        return;
      }
      await refreshFromBackend();
    }

    setModalOpen(false);
  };

  const removeEmployee = async (id: string) => {
    if (!confirm("Delete this employee?")) return;
    const companyId = await companyApi.resolveCompanyId();
    if (companyId) {
      await companyApi.deleteCompanyEmployee(companyId, id);
      await refreshFromBackend();
    }
  };

  const toggleEmployeeStatus = (id: string) => {
    (async () => {
      const nextEmployee = employees.find((e) => e.id === id);
      if (!nextEmployee) return;
      const updated = {
        ...nextEmployee,
        status: (nextEmployee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE",
      };
      const companyId = await companyApi.resolveCompanyId();
      if (companyId) {
        await companyApi.upsertCompanyEmployee(companyId, {
          ...updated,
          role: updated.role,
          department: updated.department,
        });
        await refreshFromBackend();
      }
    })();
  };

  return (
    <div className="min-h-[calc(100vh-40px)] w-full p-4 sm:p-6 lg:p-8">
      {/* ================= Header ================= */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-white">
              <FaUser className="text-cyan-300" />
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Employee Management</h1>
            </div>

            <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-2xl">
              Only companies with an <span className="text-white font-semibold">active subscription</span> can access
              employee management features.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {loading ? (
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border bg-cyan-500/10 border-cyan-400/20 text-cyan-100">
                  <FaRegClock />
                  Syncing live status
                </span>
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border",
                    accessAllowed
                      ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-200"
                      : status === "EXPIRED"
                      ? "bg-red-500/10 border-red-400/20 text-red-200"
                      : "bg-white/5 border-white/10 text-slate-200"
                  )}
                >
                  {accessAllowed ? <FaCheckCircle /> : status === "EXPIRED" ? <FaTimesCircle /> : <FaRegClock />}
                  {accessAllowed
                    ? "Subscription Active"
                    : status === "EXPIRED"
                    ? "Subscription Expired"
                    : "No Subscription"}
                </span>
              )}

              {sub?.expiresAt && (
                <span className="text-xs text-slate-400">
                  Expires:{" "}
                  <span className="text-slate-200 font-semibold">{new Date(sub.expiresAt).toLocaleDateString()}</span> (
                  {Math.max(daysLeft(sub.expiresAt), 0)} days left)
                </span>
              )}

              {sub?.planKey && (
                <span className="text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                  Plan: <span className="text-white font-semibold">{sub.planKey}</span>
                </span>
              )}

              {/* ✅ Company code badge */}
              <span className="text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                Company Code: <span className="text-white font-semibold">{companyCode || "-"}</span>
              </span>
            </div>
          </div>

          {/* CTA */}
          <div
            className={cn(
              "rounded-2xl border p-4 sm:p-5 w-full sm:w-[380px]",
              accessAllowed ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "h-10 w-10 rounded-2xl grid place-items-center border",
                  accessAllowed
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                    : "bg-red-500/10 border-red-500/20 text-red-200"
                )}
              >
                {accessAllowed ? <FaCheckCircle /> : <FaLock />}
              </div>

              <div className="min-w-0">
                <div className="text-white font-bold">{loading ? "Syncing" : accessAllowed ? "Unlocked" : "Locked"}</div>
                <div className="text-sm text-slate-300 mt-1">
                  {loading
                    ? "Fetching the latest employee and subscription data from the backend."
                    : accessAllowed
                  ? "You can manage employee records here."
                    : "Purchase or renew a subscription to unlock employee management."}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => navigate("/company/subscription")}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/30 text-cyan-100"
              >
                Subscription <FaArrowRight />
              </button>

              {accessAllowed && (
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition bg-white/5 hover:bg-white/10 border-white/10 text-white"
                >
                  <FaPlus /> Add Employee
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= Locked / Loading / Table ================= */}
      {loading ? (
        <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-6 text-cyan-100">
          Loading employee and subscription data from the backend...
        </div>
      ) : !accessAllowed ? (
        <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-red-500/15 border border-red-500/25 text-red-200 grid place-items-center">
              <FaLock />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-white">Employee Management Locked</h2>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Your subscription is not active. Renew or purchase a plan to manage employee data.
              </p>

              <div className="mt-4">
                <button
                  onClick={() => navigate("/company/subscription")}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-100 font-semibold px-4 py-2 transition"
                >
                  Purchase / Renew Subscription <FaArrowRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= Employee Table ================= */
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-white font-extrabold text-lg">
              <FaUsers className="text-cyan-300" />
              Employees
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <FaSearch className="text-slate-300" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search: company, name, id, role, dept, contact..."
                  className="bg-transparent outline-none text-sm text-white placeholder:text-slate-400 w-72"
                />
              </div>

              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 font-semibold px-4 py-2 transition"
              >
                <FaPlus />
                Add Employee
              </button>
            </div>
          </div>

          {/* ✅ SCROLL SYSTEM: fixed height + vertical scroll */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/20">
            <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                {/* ✅ Sticky header */}
                <thead className="bg-slate-950/80 backdrop-blur text-slate-300 sticky top-0 z-10">
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <FaIdBadge className="text-slate-400" /> Employee ID
                      </span>
                    </th>
                    <th className="text-left px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <FaBuilding className="text-slate-400" /> Company Code
                      </span>
                    </th>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <FaIdBadge className="text-slate-400" /> Role
                      </span>
                    </th>
                    <th className="text-left px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <FaBuilding className="text-slate-400" /> Department
                      </span>
                    </th>
                    <th className="text-left px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <FaPhoneAlt className="text-slate-400" /> Contact Info
                      </span>
                    </th>
                    <th className="text-left px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <FaUser className="text-slate-400" /> Username
                      </span>
                    </th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="text-white">
                  {filteredEmployees.map((e) => (
                    <tr key={e.id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3 text-slate-200">{e.id}</td>
                      <td className="px-4 py-3 text-slate-200">{e.companyCode}</td>
                      <td className="px-4 py-3 font-semibold">{e.name}</td>
                      <td className="px-4 py-3">{e.role}</td>
                      <td className="px-4 py-3">{e.department}</td>
                      <td className="px-4 py-3 text-slate-200">{e.contact}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-200">{e.username || "-"}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {e.hasLogin ? "Password set" : "Login not configured"}
                          {(e.loginUpdatedAt || e.passwordUpdatedAt)
                            ? ` • Updated ${new Date(String(e.loginUpdatedAt || e.passwordUpdatedAt)).toLocaleDateString()}`
                            : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleEmployeeStatus(e.id)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border transition",
                            e.status === "ACTIVE"
                              ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-200 hover:bg-emerald-500/15"
                              : "bg-red-500/10 border-red-400/20 text-red-200 hover:bg-red-500/15"
                          )}
                          title="Toggle status"
                        >
                          {e.status === "ACTIVE" ? <FaCheckCircle /> : <FaTimesCircle />}
                          {e.status}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white px-3 py-2 transition"
                            title="Edit"
                            onClick={() => openEditModal(e)}
                          >
                            <FaEdit />
                          </button>

                          <button
                            onClick={() => removeEmployee(e.id)}
                            className="rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-200 px-3 py-2 transition"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredEmployees.length === 0 && (
                    <tr className="border-t border-white/10">
                      <td colSpan={9} className="px-4 py-10 text-center text-slate-300">
                        No employees found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-white/10 text-xs text-slate-400">
              Scroll enabled • Sticky header • Shows all employees without extra page length
            </div>
          </div>
        </div>
      )}

      {/* ================= Add/Edit Modal (with scroll) ================= */}
      {modalOpen && (
        <ModalShell title={editId ? "Edit Employee" : "Add Employee"} onClose={closeModal}>
          {/* ✅ Modal body scroll system */}
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid gap-2 sm:grid-cols-2">
              {/* ✅ Company Code */}
              <Field label="Company Code">
                <input
                  value={form.companyCode}
                  onChange={(e) => setForm((p) => ({ ...p, companyCode: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                  placeholder="CMP-IND-001"
                />
              </Field>

              <Field label="Employee ID">
                <input
                  value={form.id}
                  onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                  placeholder="EMP-001"
                />
              </Field>

              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                  placeholder="Full name"
                />
              </Field>

              <Field label="Role">
                <input
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                  placeholder="Developer / Manager / Staff"
                />
              </Field>

              <Field label="Department">
                <input
                  value={form.department}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                  placeholder="Sales / Ops / Tech"
                />
              </Field>

              <Field label="Contact Info" className="sm:col-span-2">
                <input
                  value={form.contact}
                  onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                  placeholder="Phone or Email"
                />
              </Field>

              <div className="sm:col-span-2 mt-2 border-t border-white/10 pt-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-200 mb-2">
                  <FaKey /> Login Credentials
                </div>
              </div>

              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                  placeholder="employee@company.com"
                />
              </Field>

              <Field label="Username">
                <input
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
                  placeholder="Used to sign in"
                />
              </Field>

              <Field label={editId ? "New Password (optional)" : "Password"} className="sm:col-span-2">
                <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pr-12 text-white outline-none"
                  placeholder={editId ? "Leave blank to keep current password" : "Leave blank to auto-generate"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 my-auto inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/5 px-2 text-white transition hover:bg-white/10"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Leave blank to auto-generate a temporary password and show it once after saving.
                </div>
              </Field>

              <Field label="Status" className="sm:col-span-2">
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as any }))}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-white outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              onClick={closeModal}
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-2 transition"
            >
              Cancel
            </button>
            <button
              onClick={saveEmployee}
              className="rounded-xl border border-cyan-400/30 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 font-semibold px-4 py-2 transition"
            >
              {editId ? "Save Changes" : "Add Employee"}
            </button>
          </div>
        </ModalShell>
      )}

      {credentialPreview && (
        <CredentialModal credential={credentialPreview} onClose={() => setCredentialPreview(null)} />
      )}
    </div>
  );
}

/* ================= UI Helpers ================= */

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
      <div className="text-[11px] text-slate-400 mb-1">{label}</div>
      {children}
    </label>
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="text-white font-extrabold text-sm">{title}</div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white px-2.5 py-1.5 transition text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4">{children}</div>

        <div className="px-4 py-2 border-t border-white/10 text-[11px] text-slate-400">
          Connected to backend company service access data.
        </div>
      </div>
    </div>
  );
}

function CredentialModal({
  credential,
  onClose,
}: {
  credential: CredentialPreview;
  onClose: () => void;
}) {
  const copyCredentials = async () => {
    const text = `Username: ${credential.username}\nPassword: ${credential.password}`;
    await navigator.clipboard.writeText(text);
  };

  const downloadCsv = () => {
    const csv = [
      "username,password",
      `"${credential.username.replace(/"/g, '""')}","${credential.password.replace(/"/g, '""')}"`,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee-credentials-${credential.username || "account"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl border border-cyan-400/20 bg-slate-950 p-5 shadow-2xl">
        <div className="text-lg font-extrabold text-white">Credentials Ready</div>
        <p className="mt-2 text-sm text-slate-300">
          {credential.generated
            ? "Temporary login credentials were generated for this employee."
            : "Login credentials were saved."}
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-[11px] text-slate-400">Username</div>
            <div className="mt-1 font-semibold text-white">{credential.username}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-[11px] text-slate-400">Password</div>
            <div className="mt-1 font-semibold text-white">{credential.password}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={copyCredentials}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <FaCopy /> Copy
          </button>
          <button
            onClick={downloadCsv}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
          >
            <FaFileDownload /> Download CSV
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
