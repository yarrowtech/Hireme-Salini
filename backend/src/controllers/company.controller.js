// src/controllers/company.controller.js
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Company = require("../models/Company");
const EmployeeProfile = require("../models/EmployeeProfile");
const Subscription = require("../models/Subscription");
const CompanyPayroll = require("../models/CompanyPayroll");
const CompanyServiceAccess = require("../models/CompanyServiceAccess");
const User = require("../models/User");
const { ROLES } = require("../config/roles");

function pickOne(files, key) {
  const arr = files?.[key];
  return Array.isArray(arr) && arr[0] ? arr[0] : null;
}

function generateTemporaryPassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?";
  let out = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

// ✅ Keep pricing snapshot in backend (recommended)
const PLAN_PRICING = {
  STARTER: { MONTHLY: 999, YEARLY: 799 * 12 },
  PROFESSIONAL: { MONTHLY: 9999, YEARLY: 9999 * 12 },
  ENTERPRISE: { MONTHLY: 19999, YEARLY: 19999 * 12 },
};

function normalizePlan(planKey, billingCycle) {
  const pk = String(planKey || "").toUpperCase().trim();
  const bc = String(billingCycle || "").toUpperCase().trim();

  const validPk = ["STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(pk) ? pk : "STARTER";
  const validBc = ["MONTHLY", "YEARLY"].includes(bc) ? bc : "MONTHLY";

  const planPrice = PLAN_PRICING?.[validPk]?.[validBc] ?? null;

  return { planKey: validPk, billingCycle: validBc, planPrice };
}

function inferPlanKeyFromPrice(planPrice) {
  const price = Number(planPrice || 0);
  if (price === 9999 || price === 99990 || price === 119988) return "PROFESSIONAL";
  if (price === 19999 || price === 199990 || price === 239988) return "ENTERPRISE";
  if (price === 999 || price === 799 || price === 7990 || price === 9990 || price === 9588) return "STARTER";
  if (price === 0) return "STARTER";
  return "";
}

function buildResolvedSubscription(company, subscription) {
  const planKeyHint =
    company?.planKey ||
    subscription?.planKey ||
    subscription?.plan ||
    inferPlanKeyFromPrice(company?.planPrice) ||
    inferPlanKeyFromPrice(subscription?.planPrice) ||
    inferPlanKeyFromPrice(subscription?.amount) ||
    "STARTER";

  const billingHint =
    company?.billingCycle ||
    subscription?.billingCycle ||
    subscription?.billing ||
    "MONTHLY";

  const plan = normalizePlan(planKeyHint, billingHint);

  return {
    planKey: plan.planKey,
    billingCycle: plan.billingCycle,
    planPrice: company?.planPrice ?? subscription?.planPrice ?? subscription?.amount ?? plan.planPrice ?? null,
    status: subscription?.status || company?.planStatus || "ACTIVE",
    startsAt: subscription?.startsAt || company?.planStartDate || company?.reviewedAt || company?.createdAt || null,
    endsAt: subscription?.endsAt || company?.planEndDate || null,
  };
}

function normalizeHrPayload(body, companyCode, fallbackId = "") {
  const id = String(body?.id || body?.employeeId || fallbackId || "").trim();
  const name = String(body?.name || body?.employeeName || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const phone = String(body?.phone || "").trim();
  const contact = String(body?.contact || email || phone || "").trim();
  const username = String(body?.username || "").trim().toLowerCase();
  const status = String(body?.status || "ACTIVE").trim().toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  const loginUpdatedAtRaw = body?.loginUpdatedAt ? new Date(body.loginUpdatedAt) : null;
  const passwordUpdatedAtRaw = body?.passwordUpdatedAt ? new Date(body.passwordUpdatedAt) : null;

  if (!id || !name) {
    return null;
  }

  return {
    id,
    companyCode: String(body?.companyCode || companyCode || "").trim(),
    name,
    role: String(body?.role || "HR").trim() || "HR",
    department: String(body?.department || "Human Resources").trim() || "Human Resources",
    designation: String(body?.designation || "HR").trim() || "HR",
    email,
    phone,
    contact,
    username,
    status,
    notes: String(body?.notes || "").trim(),
    hasLogin: Boolean(body?.hasLogin),
    loginUpdatedAt: loginUpdatedAtRaw && !Number.isNaN(loginUpdatedAtRaw.getTime()) ? loginUpdatedAtRaw : null,
    passwordUpdatedAt: passwordUpdatedAtRaw && !Number.isNaN(passwordUpdatedAtRaw.getTime()) ? passwordUpdatedAtRaw : null,
  };
}

async function getOrCreateServiceAccess(companyId, companyCode = "") {
  let serviceAccess = await CompanyServiceAccess.findOne({ companyId });
  if (!serviceAccess) {
    serviceAccess = await CompanyServiceAccess.create({ companyId, companyCode: String(companyCode || "") });
  } else if (!serviceAccess.companyCode && companyCode) {
    serviceAccess.companyCode = String(companyCode);
  }
  return serviceAccess;
}

function extractLegacyHrAccounts(serviceAccess) {
  if (!Array.isArray(serviceAccess?.employees)) return [];
  return serviceAccess.employees
    .filter((emp) => isHrRecordLike(emp))
    .map((emp) => ({
      id: String(emp?.id || emp?.employeeId || "").trim(),
      companyCode: String(emp?.companyCode || "").trim(),
      name: String(emp?.name || emp?.employeeName || "").trim(),
      role: String(emp?.role || "HR").trim() || "HR",
      department: String(emp?.department || "Human Resources").trim() || "Human Resources",
      designation: String(emp?.designation || emp?.role || "HR").trim() || "HR",
      email: String(emp?.email || "").trim().toLowerCase(),
      phone: String(emp?.phone || "").trim(),
      contact: String(emp?.contact || emp?.email || emp?.phone || "").trim(),
      username: String(emp?.username || "").trim().toLowerCase(),
      userId: emp?.userId || null,
      hasLogin: Boolean(emp?.hasLogin || emp?.userId || String(emp?.username || "").trim()),
      loginUpdatedAt: emp?.loginUpdatedAt || null,
      passwordUpdatedAt: emp?.passwordUpdatedAt || null,
      status: String(emp?.status || "ACTIVE").trim().toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      notes: String(emp?.notes || "").trim(),
    }))
    .filter((emp) => emp.id && emp.name);
}

function isHrRecordLike(emp) {
  return (
    String(emp?.type || "").toUpperCase() === "HR" ||
    String(emp?.role || "").toUpperCase() === "HR" ||
    String(emp?.designation || "").toUpperCase() === "HR" ||
    String(emp?.department || "").toUpperCase() === "HUMAN RESOURCES"
  );
}

function dedupeAccountsById(accounts) {
  const map = new Map();
  for (const account of Array.isArray(accounts) ? accounts : []) {
    const id = String(account?.id || "").trim();
    if (!id) continue;
    map.set(id, { ...map.get(id), ...account, id });
  }
  return Array.from(map.values());
}

function splitServiceAccessRecords(serviceAccess, companyCode = "") {
  if (!serviceAccess) {
    return { employees: [], hrAccounts: [], changed: false };
  }

  const rawEmployees = Array.isArray(serviceAccess.employees) ? serviceAccess.employees : [];
  const currentHrAccounts = Array.isArray(serviceAccess.hrAccounts) ? serviceAccess.hrAccounts : [];

  const nextEmployees = [];
  const migratedHrAccounts = [];
  let changed = false;

  for (const emp of rawEmployees) {
    if (isHrRecordLike(emp)) {
      const hrPayload = normalizeHrPayload(
        {
          ...emp,
          companyCode: emp?.companyCode || companyCode,
          id: emp?.id || emp?.employeeId,
          name: emp?.name || emp?.employeeName,
          role: emp?.role || "HR",
          department: emp?.department || "Human Resources",
          designation: emp?.designation || emp?.role || "HR",
          email: emp?.email || "",
          phone: emp?.phone || "",
          contact: emp?.contact || emp?.email || emp?.phone || "",
          status: emp?.status || "ACTIVE",
          notes: emp?.notes || "",
        },
        emp?.companyCode || companyCode,
        emp?.id || emp?.employeeId || ""
      );

      if (hrPayload) {
        migratedHrAccounts.push(hrPayload);
        changed = true;
      }
      continue;
    }

    nextEmployees.push(emp);
  }

  const mergedHrAccounts = dedupeAccountsById([...currentHrAccounts, ...migratedHrAccounts]);
  if (nextEmployees.length !== rawEmployees.length) changed = true;
  if (mergedHrAccounts.length !== currentHrAccounts.length) changed = true;

  return {
    employees: nextEmployees,
    hrAccounts: mergedHrAccounts,
    changed,
  };
}

async function persistServiceAccessSplit(companyId, serviceAccess, companyCode = "") {
  if (!serviceAccess) return null;

  const split = splitServiceAccessRecords(serviceAccess, companyCode || serviceAccess.companyCode || "");
  if (!split.changed) {
    return serviceAccess;
  }

  return CompanyServiceAccess.findOneAndUpdate(
    { companyId },
    {
      $set: {
        companyCode: String(companyCode || serviceAccess.companyCode || ""),
        employees: split.employees,
        hrAccounts: split.hrAccounts,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
}

async function generateCompanyCode() {
  for (let i = 0; i < 80; i++) {
    const code = Math.floor(100 + Math.random() * 900);
    const exists = await Company.exists({ companyCode: code });
    if (!exists) return code;
  }
  throw new Error("Unable to generate unique company code");
}

/**
 * POST /api/company/request
 * multipart/form-data
 */
async function sendRequest(req, res, next) {
  try {
    // Optional: block logged-in users
    if (req.user) {
      return res.status(400).json({
        success: false,
        message: "Partner request is only for guests.",
      });
    }

    const { CompanyName, Contact, Email, Address, CIN, PAN_No, planKey, billingCycle } = req.body;

    // ✅ Required docs (MSMC optional)
    const requiredKeys = ["PAN", "ESI", "PF", "MOA", "GST", "TradeLicense"];
    const missing = requiredKeys.filter((k) => !pickOne(req.files, k));
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required documents: ${missing.join(", ")}`,
      });
    }

    // ✅ Prevent duplicate requests by CIN
    const cinTrim = String(CIN || "").trim();
    const existing = await Company.findOne({ CIN: cinTrim }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A company request already exists with this CIN.",
      });
    }

    // ✅ Build documents array
    const allKeys = ["PAN", "ESI", "PF", "MOA", "MSMC", "GST", "TradeLicense"];
    const documents = [];

    for (const key of allKeys) {
      const f = pickOne(req.files, key);
      if (!f) continue;
      documents.push({
        key,
        originalName: f.originalname,
        mimeType: f.mimetype,
        size: f.size,
        path: `/uploads/company-docs/${f.filename}`,
      });
    }

    // ✅ Plan snapshot
    const plan = normalizePlan(planKey, billingCycle);

    // ✅ Generate code + retry on collision (duplicate key)
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const companyCode = await generateCompanyCode();

        const created = await Company.create({
          CompanyName: String(CompanyName || "").trim(),
          Contact: String(Contact || "").trim(),
          Email: String(Email || "").toLowerCase().trim(),
          Address: String(Address || "").trim(),
          CIN: cinTrim,
          PAN_No: String(PAN_No || "").trim(),

          planKey: plan.planKey,
          billingCycle: plan.billingCycle,
          planPrice: plan.planPrice,

          companyCode,
          documents,
          status: "PENDING",
        });

        return res.status(201).json({
          success: true,
          message: "Partner request submitted successfully.",
          companyCode: created.companyCode,
          requestId: created._id,
          status: created.status,
          plan: {
            planKey: created.planKey,
            billingCycle: created.billingCycle,
            planPrice: created.planPrice,
          },
        });
      } catch (err) {
        if (err && err.code === 11000) continue;
        throw err;
      }
    }

    return res.status(500).json({
      success: false,
      message: "Could not generate company code. Try again.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/company/requests?email=... OR ?cin=... OR ?status=PENDING
 */
async function listRequests(req, res, next) {
  try {
    const { email, cin, status } = req.query;

    const filter = {};
    if (email) filter.Email = String(email).toLowerCase().trim();
    if (cin) filter.CIN = String(cin).trim();
    if (status) filter.status = String(status).toUpperCase().trim();

    const rows = await Company.find(filter)
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    return res.json({
      success: true,
      count: rows.length,
      requests: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ✅ FIXED
 * GET /api/company/requests/:requestId
 */
async function getRequestById(req, res, next) {
  try {
    const { requestId } = req.params; 

    if (!mongoose.isValidObjectId(requestId)) {
      return res.status(400).json({ success: false, message: "Invalid requestId" });
    }

    const row = await Company.findById(requestId).select("-__v").lean();
    if (!row) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    return res.json({ success: true, request: row });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/company/requests/:requestId/docs/:docKey
 * Streams a single uploaded PDF
 */
async function getRequestDoc(req, res, next) {
  try {
    const { requestId, docKey } = req.params;

    if (!mongoose.isValidObjectId(requestId) || !docKey) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    const company = await Company.findById(requestId).lean();
    if (!company) {
      return res.status(404).json({ success: false, message: "Company request not found" });
    }

    const doc = (company.documents || []).find((d) => d.key === docKey);
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const filePath = path.join(process.cwd(), doc.path.replace(/^\/+/, ""));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File missing on server" });
    }

    res.setHeader("Content-Type", doc.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${doc.originalName}"`);

    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}

async function getCompanyDashboard(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const [company, employeeRows, subscription, payroll, serviceAccessRaw] = await Promise.all([
      Company.findById(companyId).select("-__v").lean(),
      EmployeeProfile.find({ companyId }).lean(),
      Subscription.findOne({ companyId }).lean(),
      CompanyPayroll.findOne({ companyId }).lean(),
      CompanyServiceAccess.findOne({ companyId }).lean(),
    ]);

    const serviceAccess = await persistServiceAccessSplit(companyId, serviceAccessRaw, company?.companyCode || serviceAccessRaw?.companyCode || "");

    const employeeCount = Array.isArray(employeeRows) ? employeeRows.filter((emp) => !isHrRecordLike(emp)).length : 0;
    const legacyHrAccounts = extractLegacyHrAccounts(serviceAccess);
    const serviceHrAccounts = Array.isArray(serviceAccess?.hrAccounts) ? serviceAccess.hrAccounts : [];
    const resolvedHrAccess = {
      companyId,
      companyCode: company?.companyCode || serviceAccess?.companyCode || "",
      hrAccounts: serviceHrAccounts.length ? serviceHrAccounts : legacyHrAccounts,
    };

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const now = new Date();
    const isActive = subscription?.status === "ACTIVE" && (!subscription?.endsAt || new Date(subscription.endsAt) >= now);
    const resolvedSubscription = buildResolvedSubscription(company, subscription);

    return res.json({
      success: true,
      company,
      employees: employeeCount,
      subscription: subscription || null,
      resolvedSubscription,
      payroll: payroll || null,
      serviceAccess: serviceAccess
        ? {
            ...serviceAccess,
            hrAccounts: serviceHrAccounts.length ? serviceHrAccounts : resolvedHrAccess?.hrAccounts || legacyHrAccounts,
          }
        : null,
      hrAccess: resolvedHrAccess,
      subscriptionActive: isActive,
    });
  } catch (err) {
    next(err);
  }
}

async function getCompanyAnalytics(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const [company, employees, serviceAccessRaw] = await Promise.all([
      Company.findById(companyId).select("-__v").lean(),
      EmployeeProfile.find({ companyId }).lean(),
      CompanyServiceAccess.findOne({ companyId }).lean(),
    ]);

    const serviceAccess = await persistServiceAccessSplit(companyId, serviceAccessRaw, company?.companyCode || serviceAccessRaw?.companyCode || "");

    const employeeRows = employees.filter((emp) => !isHrRecordLike(emp));

    const departments = employeeRows.reduce((acc, emp) => {
      const key = emp.department || "General";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const roles = employeeRows.reduce((acc, emp) => {
      const key = emp.designation || emp.role || "Employee";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const analytics = {
      companyName: company?.CompanyName || "Company",
      employees: employeeRows.length,
      departments: Object.entries(departments).map(([name, value]) => ({ name, value })),
      roles: Object.entries(roles).map(([name, value]) => ({ name, value })),
      serviceAccess: serviceAccess
        ? {
            ...serviceAccess,
            hrAccounts: Array.isArray(serviceAccess.hrAccounts) ? serviceAccess.hrAccounts : extractLegacyHrAccounts(serviceAccess),
          }
        : null,
      hrAccess: {
        companyId,
        companyCode: company?.companyCode || serviceAccess?.companyCode || "",
        hrAccounts: Array.isArray(serviceAccess?.hrAccounts) && serviceAccess.hrAccounts.length
          ? serviceAccess.hrAccounts
          : extractLegacyHrAccounts(serviceAccess),
      },
    };

    return res.json({ success: true, analytics });
  } catch (err) {
    next(err);
  }
}

async function getCompanyEmployees(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const [profileEmployees, serviceAccess] = await Promise.all([
      EmployeeProfile.find({ companyId }).lean(),
      CompanyServiceAccess.findOne({ companyId }).lean(),
    ]);
    const serviceEmployees = Array.isArray(serviceAccess?.employees) ? serviceAccess.employees : [];
    const employees = dedupeAccountsById([...profileEmployees, ...serviceEmployees]);
    return res.json({ success: true, employees: employees.filter((employee) => !isHrRecordLike(employee)) });
  } catch (err) {
    next(err);
  }
}

async function upsertCompanyEmployees(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const { id, companyCode, name, role, department, contact, status, type, email, phone, assignedHrId, assignedHrName } = req.body;
    if (!name || !id) {
      return res.status(400).json({ success: false, message: "Employee name and id are required" });
    }

    const normalizedType = String(type || "").trim().toUpperCase();
    if (normalizedType === "HR") {
      const hrPayload = normalizeHrPayload(req.body, companyCode, id);
      if (!hrPayload) {
        return res.status(400).json({ success: false, message: "HR name and id are required" });
      }

      const serviceAccess = await getOrCreateServiceAccess(companyId, companyCode);
      const serviceIndex = Array.isArray(serviceAccess.hrAccounts)
        ? serviceAccess.hrAccounts.findIndex((hr) => hr.id === hrPayload.id)
        : -1;
      if (serviceIndex >= 0) {
        serviceAccess.hrAccounts[serviceIndex] = hrPayload;
      } else {
        serviceAccess.hrAccounts = [...(serviceAccess.hrAccounts || []), hrPayload];
      }

      await serviceAccess.save();
      const hrAccess = {
        companyId,
        companyCode: serviceAccess.companyCode || companyCode || "",
        hrAccounts: serviceAccess.hrAccounts,
      };
      return res.json({ success: true, hrAccount: hrPayload, hrAccess, serviceAccess });
    }

    let serviceAccess = await CompanyServiceAccess.findOne({ companyId });
    if (!serviceAccess) {
      serviceAccess = await CompanyServiceAccess.create({ companyId, companyCode: companyCode || "" });
    }

    const existingIndex = serviceAccess.employees.findIndex((emp) => emp.id === id);
    const existingEmployee = existingIndex >= 0 ? serviceAccess.employees[existingIndex] : null;
    const nextAssignedHrId = String(assignedHrId ?? existingEmployee?.assignedHrId ?? "").trim();
    const assignmentChanged = nextAssignedHrId !== String(existingEmployee?.assignedHrId || "");

    const employeePayload = {
      id,
      companyCode: companyCode || serviceAccess.companyCode || "",
      name,
      role,
      department,
      type: type === "HR" ? "HR" : "EMPLOYEE",
      email: email || "",
      phone: phone || "",
      contact: contact || email || "",
      status: status || "ACTIVE",
      assignedHrId: nextAssignedHrId,
      assignedHrName: nextAssignedHrId ? String(assignedHrName || existingEmployee?.assignedHrName || "") : "",
      assignedAt: nextAssignedHrId ? (assignmentChanged ? new Date() : existingEmployee?.assignedAt || new Date()) : null,
    };

    if (existingIndex >= 0) {
      serviceAccess.employees[existingIndex] = employeePayload;
    } else {
      serviceAccess.employees.push(employeePayload);
    }

    await serviceAccess.save();
    return res.json({ success: true, employee: employeePayload, serviceAccess });
  } catch (err) {
    next(err);
  }
}

async function getHrManagedEmployees(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    const { hrId } = req.params;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const serviceAccess = await CompanyServiceAccess.findOne({ companyId }).lean();
    const employees = Array.isArray(serviceAccess?.employees)
      ? serviceAccess.employees.filter((emp) => emp.assignedHrId === hrId)
      : [];

    return res.json({ success: true, hrId, employees });
  } catch (err) {
    next(err);
  }
}

async function getCompanyHrAccounts(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const [company, legacyServiceAccessRaw] = await Promise.all([
      Company.findById(companyId).select("companyCode").lean(),
      CompanyServiceAccess.findOne({ companyId }).lean(),
    ]);

    const legacyServiceAccess = await persistServiceAccessSplit(
      companyId,
      legacyServiceAccessRaw,
      company?.companyCode || legacyServiceAccessRaw?.companyCode || ""
    );

    const legacyHrAccounts = extractLegacyHrAccounts(legacyServiceAccess);
    const serviceHrAccounts = Array.isArray(legacyServiceAccess?.hrAccounts) ? legacyServiceAccess.hrAccounts : [];

    return res.json({
      success: true,
      hrAccess: {
        companyId,
        companyCode: company?.companyCode || legacyServiceAccess?.companyCode || "",
        hrAccounts: serviceHrAccounts.length ? serviceHrAccounts : legacyHrAccounts,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function upsertCompanyHrAccount(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const hrPayload = normalizeHrPayload(req.body, req.body?.companyCode || "", req.body?.id || req.body?.employeeId || "");
    if (!hrPayload) {
      return res.status(400).json({ success: false, message: "HR name and id are required" });
    }

    const serviceAccess = await getOrCreateServiceAccess(companyId, hrPayload.companyCode);
    const serviceIndex = Array.isArray(serviceAccess.hrAccounts)
      ? serviceAccess.hrAccounts.findIndex((hr) => hr.id === hrPayload.id)
      : -1;
    const existingEntry = serviceIndex >= 0 ? serviceAccess.hrAccounts[serviceIndex] : null;

    // A quick "Add HR" / profile-only save doesn't touch login credentials.
    // Only when a username or password is actually supplied do we create/update the linked login.
    const suppliedPassword = String(req.body?.password || "");
    const usernameChanging = Boolean(hrPayload.username) && hrPayload.username !== existingEntry?.username;
    const wantsLoginChange = Boolean(suppliedPassword) || usernameChanging || (!existingEntry?.userId && Boolean(hrPayload.username));
    const generatedPassword = !existingEntry?.userId && !suppliedPassword ? generateTemporaryPassword() : "";
    const password = suppliedPassword || generatedPassword;

    // Preserve whatever isn't being changed this call so a profile-only save
    // can never wipe out an already-configured login.
    hrPayload.username = hrPayload.username || existingEntry?.username || "";
    hrPayload.email = hrPayload.email || existingEntry?.email || "";
    hrPayload.userId = existingEntry?.userId || null;
    hrPayload.hasLogin = Boolean(existingEntry?.hasLogin || existingEntry?.userId || hrPayload.username);
    hrPayload.loginUpdatedAt = existingEntry?.loginUpdatedAt || null;
    hrPayload.passwordUpdatedAt = existingEntry?.passwordUpdatedAt || null;

    if (wantsLoginChange) {
      if (!hrPayload.username || hrPayload.username.length < 3) {
        return res.status(400).json({ success: false, message: "HR username must be at least 3 characters" });
      }
      if (!hrPayload.email) {
        return res.status(400).json({ success: false, message: "HR email is required to set up a login" });
      }
      if (password && password.length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      }

      let hrUser;
      if (existingEntry?.userId) {
        hrUser = await User.findOne({ _id: existingEntry.userId, companyId });
        if (!hrUser) {
          return res.status(404).json({ success: false, message: "Linked HR login not found" });
        }
        hrUser.name = hrPayload.name;
        hrUser.username = hrPayload.username;
        hrUser.email = hrPayload.email;
        hrUser.companyCode = Number(hrPayload.companyCode) || hrUser.companyCode;
        hrUser.isActive = hrPayload.status !== "INACTIVE";
        if (password) await hrUser.setPassword(password);
      } else {
        hrUser = new User({
          name: hrPayload.name,
          username: hrPayload.username,
          email: hrPayload.email,
          role: ROLES.HR,
          companyId,
          companyCode: Number(hrPayload.companyCode) || 0,
          isActive: hrPayload.status !== "INACTIVE",
        });
        await hrUser.setPassword(password);
      }

      try {
        await hrUser.save();
      } catch (err) {
        if (err && err.code === 11000) {
          return res.status(409).json({ success: false, message: "Username or email already in use in this company" });
        }
        throw err;
      }

      hrPayload.userId = hrUser._id;
      hrPayload.hasLogin = true;
      hrPayload.loginUpdatedAt = new Date();
      hrPayload.passwordUpdatedAt = password ? new Date() : existingEntry?.passwordUpdatedAt || null;
    } else if (existingEntry?.userId) {
      // No credential change requested, but keep the linked login's active flag
      // and profile fields in sync with the HR record.
      const hrUser = await User.findOne({ _id: existingEntry.userId, companyId });
      if (hrUser) {
        hrUser.name = hrPayload.name;
        hrUser.email = hrPayload.email || hrUser.email;
        hrUser.isActive = hrPayload.status !== "INACTIVE";
        await hrUser.save();
      }
      hrPayload.hasLogin = true;
      hrPayload.loginUpdatedAt = existingEntry?.loginUpdatedAt || new Date();
    }

    if (serviceIndex >= 0) {
      serviceAccess.hrAccounts[serviceIndex] = hrPayload;
    } else {
      serviceAccess.hrAccounts = [...(serviceAccess.hrAccounts || []), hrPayload];
    }

    await serviceAccess.save();
    const hrAccess = {
      companyId,
      companyCode: serviceAccess.companyCode || hrPayload.companyCode || "",
      hrAccounts: serviceAccess.hrAccounts,
    };
    return res.json({
      success: true,
      hrAccount: hrPayload,
      hrAccess,
      serviceAccess,
      credentialPreview: generatedPassword
        ? {
            username: hrPayload.username,
            password: generatedPassword,
            generated: true,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteCompanyHrAccount(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    const { hrId } = req.params;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const serviceAccess = await CompanyServiceAccess.findOne({ companyId });
    if (!serviceAccess) {
      return res.status(404).json({ success: false, message: "No HR access record found" });
    }

    const target = Array.isArray(serviceAccess.hrAccounts)
      ? serviceAccess.hrAccounts.find((hr) => hr.id === hrId)
      : null;

    serviceAccess.hrAccounts = Array.isArray(serviceAccess.hrAccounts)
      ? serviceAccess.hrAccounts.filter((hr) => hr.id !== hrId)
      : [];

    // Unassign any employees that were under this HR's management.
    if (Array.isArray(serviceAccess.employees)) {
      serviceAccess.employees.forEach((emp) => {
        if (emp.assignedHrId === hrId) {
          emp.assignedHrId = "";
          emp.assignedHrName = "";
          emp.assignedAt = null;
        }
      });
    }

    await serviceAccess.save();

    if (target?.userId) {
      await User.deleteOne({ _id: target.userId, companyId });
    }

    return res.json({ success: true, hrId, serviceAccess });
  } catch (err) {
    next(err);
  }
}

async function deleteCompanyEmployee(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    const { employeeId } = req.params;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const serviceAccess = await CompanyServiceAccess.findOne({ companyId });

    if (serviceAccess) {
      serviceAccess.employees = serviceAccess.employees.filter((emp) => emp.id !== employeeId);
      serviceAccess.hrAccounts = Array.isArray(serviceAccess.hrAccounts)
        ? serviceAccess.hrAccounts.filter((hr) => hr.id !== employeeId)
        : [];
      await serviceAccess.save();
    } else {
      return res.status(404).json({ success: false, message: "No employee access record found" });
    }

    return res.json({ success: true, employeeId });
  } catch (err) {
    next(err);
  }
}

async function getCompanySubscription(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const subscription = await Subscription.findOne({ companyId }).lean();
    const serviceAccess = await CompanyServiceAccess.findOne({ companyId }).lean();
    const company = await Company.findById(companyId).lean();
    const hrAccess = {
      companyId,
      companyCode: company?.companyCode || serviceAccess?.companyCode || "",
      hrAccounts: Array.isArray(serviceAccess?.hrAccounts) ? serviceAccess.hrAccounts : [],
    };
    return res.json({
      success: true,
      subscription,
      resolvedSubscription: buildResolvedSubscription(company, subscription || serviceAccess?.subscription || null),
      serviceAccess,
      hrAccess,
    });
  } catch (err) {
    next(err);
  }
}

async function upsertCompanySubscription(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const { planKey, billing, expiresAt } = req.body;
    const now = new Date();
    const expiry = expiresAt ? new Date(expiresAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let subscription = await Subscription.findOne({ companyId });
    const historyItem = { planKey, billing, purchasedAt: now, expiresAt: expiry };

    if (!subscription) {
      subscription = await Subscription.create({ companyId, plan: planKey, status: "ACTIVE", startsAt: now, endsAt: expiry });
    } else {
      subscription.plan = planKey;
      subscription.status = "ACTIVE";
      subscription.startsAt = now;
      subscription.endsAt = expiry;
      await subscription.save();
    }

    let serviceAccess = await CompanyServiceAccess.findOne({ companyId });
    if (!serviceAccess) {
      serviceAccess = await CompanyServiceAccess.create({ companyId, subscription: { planKey, billing, purchasedAt: now, expiresAt: expiry, purchaseCount: 1, renewCount: 0, history: [historyItem] } });
    } else {
      serviceAccess.subscription = {
        ...(serviceAccess.subscription || {}),
        planKey,
        billing,
        purchasedAt: now,
        expiresAt: expiry,
        purchaseCount: (serviceAccess.subscription?.purchaseCount || 0) + 1,
        renewCount: (serviceAccess.subscription?.renewCount || 0) + 1,
        history: [...(serviceAccess.subscription?.history || []), historyItem],
      };
      await serviceAccess.save();
    }

    return res.json({ success: true, subscription, serviceAccess });
  } catch (err) {
    next(err);
  }
}

async function getCompanyPayroll(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    let payroll = await CompanyPayroll.findOne({ companyId }).lean();
    if (!payroll) {
      payroll = await CompanyPayroll.create({ companyId, rows: [], transactions: [] });
    }
    return res.json({ success: true, payroll });
  } catch (err) {
    next(err);
  }
}

async function submitCompanyPayroll(req, res, next) {
  try {
    const companyId = req.params.companyId || req.user?.companyId || req.company?._id;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const { rows, transactions } = req.body;
    const payroll = await CompanyPayroll.findOneAndUpdate(
      { companyId },
      { $set: { rows: rows || [], transactions: transactions || [] } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, payroll });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendRequest,
  listRequests,
  getRequestById,
  getRequestDoc,
  getCompanyDashboard,
  getCompanyAnalytics,
  getCompanyEmployees,
  upsertCompanyEmployees,
  deleteCompanyEmployee,
  getCompanyHrAccounts,
  upsertCompanyHrAccount,
  deleteCompanyHrAccount,
  getHrManagedEmployees,
  getCompanySubscription,
  upsertCompanySubscription,
  getCompanyPayroll,
  submitCompanyPayroll,
};
