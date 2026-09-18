/**
 * Data-access layer for company employee master data.
 *
 * `CompanyEmployeeData` is the single source of truth. The legacy embedded array
 * `CompanyServiceAccess.employees[]` is migrated into it on first read
 * (`migrateCompany`) and then left untouched as a backup.
 */
const mongoose = require("mongoose");
const CompanyEmployeeData = require("../models/CompanyEmployeeData");
const CompanyServiceAccess = require("../models/CompanyServiceAccess");
const EmployeeProfile = require("../models/EmployeeProfile");
const Company = require("../models/Company");
const {
  isHrRecordLike,
  dedupeAccountsById,
  normalizeProfileEmployee,
  normalizeServiceEmployee,
} = require("../utils/employeeNormalizers");

const EDITABLE_FIELDS = [
  "name",
  "email",
  "phone",
  "contact",
  "username",
  "photoUrl",
  "role",
  "department",
  "designation",
  "employmentType",
  "joiningDate",
  "manager",
  "supervisorName",
  "workLocation",
  "shiftName",
  "shiftStart",
  "shiftEnd",
  "weeklyOff",
  "attendanceMode",
  "geoTaggingEnabled",
  "accessLevel",
  "aadhaarNumber",
  "aadhaarStatus",
  "panNumber",
  "panStatus",
  "dateOfBirth",
  "dob",
  "gender",
  "address",
  "emergencyContactName",
  "emergencyContactPhone",
  "notes",
  "status",
  "assignedHrId",
  "assignedHrName",
];

async function resolveCompanyCode(companyId, hint = "") {
  if (hint) return String(hint).trim();
  const company = await Company.findById(companyId).select("companyCode").lean();
  if (company?.companyCode != null) return String(company.companyCode).trim();
  const sa = await CompanyServiceAccess.findOne({ companyId }).select("companyCode").lean();
  return String(sa?.companyCode || "").trim();
}

/**
 * One-time (idempotent) copy of the legacy embedded employees[] into the
 * collection. Only runs when the collection has no rows for this company.
 */
async function migrateCompany(companyId, companyCodeHint = "") {
  const existingCount = await CompanyEmployeeData.countDocuments({ companyId });
  if (existingCount > 0) return { migrated: 0, skipped: true };

  const sa = await CompanyServiceAccess.findOne({ companyId }).lean();
  const rawEmployees = Array.isArray(sa?.employees) ? sa.employees : [];
  const realEmployees = rawEmployees.filter((emp) => !isHrRecordLike(emp));
  if (!realEmployees.length) return { migrated: 0, skipped: false };

  const companyCode = await resolveCompanyCode(companyId, companyCodeHint || sa?.companyCode);
  const docs = realEmployees.map((emp, index) => {
    const normalized = normalizeServiceEmployee(emp, companyCode, index);
    return {
      ...normalized,
      companyId,
      companyCode: normalized.companyCode || companyCode || "000",
      employeeId: normalized.employeeId || normalized.id,
    };
  });

  try {
    await CompanyEmployeeData.insertMany(docs, { ordered: false });
  } catch (err) {
    // Duplicate-key races are fine — another request migrated concurrently.
    if (err?.code !== 11000) throw err;
  }
  return { migrated: docs.length, skipped: false };
}

function mergeProfileFallback(collectionRows, profileRows) {
  const byId = new Map(collectionRows.map((row) => [String(row.employeeId || row.id), row]));
  const extras = [];
  for (const profile of profileRows) {
    const normalized = normalizeProfileEmployee(profile);
    if (isHrRecordLike(normalized)) continue;
    const key = String(normalized.employeeId || normalized.id);
    if (!key) continue;
    if (byId.has(key)) {
      // Fill blanks on the collection row from the auth profile.
      const row = byId.get(key);
      row.name = row.name || normalized.name;
      row.email = row.email || normalized.email;
      row.username = row.username || normalized.username;
      if (normalized.status === "INACTIVE") row.status = "INACTIVE";
      row.userId = row.userId || profile.userId?._id || profile.userId || null;
    } else {
      extras.push(normalized);
    }
  }
  return [...collectionRows, ...extras];
}

async function listEmployees(companyId, companyCodeHint = "") {
  if (!companyId || !mongoose.isValidObjectId(companyId)) return { employees: [], companyCode: "" };
  await migrateCompany(companyId, companyCodeHint);

  const [rows, profileRows, companyCode] = await Promise.all([
    CompanyEmployeeData.find({ companyId }).sort({ name: 1 }).lean(),
    EmployeeProfile.find({ companyId }).populate("userId", "name username email companyCode isActive").lean(),
    resolveCompanyCode(companyId, companyCodeHint),
  ]);

  const collectionRows = rows
    .filter((row) => !isHrRecordLike(row))
    .map((row) => ({ ...row, id: row.employeeId, companyCode: row.companyCode || companyCode }));

  const employees = dedupeAccountsById(mergeProfileFallback(collectionRows, profileRows));
  return { employees, companyCode };
}

async function getEmployee(companyId, employeeId, companyCodeHint = "") {
  const { employees, companyCode } = await listEmployees(companyId, companyCodeHint);
  const target = String(employeeId || "").trim();
  const employee = employees.find((e) => String(e.employeeId || e.id).trim() === target) || null;
  return { employee, companyCode };
}

async function upsertEmployee(companyId, payload = {}) {
  const employeeId = String(payload.id || payload.employeeId || "").trim();
  const name = String(payload.name || "").trim();
  if (!employeeId || !name) {
    const err = new Error("Employee name and id are required");
    err.status = 400;
    throw err;
  }

  const companyCode = await resolveCompanyCode(companyId, payload.companyCode);
  const existing = await CompanyEmployeeData.findOne({ companyId, employeeId }).lean();

  const set = { companyId, companyCode: companyCode || existing?.companyCode || "000", employeeId, name, type: "EMPLOYEE" };
  for (const field of EDITABLE_FIELDS) {
    if (payload[field] === undefined) continue;
    if (field === "geoTaggingEnabled") set[field] = Boolean(payload[field]);
    else set[field] = typeof payload[field] === "string" ? payload[field].trim() : payload[field];
  }
  if (set.email) set.email = set.email.toLowerCase();
  if (set.username) set.username = set.username.toLowerCase();
  set.contact = set.contact || set.phone || set.email || existing?.contact || "";
  if (!set.status) set.status = existing?.status || "ACTIVE";

  // Preserve auth/login + assignment bookkeeping.
  const nextAssignedHrId = set.assignedHrId !== undefined ? set.assignedHrId : existing?.assignedHrId || "";
  set.assignedHrId = nextAssignedHrId;
  set.assignedHrName = nextAssignedHrId ? set.assignedHrName || existing?.assignedHrName || "" : "";
  set.assignedAt = nextAssignedHrId
    ? nextAssignedHrId !== String(existing?.assignedHrId || "")
      ? new Date()
      : existing?.assignedAt || new Date()
    : null;
  set.hasLogin = Boolean(existing?.hasLogin || existing?.userId || set.username);

  const doc = await CompanyEmployeeData.findOneAndUpdate(
    { companyId, employeeId },
    { $set: set },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return { ...doc, id: doc.employeeId };
}

async function deleteEmployee(companyId, employeeId) {
  await CompanyEmployeeData.deleteOne({ companyId, employeeId: String(employeeId || "").trim() });
  return { success: true };
}

async function deactivateEmployee(companyId, employeeId, status = "INACTIVE") {
  const doc = await CompanyEmployeeData.findOneAndUpdate(
    { companyId, employeeId: String(employeeId || "").trim() },
    { $set: { status: status === "ACTIVE" ? "ACTIVE" : "INACTIVE" } },
    { new: true }
  ).lean();
  return doc ? { ...doc, id: doc.employeeId } : null;
}

async function listByHr(companyId, hrId) {
  await migrateCompany(companyId);
  const rows = await CompanyEmployeeData.find({ companyId, assignedHrId: String(hrId || "").trim() }).lean();
  return rows.map((row) => ({ ...row, id: row.employeeId }));
}

async function unassignHr(companyId, hrId) {
  await CompanyEmployeeData.updateMany(
    { companyId, assignedHrId: String(hrId || "").trim() },
    { $set: { assignedHrId: "", assignedHrName: "", assignedAt: null } }
  );
}

module.exports = {
  migrateCompany,
  listEmployees,
  getEmployee,
  upsertEmployee,
  deleteEmployee,
  deactivateEmployee,
  listByHr,
  unassignHr,
};
