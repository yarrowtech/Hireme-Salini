// src/controllers/company.controller.js
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Company = require("../models/Company");
const EmployeeProfile = require("../models/EmployeeProfile");
const Subscription = require("../models/Subscription");
const CompanyPayroll = require("../models/CompanyPayroll");
const Attendance = require("../models/Attendance");
const SalaryStructure = require("../models/SalaryStructure");
const PayrollRun = require("../models/PayrollRun");
const CompanyServiceAccess = require("../models/CompanyServiceAccess");
const CompanyEmployeeData = require("../models/CompanyEmployeeData");
const User = require("../models/User");
const { ROLES } = require("../config/roles");
const companyEmployees = require("../services/companyEmployees");
const Holiday = require("../models/Holiday");
const attendanceRules = require("../utils/attendanceRules");
const attendanceService = require("../services/attendanceService");
const { computePayItem } = require("../utils/payrollCalc");

const holidayDateSet = (companyId, fromKey, toKey) => attendanceService.holidaySet(companyId, fromKey, toKey);
const getAttendancePolicy = (companyId) => attendanceService.getPolicy(companyId);
const {
  isHrRecordLike,
  dedupeAccountsById,
  normalizeProfileEmployee,
  normalizeServiceEmployee,
} = require("../utils/employeeNormalizers");

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
const DEFAULT_ENTRY_TIME = "11:00";
const DEFAULT_EXIT_TIME = "18:00";

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

function getAuthenticatedCompanyId(req) {
  return req.company?._id || req.user?.companyId || req.params.companyId;
}

function toDateKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function getMonthKey(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 7);
}

function monthBounds(month) {
  const normalized = String(month || getMonthKey()).slice(0, 7);
  const [year, monthNum] = normalized.split("-").map(Number);
  if (!year || !monthNum || monthNum < 1 || monthNum > 12) return null;
  const start = new Date(Date.UTC(year, monthNum - 1, 1));
  const end = new Date(Date.UTC(year, monthNum, 0));
  return {
    month: normalized,
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
    daysInMonth: end.getUTCDate(),
  };
}

function numeric(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function salaryGross(structure) {
  return (
    numeric(structure?.basic) +
    numeric(structure?.hra) +
    numeric(structure?.conveyance) +
    numeric(structure?.medicalAllowance) +
    numeric(structure?.specialAllowance) +
    numeric(structure?.bonus)
  );
}

function salaryFixedDeductions(structure) {
  return (
    numeric(structure?.pf) +
    numeric(structure?.esi) +
    numeric(structure?.professionalTax) +
    numeric(structure?.incomeTax) +
    numeric(structure?.insurance) +
    numeric(structure?.otherDeductions)
  );
}

function publicPayrollRun(run) {
  if (!run) return null;
  const obj = typeof run.toObject === "function" ? run.toObject() : run;
  return {
    ...obj,
    payroll: {
      rows: Array.isArray(obj.items)
        ? obj.items.map((item) => ({
            id: String(item._id || item.employeeId),
            employeeId: item.employeeId,
            employeeName: item.employeeName,
            role: item.role,
            month: obj.month,
            baseSalary: item.grossSalary,
            bonus: 0,
            deductions: item.totalDeductions,
            netPay: item.netSalary,
            status:
              item.status === "PAID"
                ? "CONFIRMED"
                : item.status === "PROCESSING"
                ? "SUBMITTED"
                : item.status === "FAILED"
                ? "FAILED"
                : item.status === "APPROVED"
                ? "INITIATED"
                : "PENDING",
          }))
        : [],
      transactions: Array.isArray(obj.items)
        ? obj.items
            .filter((item) => item?.payment?.referenceNo)
            .map((item) => ({
              id: String(item._id || item.employeeId),
              createdAt: item.payment.paymentDate || item.updatedAt || obj.updatedAt,
              companyName: "Company",
              month: obj.month,
              method: item.payment.paymentMethod || "BANK_TRANSFER",
              amount: item.payment.amount || item.netSalary,
              referenceNo: item.payment.referenceNo,
              proofName: item.payment.proofName || "",
              status: item.status === "FAILED" ? "FAILED" : item.status === "PAID" ? "CONFIRMED" : "SUBMITTED",
            }))
        : [],
    },
  };
}

async function getEmployeeRoster(companyId) {
  const company = await Company.findById(companyId).select("companyCode").lean();
  const { employees, companyCode } = await companyEmployees.listEmployees(
    companyId,
    company?.companyCode != null ? String(company.companyCode) : ""
  );
  return { employees, company, resolvedCompanyCode: String(companyCode || company?.companyCode || "").trim() };
}

function summarizeAttendance(records) {
  const summary = {
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    holiday: 0,
    weeklyOff: 0,
    workFromHome: 0,
    missingCheckout: 0,
    pendingCorrections: 0,
    overtimeHours: 0,
  };

  for (const record of records || []) {
    if (["PRESENT", "WORK_FROM_HOME"].includes(record.status)) summary.present += 1;
    if (record.status === "ABSENT") summary.absent += 1;
    if (record.status === "LATE") {
      summary.present += 1;
      summary.late += 1;
    }
    if (record.status === "HALF_DAY") {
      summary.present += 0.5;
      summary.halfDay += 1;
    }
    if (record.status === "ON_LEAVE") summary.onLeave += 1;
    if (record.status === "HOLIDAY") summary.holiday += 1;
    if (record.status === "WEEKLY_OFF") summary.weeklyOff += 1;
    if (record.status === "WORK_FROM_HOME") summary.workFromHome += 1;
    if (record.status === "MISSING_CHECKOUT") {
      summary.present += 1;
      summary.missingCheckout += 1;
    }
    summary.overtimeHours += numeric(record.overtimeHours);
    summary.pendingCorrections += (record.correctionRequests || []).filter((r) => r.status === "PENDING").length;
  }

  return summary;
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
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const todayKey = toDateKey();
    const currentMonth = getMonthKey();
    const [company, employeeRows, subscription, payroll, serviceAccessRaw, todayAttendance, currentPayrollRun] = await Promise.all([
      Company.findById(companyId).select("-__v").lean(),
      EmployeeProfile.find({ companyId }).populate("userId", "name username email companyCode isActive").lean(),
      Subscription.findOne({ companyId }).lean(),
      CompanyPayroll.findOne({ companyId }).lean(),
      CompanyServiceAccess.findOne({ companyId }).lean(),
      Attendance.find({ companyId, date: todayKey }).lean(),
      PayrollRun.findOne({ companyId, month: currentMonth }).lean(),
    ]);

    const serviceAccess = await persistServiceAccessSplit(companyId, serviceAccessRaw, company?.companyCode || serviceAccessRaw?.companyCode || "");

    const { employees: rosterEmployees } = await companyEmployees.listEmployees(
      companyId,
      company?.companyCode != null ? String(company.companyCode) : ""
    );
    const employeeCount = rosterEmployees.length;
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
      employeeOperations: {
        today: todayKey,
        currentMonth,
        attendance: {
          ...summarizeAttendance(todayAttendance),
          totalMarked: todayAttendance.length,
        },
        payroll: currentPayrollRun
          ? {
              runId: currentPayrollRun._id,
              month: currentPayrollRun.month,
              status: currentPayrollRun.status,
              totalNet: currentPayrollRun.totalNet,
              awaitingPayment: (currentPayrollRun.items || []).filter((item) => ["APPROVED", "PROCESSING"].includes(item.status)).length,
              failedPayments: (currentPayrollRun.items || []).filter((item) => item.status === "FAILED").length,
              completionPercentage: currentPayrollRun.items?.length
                ? Math.round(
                    ((currentPayrollRun.items || []).filter((item) => item.status === "PAID").length /
                      currentPayrollRun.items.length) *
                      100
                  )
                : 0,
            }
          : null,
      },
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
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const [company, employees, serviceAccessRaw] = await Promise.all([
      Company.findById(companyId).select("-__v").lean(),
      EmployeeProfile.find({ companyId }).populate("userId", "name username email companyCode isActive").lean(),
      CompanyServiceAccess.findOne({ companyId }).lean(),
    ]);

    const serviceAccess = await persistServiceAccessSplit(companyId, serviceAccessRaw, company?.companyCode || serviceAccessRaw?.companyCode || "");

    const { employees: rosterEmployees } = await companyEmployees.listEmployees(
      companyId,
      company?.companyCode != null ? String(company.companyCode) : ""
    );
    const employeeRows = rosterEmployees.length
      ? rosterEmployees
      : employees.map(normalizeProfileEmployee).filter((emp) => !isHrRecordLike(emp));

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
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const { employees, companyCode } = await companyEmployees.listEmployees(companyId);
    return res.json({
      success: true,
      count: employees.length,
      companyId: String(companyId),
      companyCode,
      employees,
    });
  } catch (err) {
    next(err);
  }
}

async function getCompanyEmployeeById(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    const targetEmployeeId = String(req.params.employeeId || "").trim();
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    if (!targetEmployeeId) {
      return res.status(400).json({ success: false, message: "Employee id is required" });
    }

    const { employee, companyCode } = await companyEmployees.getEmployee(companyId, targetEmployeeId);

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    return res.json({
      success: true,
      companyId: String(companyId),
      companyCode,
      employee,
    });
  } catch (err) {
    next(err);
  }
}

async function upsertCompanyEmployees(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const {
      id,
      companyCode,
      name,
      role,
      department,
      contact,
      status,
      type,
      email,
      phone,
      username,
      photoUrl,
      aadhaarNumber,
      aadhaarStatus,
      panNumber,
      panStatus,
      assignedHrId,
      assignedHrName,
      employmentType,
      joiningDate,
      manager,
      supervisorName,
      workLocation,
      shiftName,
      shiftStart,
      shiftEnd,
      weeklyOff,
      attendanceMode,
      geoTaggingEnabled,
      accessLevel,
      dateOfBirth,
      dob,
      gender,
      address,
      emergencyContactName,
      emergencyContactPhone,
      notes,
    } = req.body;
    const employeeId = String(id || "").trim();
    const employeeName = String(name || "").trim();
    if (!employeeName || !employeeId) {
      return res.status(400).json({ success: false, message: "Employee name and id are required" });
    }

    const normalizedType = String(type || "").trim().toUpperCase();
    if (normalizedType === "HR") {
      return res.status(400).json({ success: false, message: "HR records are no longer managed from this endpoint" });
    }

    const employee = await companyEmployees.upsertEmployee(companyId, {
      id: employeeId,
      employeeId,
      companyCode,
      name: employeeName,
      role: role || "Employee",
      department: department || "General",
      email,
      phone: phone || contact,
      contact: contact || phone || email,
      username,
      photoUrl,
      aadhaarNumber,
      aadhaarStatus,
      panNumber,
      panStatus,
      assignedHrId,
      assignedHrName,
      employmentType,
      joiningDate,
      manager,
      supervisorName,
      workLocation,
      shiftName,
      shiftStart,
      shiftEnd,
      weeklyOff,
      attendanceMode,
      geoTaggingEnabled,
      accessLevel,
      dateOfBirth: dateOfBirth || dob,
      dob: dateOfBirth || dob,
      gender,
      address,
      emergencyContactName,
      emergencyContactPhone,
      notes,
      status: status || "ACTIVE",
    });

    return res.json({
      success: true,
      employee: normalizeServiceEmployee(employee, employee.companyCode),
    });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

async function upsertCompanyEmployeePortalLogin(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    const targetEmployeeId = String(req.params.employeeId || "").trim();
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    if (!targetEmployeeId) {
      return res.status(400).json({ success: false, message: "Employee id is required" });
    }

    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const emailInput = String(req.body.email || "").trim().toLowerCase();

    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required" });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const { employee, companyCode } = await companyEmployees.getEmployee(companyId, targetEmployeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const code = Number(companyCode || employee.companyCode || req.user.companyCode || 0);
    if (!Number.isFinite(code) || code < 100 || code > 999) {
      return res.status(400).json({ success: false, message: "Valid company code was not found for this company" });
    }

    const email = emailInput || String(employee.email || `${username}@employee.local`).trim().toLowerCase();
    const existingUserId = employee.userId || null;
    let user = existingUserId ? await User.findOne({ _id: existingUserId, companyId }) : null;

    const usernameOwner = await User.findOne({ companyId, username, _id: { $ne: user?._id || null } }).lean();
    if (usernameOwner) {
      return res.status(409).json({ success: false, message: "Username is already used by another employee in this company" });
    }

    const emailOwner = await User.findOne({ companyId, email, _id: { $ne: user?._id || null } }).lean();
    if (emailOwner) {
      return res.status(409).json({ success: false, message: "Email is already used by another employee login in this company" });
    }

    if (!user) {
      if (!password) {
        return res.status(400).json({ success: false, message: "Password is required when creating a new employee login" });
      }
      user = new User({
        name: employee.name || "",
        username,
        email,
        role: ROLES.EMPLOYEE,
        companyId,
        companyCode: code,
        isActive: String(employee.status || "ACTIVE").toUpperCase() !== "INACTIVE",
      });
    } else {
      user.name = employee.name || user.name || "";
      user.username = username;
      user.email = email;
      user.role = ROLES.EMPLOYEE;
      user.companyCode = code;
      user.isActive = String(employee.status || "ACTIVE").toUpperCase() !== "INACTIVE";
    }

    if (password) await user.setPassword(password);
    await user.save();

    const updatedEmployee = await CompanyEmployeeData.findOneAndUpdate(
      { companyId, employeeId: targetEmployeeId },
      {
        $set: {
          userId: user._id,
          username,
          email,
          hasLogin: true,
          loginUpdatedAt: new Date(),
          ...(password ? { passwordUpdatedAt: new Date() } : {}),
        },
      },
      { new: true }
    ).lean();

    return res.json({
      success: true,
      message: password ? "Employee portal login saved" : "Employee portal username saved",
      login: {
        username: user.username,
        companyCode: code,
        hasLogin: true,
        passwordUpdatedAt: updatedEmployee?.passwordUpdatedAt || null,
        loginUpdatedAt: updatedEmployee?.loginUpdatedAt || null,
      },
      employee: normalizeServiceEmployee(updatedEmployee || employee, String(code)),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: "Username or email already exists for this company" });
    }
    next(err);
  }
}

async function getHrManagedEmployees(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    const { hrId } = req.params;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const employees = await companyEmployees.listByHr(companyId, hrId);

    return res.json({ success: true, hrId, employees });
  } catch (err) {
    next(err);
  }
}

async function getCompanyHrAccounts(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
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
    const companyId = getAuthenticatedCompanyId(req);
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
    const companyId = getAuthenticatedCompanyId(req);
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
    await companyEmployees.unassignHr(companyId, hrId);

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
    const companyId = getAuthenticatedCompanyId(req);
    const { employeeId } = req.params;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    await companyEmployees.deleteEmployee(companyId, employeeId);

    // Also drop any legacy embedded / HR-account row with the same id.
    const serviceAccess = await CompanyServiceAccess.findOne({ companyId });
    if (serviceAccess) {
      const target = String(employeeId || "").trim();
      if (Array.isArray(serviceAccess.employees)) {
        serviceAccess.employees = serviceAccess.employees.filter((emp) => String(emp.id || "").trim() !== target);
      }
      if (Array.isArray(serviceAccess.hrAccounts)) {
        serviceAccess.hrAccounts = serviceAccess.hrAccounts.filter((hr) => hr.id !== employeeId);
      }
      await serviceAccess.save();
    }

    return res.json({ success: true, employeeId });
  } catch (err) {
    next(err);
  }
}

async function getCompanySubscription(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
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
    const companyId = getAuthenticatedCompanyId(req);
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
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const requestedMonth = String(req.query.month || getMonthKey()).slice(0, 7);
    const [legacyPayroll, runs] = await Promise.all([
      CompanyPayroll.findOne({ companyId }).lean(),
      PayrollRun.find({ companyId }).sort({ month: -1 }).lean(),
    ]);
    const currentRun = runs.find((run) => run.month === requestedMonth) || runs[0] || null;
    return res.json({
      success: true,
      payroll: currentRun ? publicPayrollRun(currentRun).payroll : legacyPayroll || { rows: [], transactions: [] },
      payrollRun: currentRun ? publicPayrollRun(currentRun) : null,
      payrollRuns: runs.map((run) => publicPayrollRun(run)),
    });
  } catch (err) {
    next(err);
  }
}

async function submitCompanyPayroll(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }

    const { rows, transactions } = req.body;
    const payroll = await CompanyPayroll.findOneAndUpdate(
      { companyId },
      { $set: { rows: rows || [], transactions: transactions || [] } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({
      success: true,
      payroll,
      message: "Legacy payroll saved. Use payroll runs for server-calculated payroll.",
    });
  } catch (err) {
    next(err);
  }
}

async function getCompanyAttendance(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    const today = toDateKey();
    const month = String(req.query.month || getMonthKey()).slice(0, 7);
    const employeeId = String(req.query.employeeId || "").trim();
    const filter = { companyId, date: { $regex: `^${month}` } };
    if (employeeId) filter.employeeId = employeeId;
    const [records, todayRecords] = await Promise.all([
      Attendance.find(filter).sort({ date: 1, employeeName: 1 }).lean(),
      Attendance.find({ companyId, date: today }).lean(),
    ]);
    return res.json({
      success: true,
      month,
      today,
      records,
      todayOverview: {
        ...summarizeAttendance(todayRecords),
        totalMarked: todayRecords.length,
        lateEmployees: todayRecords.filter((record) => record.status === "LATE"),
        missingCheckouts: todayRecords.filter((record) => record.status === "MISSING_CHECKOUT"),
        absentEmployees: todayRecords.filter((record) => record.status === "ABSENT"),
      },
      monthlySummary: summarizeAttendance(records),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Core attendance write used by the single-mark route, the bulk route and the
 * employee self check-in/out route. Derives status + metrics from shift times
 * unless the caller forces an explicit status. Throws { status, message }.
 */
async function writeAttendance(companyId, body = {}, actor = "Company") {
  const employeeId = String(body.employeeId || "").trim();
  const date = toDateKey(body.date);
  if (!employeeId || !date) {
    throw Object.assign(new Error("Employee id and date are required"), { status: 400 });
  }
  const existing = await Attendance.findOne({ companyId, employeeId, date });
  if (existing?.lockedForPayroll) {
    throw Object.assign(new Error("Attendance is locked for payroll"), { status: 409 });
  }
  const { employee: masterEmployee, companyCode: resolvedCompanyCode } = await companyEmployees.getEmployee(
    companyId,
    employeeId
  );

  // "check-in" mode merges onto any existing row so a later check-out keeps the check-in time.
  const checkIn = String(body.checkIn ?? existing?.checkIn ?? "").trim();
  const checkOut = String(body.checkOut ?? existing?.checkOut ?? "").trim();
  const requestedStatusRaw = String(body.status || "").toUpperCase().replace(/\s+/g, "_");
  const requestedStatus = ["AUTO", "NOT_MARKED", "PENDING"].includes(requestedStatusRaw) ? "" : requestedStatusRaw;
  const hasTimeEntry = Boolean(checkIn || checkOut);
  const shouldDeriveFromTime =
    hasTimeEntry && ["PRESENT", "LATE", "HALF_DAY", "MISSING_CHECKOUT"].includes(requestedStatus);

  const [policy, holidays] = await Promise.all([getAttendancePolicy(companyId), holidayDateSet(companyId, date, date)]);
  const derived = attendanceRules.deriveAttendance(
    {
      dateStr: date,
      checkIn,
      checkOut,
      manualStatus: shouldDeriveFromTime ? "" : requestedStatus,
      isHoliday: holidays.has(date),
      isPastDay: date < toDateKey(),
    },
    {
      ...masterEmployee,
      shiftName: body.shiftName || masterEmployee?.shiftName,
      shiftStart: body.shiftStart || masterEmployee?.shiftStart || DEFAULT_ENTRY_TIME,
      shiftEnd: body.shiftEnd || masterEmployee?.shiftEnd || DEFAULT_EXIT_TIME,
      weeklyOff: body.weeklyOff || masterEmployee?.weeklyOff,
    },
    policy
  );
  const status = derived.status === "NOT_MARKED" ? requestedStatus || "PRESENT" : derived.status;

  const payload = {
    companyId,
    companyCode:
      String(body.companyCode || "").trim() ||
      String(masterEmployee?.companyCode || resolvedCompanyCode || existing?.companyCode || "").trim(),
    employeeId,
    employeeName: String(body.employeeName || masterEmployee?.name || existing?.employeeName || "").trim(),
    department: String(body.department || masterEmployee?.department || existing?.department || "").trim(),
    date,
    status,
    checkIn,
    checkOut,
    shiftName: String(body.shiftName || masterEmployee?.shiftName || existing?.shiftName || "").trim(),
    workLocation: String(body.workLocation || masterEmployee?.workLocation || existing?.workLocation || "").trim(),
    mode: String(body.mode || "MANUAL").trim(),
    lateMinutes: body.lateMinutes != null ? numeric(body.lateMinutes) : derived.lateMinutes,
    earlyMinutes: body.earlyMinutes != null ? numeric(body.earlyMinutes) : derived.earlyMinutes,
    workedHours: body.workedHours != null ? numeric(body.workedHours) : derived.workedHours,
    overtimeHours: body.overtimeHours != null ? numeric(body.overtimeHours) : derived.overtimeHours,
    autoGenerated: false,
    notes: String(body.notes || "").trim(),
    markedBy: String(body.markedBy || actor || "Company").trim(),
  };
  return Attendance.findOneAndUpdate(
    { companyId, employeeId, date },
    { $set: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function upsertCompanyAttendance(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    const actor = req.body.markedBy || req.user?.name || req.user?.username || "Company";
    const record = await writeAttendance(companyId, req.body, actor);
    return res.json({ success: true, attendance: record });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

async function bulkCompanyAttendance(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    const date = toDateKey(req.body.date);
    if (!date) return res.status(400).json({ success: false, message: "date is required" });

    let entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    if (!entries.length && Array.isArray(req.body.employeeIds)) {
      const status = String(req.body.status || "PRESENT");
      entries = req.body.employeeIds.map((employeeId) => ({ employeeId, status }));
    }
    if (!entries.length) {
      return res.status(400).json({ success: false, message: "Provide entries[] or employeeIds[]" });
    }
    const actor = req.body.markedBy || req.user?.name || req.user?.username || "Company";
    const results = [];
    for (const entry of entries) {
      try {
        const record = await writeAttendance(companyId, { ...entry, date }, actor);
        results.push({ employeeId: record.employeeId, ok: true, status: record.status });
      } catch (err) {
        results.push({ employeeId: entry.employeeId, ok: false, message: err.message });
      }
    }
    return res.json({
      success: true,
      date,
      updated: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  } catch (err) {
    next(err);
  }
}

async function getCompanyAttendanceDaily(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    const data = await attendanceService.dailyRegister(companyId, req.query.date, req.query);
    return res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

async function getCompanyAttendanceMonthly(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    const data = await attendanceService.monthlyGrid(companyId, req.query.month, req.query);
    return res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

async function getCompanyAttendanceYearly(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    const data = await attendanceService.yearlyGrid(companyId, req.query.year, req.query);
    return res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

async function runCompanyAutoAbsent(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    const result = await attendanceService.runAutoAbsent(companyId, toDateKey(req.body.date));
    return res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function getCompanyAttendancePolicy(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    return res.json({ success: true, attendancePolicy: await attendanceService.getPolicy(companyId) });
  } catch (err) {
    next(err);
  }
}

async function updateCompanyAttendancePolicy(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    return res.json({ success: true, attendancePolicy: await attendanceService.savePolicy(companyId, req.body || {}) });
  } catch (err) {
    next(err);
  }
}

async function listCompanyHolidays(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    return res.json({ success: true, holidays: await attendanceService.listHolidays(companyId, req.query.year) });
  } catch (err) {
    next(err);
  }
}

async function createCompanyHoliday(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    const company = await Company.findById(companyId).select("companyCode").lean();
    const holiday = await attendanceService.saveHoliday(companyId, company?.companyCode || "", req.body || {});
    return res.status(201).json({ success: true, holiday });
  } catch (err) {
    if (err?.status) return res.status(err.status).json({ success: false, message: err.message });
    next(err);
  }
}

async function deleteCompanyHoliday(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    await attendanceService.deleteHoliday(companyId, req.params.holidayId);
    return res.json({ success: true, holidayId: req.params.holidayId });
  } catch (err) {
    next(err);
  }
}

async function requestAttendanceCorrection(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    const employeeId = String(req.params.employeeId || req.body.employeeId || "").trim();
    const date = toDateKey(req.body.date);
    if (!companyId || !mongoose.isValidObjectId(companyId) || !employeeId || !date) {
      return res.status(400).json({ success: false, message: "Valid company, employee and date are required" });
    }
    const { employee: masterEmployee, companyCode: resolvedCompanyCode } = await companyEmployees.getEmployee(
      companyId,
      employeeId
    );
    const record = await Attendance.findOneAndUpdate(
      { companyId, employeeId, date },
      {
        $setOnInsert: {
          companyId,
          companyCode: String(masterEmployee?.companyCode || resolvedCompanyCode || "").trim(),
          employeeId,
          employeeName: String(req.body.employeeName || masterEmployee?.name || "").trim(),
          department: String(req.body.department || masterEmployee?.department || "").trim(),
          date,
          status: "ABSENT",
        },
        $push: {
          correctionRequests: {
            requestedBy: String(req.body.requestedBy || employeeId).trim(),
            reason: String(req.body.reason || "").trim(),
            requestedStatus: String(req.body.requestedStatus || "PRESENT").toUpperCase().replace(/\s+/g, "_"),
            requestedCheckIn: String(req.body.requestedCheckIn || "").trim(),
            requestedCheckOut: String(req.body.requestedCheckOut || "").trim(),
          },
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, attendance: record });
  } catch (err) {
    next(err);
  }
}

async function reviewAttendanceCorrection(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    const { attendanceId, requestId } = req.params;
    const decision = String(req.body.status || "").toUpperCase();
    if (!["APPROVED", "REJECTED"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be APPROVED or REJECTED" });
    }
    const record = await Attendance.findOne({ _id: attendanceId, companyId });
    if (!record) return res.status(404).json({ success: false, message: "Attendance record not found" });
    if (record.lockedForPayroll) return res.status(409).json({ success: false, message: "Attendance is locked for payroll" });
    const correction = record.correctionRequests.id(requestId);
    if (!correction) return res.status(404).json({ success: false, message: "Correction request not found" });
    correction.status = decision;
    correction.reviewedBy = String(req.body.reviewedBy || req.user?.name || req.user?.username || "Company").trim();
    correction.reviewedAt = new Date();
    correction.reviewerNote = String(req.body.reviewerNote || "").trim();
    if (decision === "APPROVED") {
      record.status = correction.requestedStatus;
      record.checkIn = correction.requestedCheckIn || record.checkIn;
      record.checkOut = correction.requestedCheckOut || record.checkOut;
    }
    await record.save();
    return res.json({ success: true, attendance: record });
  } catch (err) {
    next(err);
  }
}

async function getCompanySalaryStructures(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    const employeeId = String(req.query.employeeId || "").trim();
    const filter = { companyId };
    if (employeeId) filter.employeeId = employeeId;
    const salaryStructures = await SalaryStructure.find(filter).sort({ employeeId: 1, effectiveFrom: -1 }).lean();
    return res.json({ success: true, salaryStructures });
  } catch (err) {
    next(err);
  }
}

async function upsertCompanySalaryStructure(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return res.status(400).json({ success: false, message: "Invalid companyId" });
    }
    const employeeId = String(req.body.employeeId || "").trim();
    const effectiveFrom = toDateKey(req.body.effectiveFrom);
    if (!employeeId || !effectiveFrom) {
      return res.status(400).json({ success: false, message: "Employee id and effective date are required" });
    }
    const payload = {
      companyId,
      employeeId,
      employeeName: String(req.body.employeeName || "").trim(),
      effectiveFrom,
      effectiveTo: req.body.effectiveTo ? toDateKey(req.body.effectiveTo) : "",
      currency: String(req.body.currency || "INR").trim(),
      basic: numeric(req.body.basic),
      hra: numeric(req.body.hra),
      conveyance: numeric(req.body.conveyance),
      medicalAllowance: numeric(req.body.medicalAllowance),
      specialAllowance: numeric(req.body.specialAllowance),
      bonus: numeric(req.body.bonus),
      overtimeRatePerHour: numeric(req.body.overtimeRatePerHour),
      pf: numeric(req.body.pf),
      esi: numeric(req.body.esi),
      professionalTax: numeric(req.body.professionalTax),
      incomeTax: numeric(req.body.incomeTax),
      insurance: numeric(req.body.insurance),
      otherDeductions: numeric(req.body.otherDeductions),
      createdBy: String(req.body.createdBy || req.user?.name || req.user?.username || "Company").trim(),
      notes: String(req.body.notes || "").trim(),
    };
    const salaryStructure = await SalaryStructure.findOneAndUpdate(
      { companyId, employeeId, effectiveFrom },
      { $set: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, salaryStructure });
  } catch (err) {
    next(err);
  }
}

async function createPayrollRun(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    const bounds = monthBounds(req.body.month);
    if (!companyId || !mongoose.isValidObjectId(companyId) || !bounds) {
      return res.status(400).json({ success: false, message: "Valid company and payroll month are required" });
    }
    const run = await PayrollRun.findOneAndUpdate(
      { companyId, month: bounds.month },
      {
        $setOnInsert: {
          companyId,
          month: bounds.month,
          periodStart: bounds.periodStart,
          periodEnd: bounds.periodEnd,
          createdBy: String(req.body.createdBy || req.user?.name || req.user?.username || "Company").trim(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.status(201).json({ success: true, payrollRun: publicPayrollRun(run) });
  } catch (err) {
    next(err);
  }
}

async function lockPayrollAttendance(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    const run = await PayrollRun.findOne({ _id: req.params.runId, companyId });
    if (!run) return res.status(404).json({ success: false, message: "Payroll run not found" });
    if (["APPROVED", "PROCESSING", "PAID"].includes(run.status)) {
      return res.status(409).json({ success: false, message: "Payroll run can no longer lock attendance" });
    }
    const missingCheckouts = await Attendance.countDocuments({
      companyId,
      date: { $gte: run.periodStart, $lte: run.periodEnd },
      status: "MISSING_CHECKOUT",
    });
    if (missingCheckouts && req.body.force !== true) {
      return res.status(409).json({ success: false, message: "Resolve missing check-outs or send force=true", missingCheckouts });
    }
    run.attendanceLocked = true;
    run.attendanceLockedAt = new Date();
    run.attendanceLockedBy = String(req.body.lockedBy || req.user?.name || req.user?.username || "Company").trim();
    await Attendance.updateMany(
      { companyId, date: { $gte: run.periodStart, $lte: run.periodEnd } },
      { $set: { lockedForPayroll: true, lockedPayrollRunId: run._id } }
    );
    await run.save();
    return res.json({ success: true, payrollRun: publicPayrollRun(run) });
  } catch (err) {
    next(err);
  }
}

async function calculatePayrollRun(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    const run = await PayrollRun.findOne({ _id: req.params.runId, companyId });
    if (!run) return res.status(404).json({ success: false, message: "Payroll run not found" });
    if (!run.attendanceLocked) return res.status(409).json({ success: false, message: "Lock attendance before calculation" });

    const [{ employees }, attendanceRecords, structures, policy, holidaySet] = await Promise.all([
      getEmployeeRoster(companyId),
      Attendance.find({ companyId, date: { $gte: run.periodStart, $lte: run.periodEnd } }).lean(),
      SalaryStructure.find({ companyId, effectiveFrom: { $lte: run.periodEnd } }).sort({ effectiveFrom: -1 }).lean(),
      getAttendancePolicy(companyId),
      holidayDateSet(companyId, run.periodStart, run.periodEnd),
    ]);
    const attendanceByEmployee = attendanceRecords.reduce((map, record) => {
      const list = map.get(record.employeeId) || [];
      list.push(record);
      map.set(record.employeeId, list);
      return map;
    }, new Map());
    const structuresByEmployee = new Map();
    for (const structure of structures) {
      if (!structuresByEmployee.has(structure.employeeId)) structuresByEmployee.set(structure.employeeId, structure);
    }

    const items = employees
      .filter((employee) => String(employee.status || "ACTIVE").toUpperCase() !== "INACTIVE")
      .map((employee) => {
        const key = employee.employeeId || employee.id;
        const records = attendanceByEmployee.get(key) || [];
        const structure = structuresByEmployee.get(key);
        return {
          ...computePayItem(employee, records, structure, { month: run.month, policy, holidaySet }),
          status: "CALCULATED",
        };
      });

    run.items = items;
    run.status = "CALCULATED";
    run.totalGross = items.reduce((sum, item) => sum + item.grossSalary, 0);
    run.totalDeductions = items.reduce((sum, item) => sum + item.totalDeductions, 0);
    run.totalNet = items.reduce((sum, item) => sum + item.netSalary, 0);
    await run.save();
    return res.json({ success: true, payrollRun: publicPayrollRun(run), payroll: publicPayrollRun(run).payroll });
  } catch (err) {
    next(err);
  }
}

async function approvePayrollRun(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    const run = await PayrollRun.findOne({ _id: req.params.runId, companyId });
    if (!run) return res.status(404).json({ success: false, message: "Payroll run not found" });
    if (!["CALCULATED", "UNDER_REVIEW"].includes(run.status)) {
      return res.status(409).json({ success: false, message: "Only calculated or under review payroll can be approved" });
    }
    run.status = "APPROVED";
    run.approvals.push({
      approvedBy: String(req.body.approvedBy || req.user?.name || req.user?.username || "Company").trim(),
      note: String(req.body.note || "").trim(),
    });
    run.items.forEach((item) => {
      if (["CALCULATED", "UNDER_REVIEW", "DRAFT"].includes(item.status)) item.status = "APPROVED";
    });
    await run.save();
    return res.json({ success: true, payrollRun: publicPayrollRun(run), payroll: publicPayrollRun(run).payroll });
  } catch (err) {
    next(err);
  }
}

async function confirmPayrollPayment(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    const run = await PayrollRun.findOne({ _id: req.params.runId, companyId });
    if (!run) return res.status(404).json({ success: false, message: "Payroll run not found" });
    if (!["APPROVED", "PROCESSING", "FAILED"].includes(run.status)) {
      return res.status(409).json({ success: false, message: "Approve payroll before recording payment" });
    }
    const employeeIds = Array.isArray(req.body.employeeIds) ? req.body.employeeIds.map(String) : [];
    const status = String(req.body.status || "PAID").toUpperCase() === "FAILED" ? "FAILED" : "PAID";
    run.items.forEach((item) => {
      if (!employeeIds.length || employeeIds.includes(String(item.employeeId))) {
        item.status = status;
        item.payment = {
          paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : new Date(),
          paymentMethod: String(req.body.paymentMethod || "BANK_TRANSFER").toUpperCase(),
          amount: numeric(req.body.amount) || item.netSalary,
          referenceNo: String(req.body.referenceNo || "").trim(),
          proofName: String(req.body.proofName || "").trim(),
          paidBy: String(req.body.paidBy || req.user?.name || req.user?.username || "Company").trim(),
          confirmationDate: status === "PAID" ? new Date() : null,
          failureReason: status === "FAILED" ? String(req.body.failureReason || "Payment failed").trim() : "",
        };
        if (status === "PAID") {
          item.payslip = {
            generatedAt: new Date(),
            payslipNo: `PS-${run.month}-${item.employeeId}`.replace(/[^A-Z0-9-]/gi, ""),
          };
        }
      }
    });
    run.status = run.items.every((item) => item.status === "PAID")
      ? "PAID"
      : run.items.some((item) => item.status === "FAILED")
      ? "FAILED"
      : "PROCESSING";
    await run.save();
    return res.json({ success: true, payrollRun: publicPayrollRun(run), payroll: publicPayrollRun(run).payroll });
  } catch (err) {
    next(err);
  }
}

async function getEmployeePayslip(req, res, next) {
  try {
    const companyId = getAuthenticatedCompanyId(req);
    const { employeeId } = req.params;
    const month = String(req.query.month || getMonthKey()).slice(0, 7);
    const [company, run] = await Promise.all([
      Company.findById(companyId).select("CompanyName companyCode Email Contact Address").lean(),
      PayrollRun.findOne({ companyId, month }).lean(),
    ]);
    const item = (run?.items || []).find((row) => String(row.employeeId) === String(employeeId));
    if (!item || item.status !== "PAID") {
      return res.status(404).json({ success: false, message: "Paid payslip not found for this employee and month" });
    }
    return res.json({
      success: true,
      payslip: {
        company,
        employee: {
          employeeId: item.employeeId,
          employeeName: item.employeeName,
          department: item.department,
          role: item.role,
        },
        payrollMonth: run.month,
        attendanceSummary: {
          workingDays: item.workingDays,
          presentDays: item.presentDays,
          paidLeave: item.paidLeave,
          unpaidLeave: item.unpaidLeave,
          overtimeHours: item.overtimeHours,
        },
        earnings: {
          grossSalary: item.grossSalary,
        },
        deductions: {
          attendanceDeduction: item.attendanceDeduction,
          statutoryDeductions: item.statutoryDeductions,
          otherDeductions: item.otherDeductions,
          totalDeductions: item.totalDeductions,
        },
        netSalary: item.netSalary,
        payment: item.payment,
        payslip: item.payslip,
      },
    });
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
  getCompanyEmployeeById,
  upsertCompanyEmployees,
  upsertCompanyEmployeePortalLogin,
  deleteCompanyEmployee,
  getCompanyHrAccounts,
  upsertCompanyHrAccount,
  deleteCompanyHrAccount,
  getHrManagedEmployees,
  getCompanySubscription,
  upsertCompanySubscription,
  getCompanyPayroll,
  submitCompanyPayroll,
  getCompanyAttendance,
  upsertCompanyAttendance,
  bulkCompanyAttendance,
  getCompanyAttendanceDaily,
  getCompanyAttendanceMonthly,
  getCompanyAttendanceYearly,
  runCompanyAutoAbsent,
  getCompanyAttendancePolicy,
  updateCompanyAttendancePolicy,
  listCompanyHolidays,
  createCompanyHoliday,
  deleteCompanyHoliday,
  writeAttendance,
  requestAttendanceCorrection,
  reviewAttendanceCorrection,
  getCompanySalaryStructures,
  upsertCompanySalaryStructure,
  createPayrollRun,
  lockPayrollAttendance,
  calculatePayrollRun,
  approvePayrollRun,
  confirmPayrollPayment,
  getEmployeePayslip,
};
