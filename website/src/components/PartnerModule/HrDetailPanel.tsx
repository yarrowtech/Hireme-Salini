import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  FaTimes,
  FaUserTie,
  FaKey,
  FaUsers,
  FaPlus,
  FaTrash,
  FaSave,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaCopy,
  FaFileDownload,
} from "react-icons/fa";
import { toast } from "react-toastify";
import companyApi from "../../api/company.api.js";

type HrRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  hasLogin?: boolean;
  loginUpdatedAt?: string | null;
  passwordUpdatedAt?: string | null;
};

type ManagedEmployee = {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  phone: string;
  status: string;
  assignedAt?: string | null;
};

const cn = (...a: Array<string | false | undefined | null>) => a.filter(Boolean).join(" ");

type CredentialPreview = {
  username: string;
  password: string;
  generated?: boolean;
};

export default function HrDetailPanel({
  companyId,
  companyCode,
  hr,
  onClose,
  onUpdated,
  onDeleted,
}: {
  companyId: string;
  companyCode: string;
  hr: HrRecord;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  /* -------- Profile -------- */
  const [name, setName] = useState(hr.name === "-" ? "" : hr.name);
  const [email, setEmail] = useState(hr.email === "-" ? "" : hr.email);
  const [phone, setPhone] = useState(hr.phone === "-" ? "" : hr.phone);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">(hr.status);
  const [savingProfile, setSavingProfile] = useState(false);

  /* -------- Login credentials -------- */
  const [username, setUsername] = useState(hr.username === "-" ? "" : hr.username);
  const [password, setPassword] = useState("");
  const [savingLogin, setSavingLogin] = useState(false);
  const [editingLogin, setEditingLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [credentialPreview, setCredentialPreview] = useState<CredentialPreview | null>(null);
  const hasLogin = Boolean(hr.hasLogin || (hr.username && hr.username !== "-"));
  const loginUpdatedAt = hr.loginUpdatedAt || hr.passwordUpdatedAt || null;

  /* -------- Managed employees -------- */
  const [employees, setEmployees] = useState<ManagedEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [empName, setEmpName] = useState("");
  const [empDept, setEmpDept] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empContact, setEmpContact] = useState("");
  const [savingEmployee, setSavingEmployee] = useState(false);
  const empNameRef = useRef<HTMLInputElement | null>(null);

  const [deleting, setDeleting] = useState(false);

  const loadManagedEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const res = await companyApi.getHrManagedEmployees(companyId, hr.id);
      const list = Array.isArray(res?.employees) ? res.employees : [];
      setEmployees(
        list.map((e: any) => ({
          id: e.id,
          name: e.name || "Employee",
          department: e.department || "General",
          role: e.role || "Employee",
          email: e.email || "",
          phone: e.phone || "",
          status: e.status || "ACTIVE",
          assignedAt: e.assignedAt || null,
        }))
      );
    } catch (error) {
      console.error("Failed to load managed employees", error);
    } finally {
      setLoadingEmployees(false);
    }
  }, [companyId, hr.id]);

  useEffect(() => {
    loadManagedEmployees();
  }, [loadManagedEmployees]);

  const saveProfile = async () => {
    if (!name.trim()) return toast.error("Name is required.");
    setSavingProfile(true);
    try {
      await companyApi.upsertCompanyHrAccount(companyId, {
        id: hr.id,
        companyCode,
        name: name.trim(),
        role: "HR",
        department: "Human Resources",
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        contact: email.trim() || phone.trim(),
        status,
      });
      toast.success("Profile updated.");
      onUpdated();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveLogin = async () => {
    const u = username.trim().toLowerCase();
    if (!u || u.length < 3) return toast.error("Username must be at least 3 characters.");
    if (!email.trim()) return toast.error("Set an email above before creating a login.");
    if (password && password.length < 6) return toast.error("Password must be at least 6 characters.");

    setSavingLogin(true);
    try {
      const res = await companyApi.upsertCompanyHrAccount(companyId, {
        id: hr.id,
        companyCode,
        name: name.trim() || hr.name,
        role: "HR",
        department: "Human Resources",
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        contact: email.trim() || phone.trim(),
        status,
        username: u,
        password,
      });
      const preview = res?.credentialPreview;
      if (preview?.password) {
        setCredentialPreview({
          username: String(preview.username || u),
          password: String(preview.password),
          generated: Boolean(preview.generated),
        });
      }
      toast.success(hasLogin ? "Login credentials updated." : "Login created for this HR.");
      setPassword("");
      setEditingLogin(false);
      onUpdated();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save login credentials.");
    } finally {
      setSavingLogin(false);
    }
  };

  const addManagedEmployee = async () => {
    if (!empName.trim()) return (toast.error("Employee name is required."), empNameRef.current?.focus());
    setSavingEmployee(true);
    try {
      const isEmail = empContact.includes("@");
      await companyApi.upsertCompanyEmployee(companyId, {
        id: `EMP-${Date.now()}`,
        companyCode,
        name: empName.trim(),
        role: empRole.trim() || "Employee",
        department: empDept.trim() || "General",
        email: isEmail ? empContact.trim() : "",
        phone: isEmail ? "" : empContact.trim(),
        contact: empContact.trim(),
        status: "ACTIVE",
        assignedHrId: hr.id,
        assignedHrName: hr.name,
      });
      toast.success("Employee added under this HR.");
      setEmpName("");
      setEmpDept("");
      setEmpRole("");
      setEmpContact("");
      await loadManagedEmployees();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add employee.");
    } finally {
      setSavingEmployee(false);
    }
  };

  const removeManagedEmployee = async (employeeId: string) => {
    if (!confirm("Remove this employee?")) return;
    try {
      await companyApi.deleteCompanyEmployee(companyId, employeeId);
      await loadManagedEmployees();
    } catch (error) {
      toast.error("Failed to remove employee.");
    }
  };

  const deleteHrAccount = async () => {
    if (!confirm(`Delete ${hr.name}? This removes their login and unassigns their employees.`)) return;
    setDeleting(true);
    try {
      await companyApi.deleteCompanyHrAccount(companyId, hr.id);
      toast.success("HR account deleted.");
      onDeleted();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete HR account.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400/25 to-blue-500/20 text-cyan-100 ring-1 ring-white/10">
              <FaUserTie />
            </div>
            <div>
              <div className="text-lg font-extrabold text-white">{hr.name}</div>
              <div className="text-xs text-slate-400">HR Account Details</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white transition hover:bg-white/10"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Profile */}
          <section>
            <div className="mb-3 text-sm font-bold text-cyan-200">Profile</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <LabeledInput label="Name" value={name} onChange={setName} placeholder="Full name" />
              <LabeledInput label="Email" value={email} onChange={setEmail} placeholder="hr@company.com" type="email" />
              <LabeledInput label="Phone" value={phone} onChange={setPhone} placeholder="Phone number" />
              <label className="block">
                <div className="mb-1 text-[11px] text-slate-400">Status</div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-50"
              >
                <FaSave /> {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </section>

          {/* Login credentials */}
          <section className="border-t border-white/10 pt-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-cyan-200">
              <FaKey /> Login Credentials
              {!hasLogin && (
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                  Not set up
                </span>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ReadOnlyField label="Username" value={hasLogin ? username || "-" : "-"} />
                <ReadOnlyField label="Password" value={hasLogin ? "••••••••" : "-"} />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-300 sm:grid-cols-2">
                <div>
                  Login status: <span className="font-semibold text-white">{hasLogin ? "Configured" : "Not configured"}</span>
                </div>
                <div>
                  Last updated:{" "}
                  <span className="font-semibold text-white">
                    {loginUpdatedAt ? new Date(loginUpdatedAt).toLocaleString() : "-"}
                  </span>
                </div>
              </div>

              {!editingLogin ? (
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-400">
                    The password is stored securely and stays hidden here.
                  </div>
                  <button
                    onClick={() => setEditingLogin(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
                  >
                    <FaKey /> Change login credentials
                  </button>
                </div>
              ) : (
                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <LabeledInput label="Username" value={username} onChange={setUsername} placeholder="Used to sign in" />
                    <LabeledInput
                      label={hasLogin ? "New Password (optional)" : "Password"}
                      value={password}
                      onChange={setPassword}
                      placeholder={hasLogin ? "Leave blank to keep current password" : "Leave blank to auto-generate"}
                      type={showPassword ? "text" : "password"}
                      rightAction={
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10"
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      }
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Leave blank to auto-generate a temporary password and show it once after saving.
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      onClick={() => {
                        setEditingLogin(false);
                        setPassword("");
                        setUsername(hr.username === "-" ? "" : hr.username);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveLogin}
                      disabled={savingLogin}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-50"
                    >
                      <FaKey /> {savingLogin ? "Saving..." : hasLogin ? "Update Login" : "Create Login"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Managed employees */}
          <section className="border-t border-white/10 pt-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-cyan-200">
              <FaUsers /> Employees Managed by {hr.name}
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                {employees.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <input
                ref={empNameRef}
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                placeholder="Employee name"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <input
                value={empDept}
                onChange={(e) => setEmpDept(e.target.value)}
                placeholder="Department"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <input
                value={empRole}
                onChange={(e) => setEmpRole(e.target.value)}
                placeholder="Role"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <input
                value={empContact}
                onChange={(e) => setEmpContact(e.target.value)}
                placeholder="Phone or Email"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
            <div className="mt-2 flex justify-end">
              <button
                onClick={addManagedEmployee}
                disabled={savingEmployee}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                <FaPlus /> {savingEmployee ? "Adding..." : "Add Employee"}
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900 text-slate-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Department</th>
                      <th className="px-3 py-2 text-left">Role</th>
                      <th className="px-3 py-2 text-left">Since</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="border-t border-white/10">
                        <td className="px-3 py-2 font-semibold">{emp.name}</td>
                        <td className="px-3 py-2 text-slate-300">{emp.department}</td>
                        <td className="px-3 py-2 text-slate-300">{emp.role}</td>
                        <td className="px-3 py-2 text-slate-400">
                          {emp.assignedAt ? new Date(emp.assignedAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => removeManagedEmployee(emp.id)}
                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 transition hover:bg-rose-500/20"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!loadingEmployees && !employees.length && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                          No employees assigned to this HR yet.
                        </td>
                      </tr>
                    )}
                    {loadingEmployees && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                          Loading...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* Footer: Delete */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <FaExclamationTriangle className="text-amber-300" /> Deleting removes their login and unassigns employees.
          </div>
          <button
            onClick={deleteHrAccount}
            disabled={deleting}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
            )}
          >
            <FaTrash /> {deleting ? "Deleting..." : "Delete HR Account"}
          </button>
        </div>
      </div>

      {credentialPreview && (
        <CredentialModal credential={credentialPreview} onClose={() => setCredentialPreview(null)} />
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  rightAction,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  rightAction?: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] text-slate-400">{label}</div>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none placeholder:text-slate-500",
            rightAction ? "pr-12" : ""
          )}
        />
        {rightAction && <div className="absolute inset-y-0 right-2 flex items-center">{rightAction}</div>}
      </div>
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="block">
      <div className="mb-1 text-[11px] text-slate-400">{label}</div>
      <div className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white">
        {value}
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
    a.download = `hr-credentials-${credential.username || "account"}.csv`;
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
            ? "Temporary login credentials were generated for this HR account."
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
