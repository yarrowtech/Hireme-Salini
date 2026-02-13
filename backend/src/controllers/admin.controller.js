// src/controllers/admin.controller.js
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const Company = require("../models/Company");
const { signAdminAccessToken, signAdminRefreshToken } = require("../utils/jwt");

// OPTIONAL: If you want to delete cloudinary docs too
// const cloudinary = require("../config/cloudinary");

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function lockDate(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function normalizeStatus(s) {
  return String(s || "").trim().toUpperCase();
}

const DOC_KEYS = ["PAN", "ESI", "PF", "MOA", "MSME", "GST", "TRADE"];

/**
 * Supports docs stored under:
 * - company.docs.KEY
 * - company.files.KEY
 * Each KEY can be:
 *  { url, name, publicId }
 *  OR cloudinary-like: { secure_url, original_filename, public_id }
 */
function extractDocs(company) {
  const out = {};

  // ✅ normalize keys coming from DB
  const normalizeDocKey = (k = "") => {
    const x = String(k).trim();

    // keep original + common variants
    const upper = x.toUpperCase();

    // Your DB variants -> your canonical keys
    if (upper === "MSMC") return "MSME";
    if (upper === "TRADELICENSE" || upper === "TRADE_LICENCE" || upper === "TRADELICENCE") return "TRADE";

    // sometimes key is "TradeLicense" (camelCase)
    if (x === "TradeLicense") return "TRADE";

    return upper;
  };

  // =========================
  // ✅ 1) Read from company.documents[] (your real DB response)
  // =========================
  if (Array.isArray(company?.documents)) {
    for (const item of company.documents) {
      const key = normalizeDocKey(item?.key);
      if (!DOC_KEYS.includes(key)) continue;

      const url =
        item?.url ||
        item?.secure_url ||
        item?.downloadUrl ||
        item?.download_url ||
        item?.path ||
        item?.link ||
        "";

      // If upload saved only metadata (no url/path), this will skip (correct behavior)
      if (!url) continue;

      out[key] = {
        url: String(url),
        name:
          item?.name ||
          item?.originalName ||
          item?.original_filename ||
          item?.filename ||
          `${key.toLowerCase()}.pdf`,
        publicId: item?.publicId || item?.public_id,
      };
    }
  }

  // =========================
  // ✅ 2) Backward support: company.docs / company.files object
  // =========================
  const src = company?.docs || company?.files || null;

  const pick = (obj, k) => {
    if (!obj) return null;
    return (
      obj?.[k] ||
      obj?.[String(k).toLowerCase()] ||
      obj?.[String(k).toUpperCase()] ||
      obj?.[String(k)[0] + String(k).slice(1).toLowerCase()] ||
      null
    );
  };

  for (const k of DOC_KEYS) {
    // if we already got it from documents[], don't override
    if (out[k]?.url) continue;

    const raw = pick(src, k);
    if (!raw) continue;

    const x = raw?.file || raw?.document || raw;

    const url =
      x?.url ||
      x?.secure_url ||
      x?.downloadUrl ||
      x?.download_url ||
      x?.path ||
      x?.link ||
      "";

    if (!url) continue;

    out[k] = {
      url: String(url),
      name: x?.name || x?.original_filename || x?.filename || `${k.toLowerCase()}.pdf`,
      publicId: x?.publicId || x?.public_id,
    };
  }

  return out;
}


/**
 * Normalize plan/subscription from many possible company shapes
 * so frontend always gets:
 * subscription: { planName, amount, status, startDate, endDate, billingCycle, planKey, planPrice }
 */
function extractSubscription(company) {
  // possible sources (kept)
  const sub = company?.subscription || company?.pricing || company?.plan || null;

  // ✅ YOUR REAL DB FIELDS (fallback)
  const planKey =
    company?.planKey ||
    company?.plan_key ||
    sub?.planKey ||
    sub?.plan_key ||
    "";

  const billingCycle =
    company?.billingCycle ||
    company?.billing_cycle ||
    sub?.billingCycle ||
    sub?.billing_cycle ||
    "";

  const planPrice =
    company?.planPrice ??
    company?.plan_price ??
    sub?.planPrice ??
    sub?.plan_price ??
    null;

  const planName =
    sub?.planName ||
    sub?.plan ||
    planKey || // ✅ important
    company?.selectedPlan ||
    company?.planName ||
    company?.plan ||
    "";

  const amount =
    Number(sub?.amount) ||
    Number(planPrice) || // ✅ important
    Number(company?.amount) ||
    Number(company?.planAmount) ||
    Number(company?.pricing?.amount) ||
    0;

  const status =
    sub?.status ||
    company?.planStatus ||
    (planName ? "Active" : "");

  if (!planName) return null;

  return {
    planName: String(planName),
    amount: Number(amount) || 0,
    status: String(status || "Active"),
    billingCycle: billingCycle ? String(billingCycle) : null,
    startDate:
      sub?.startDate ||
      company?.planStartDate ||
      company?.approvedAt ||
      company?.createdAt ||
      null,
    endDate: sub?.endDate || company?.planEndDate || null,

    // raw helpful fields
    planKey: planKey ? String(planKey) : null,
    planPrice: Number(amount) || 0,
  };
}


function extractCompanyName(company) {
  return (
    company.CompanyName ||
    company.company_name ||
    company.businessName ||
    company.business_name ||
    company.organizationName ||
    company.organization_name ||
    company.legalName ||
    company.legal_name ||
    company.tradeName ||
    company.trade_name ||
    company.company || // sometimes stored as string
    null
  );
}

function extractCompanyEmail(company) {
  return (
    company.companyEmail ||
    company.company_email ||
    company.businessEmail ||
    company.business_email ||
    company.email ||
    null
  );
}

/**
 * Return a consistent admin-facing company payload
 */
function shapeCompanyForAdmin(company) {
  const obj = company.toObject();

  return {
    ...obj,

    // ✅ FORCE canonical fields for frontend
    CompanyName: extractCompanyName(obj),
    companyEmail: extractCompanyEmail(obj),

    companyCode: obj.companyCode || obj.code || obj.companyId || null,
    subscription: extractSubscription(obj),
    docs: extractDocs(obj),
  };
}


/* =========================
   ✅ PLANS CATALOG (for frontend UI)
   GET /api/admin/plans
========================= */
const ADMIN_PLANS = [
  {
    key: "STARTER",
    name: "Starter",
    tagline: "Best for small teams",
    monthlyPrice: 999,
    yearlyPrice: 999 * 10, // change if needed
    badges: [
      { label: "Employees", value: "25" },
      { label: "HR Login", value: "1" },
      { label: "Reports", value: "Basic" },
      { label: "Support", value: "Email" },
    ],
    points: ["Up to 25 employees", "1 HR login", "Basic reports", "Email support"],
  },
  {
    key: "PROFESSIONAL",
    name: "Professional",
    tagline: "Growing business",
    monthlyPrice: 9999,
    yearlyPrice: 9999 * 10,
    badges: [
      { label: "Employees", value: "100" },
      { label: "HR Login", value: "3" },
      { label: "Reports", value: "Advanced" },
      { label: "Support", value: "Priority" },
    ],
    points: ["Up to 100 employees", "3 HR login", "Advanced reports", "Priority support"],
  },
  {
    key: "ENTERPRISE",
    name: "Enterprise",
    tagline: "Large organizations",
    monthlyPrice: 19999,
    yearlyPrice: 19999 * 10,
    badges: [
      { label: "Employees", value: "Unlimited" },
      { label: "HR Login", value: "Custom" },
      { label: "Reports", value: "Pro" },
      { label: "Support", value: "Dedicated" },
    ],
    points: ["Unlimited employees", "Custom HR roles", "Admin dashboard", "Dedicated manager"],
  },
];

async function getAdminPlans(req, res) {
  return res.status(200).json({ success: true, data: ADMIN_PLANS });
}

/* =========================
   ✅ UPDATE SUBSCRIPTION (Upgrade / Change Plan)
   PUT /api/admin/company/:companyId/subscription
   body: { planKey, billingCycle, planPrice, startDate?, endDate? }
========================= */
async function updateCompanySubscription(req, res, next) {
  try {
    const { companyId } = req.params;

    const planKey = String(req.body.planKey || "").trim().toUpperCase();
    const billingCycle = String(req.body.billingCycle || "").trim().toUpperCase(); // MONTHLY / YEARLY
    const planPrice = Number(req.body.planPrice || 0);

    const startDate = req.body.startDate || new Date();
    const endDate = req.body.endDate || null;

    if (!planKey) {
      return res.status(400).json({ success: false, message: "planKey is required" });
    }
    if (!["MONTHLY", "YEARLY"].includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        message: "billingCycle must be MONTHLY or YEARLY",
      });
    }
    if (!Number.isFinite(planPrice) || planPrice <= 0) {
      return res.status(400).json({ success: false, message: "planPrice must be a positive number" });
    }

    const doc = await Company.findById(companyId);
    if (!doc) return res.status(404).json({ success: false, message: "Company not found" });

    // ✅ store in your existing db fields (used by extractSubscription)
    doc.planKey = planKey;
    doc.billingCycle = billingCycle;
    doc.planPrice = planPrice;

    // optional fields (if exist in schema, they will be saved; if not, mongoose ignores them unless strict=false)
    doc.planStartDate = startDate;
    doc.planEndDate = endDate;
    doc.planStatus = "Active";

    await doc.save();

    return res.status(200).json({
      success: true,
      message: "Subscription updated",
      data: shapeCompanyForAdmin(doc),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================
   AUTH
========================= */
async function adminLogin(req, res, next) {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const admin = await Admin.findOne({ username }).select(
      "_id username email passwordHash isActive failedLoginAttempts lockUntil lastLoginAt"
    );

    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (typeof admin.isLocked === "function" && admin.isLocked()) {
      return res.status(423).json({
        success: false,
        message: "Account temporarily locked. Try again later.",
      });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);

    if (!ok) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;

      if (admin.failedLoginAttempts >= MAX_ATTEMPTS) {
        admin.lockUntil = lockDate(LOCK_MINUTES);
        admin.failedLoginAttempts = 0;
      }

      await admin.save();
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    admin.failedLoginAttempts = 0;
    admin.lockUntil = null;
    admin.lastLoginAt = new Date();
    await admin.save();

    const accessToken = signAdminAccessToken({
      sub: String(admin._id),
      role: "ADMIN",
      username: admin.username,
    });

    const refreshToken = signAdminRefreshToken({
      sub: String(admin._id),
      role: "ADMIN",
    });

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      accessToken,
      refreshToken,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function adminMe(req, res) {
  return res.status(200).json({
    success: true,
    admin: {
      id: req.admin._id,
      username: req.admin.username,
      email: req.admin.email,
      lastLoginAt: req.admin.lastLoginAt,
    },
  });
}

async function adminLogout(req, res) {
  return res.status(200).json({ success: true, message: "Admin logged out successfully" });
}

/* =========================
   LISTS (by status)
========================= */
async function listPendingCompanies(req, res, next) {
  try {
    const rows = await Company.find({ status: "PENDING" }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: rows.map(shapeCompanyForAdmin) });
  } catch (err) {
    next(err);
  }
}

async function listApprovedCompanies(req, res, next) {
  try {
    const rows = await Company.find({ status: "APPROVED" }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: rows.map(shapeCompanyForAdmin) });
  } catch (err) {
    next(err);
  }
}

async function listRejectedCompanies(req, res, next) {
  try {
    const rows = await Company.find({ status: "REJECTED" }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: rows.map(shapeCompanyForAdmin) });
  } catch (err) {
    next(err);
  }
}

/* =========================
   ACTIONS
========================= */
async function approveCompany(req, res, next) {
  try {
    const { companyId } = req.params;

    const doc = await Company.findById(companyId);
    if (!doc) return res.status(404).json({ success: false, message: "Company not found" });

    const st = normalizeStatus(doc.status);
    if (st !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Company is not pending (current: ${st})`,
      });
    }

    doc.status = "APPROVED";
    doc.reviewedBy = req.admin?._id;
    doc.reviewedAt = new Date();
    doc.approvedAt = new Date();
    doc.rejectionReason = undefined;

    await doc.save();

    return res.status(200).json({
      success: true,
      message: "Company approved",
      data: shapeCompanyForAdmin(doc),
    });
  } catch (err) {
    next(err);
  }
}

async function rejectCompany(req, res, next) {
  try {
    const { companyId } = req.params;
    const reason = String(req.body.reason || "").trim();
    if (!reason) return res.status(400).json({ success: false, message: "Rejection reason is required" });

    const doc = await Company.findById(companyId);
    if (!doc) return res.status(404).json({ success: false, message: "Company not found" });

    const st = normalizeStatus(doc.status);
    if (st !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Company is not pending (current: ${st})`,
      });
    }

    doc.status = "REJECTED";
    doc.reviewedBy = req.admin?._id;
    doc.reviewedAt = new Date();
    doc.rejectedAt = new Date();
    doc.rejectionReason = reason;

    await doc.save();

    return res.status(200).json({
      success: true,
      message: "Company rejected",
      data: shapeCompanyForAdmin(doc),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================
   DETAILS + DOCS + DELETE
========================= */
async function getCompanyById(req, res, next) {
  try {
    const { companyId } = req.params;

    const doc = await Company.findById(companyId);
    if (!doc) return res.status(404).json({ success: false, message: "Company not found" });

    return res.status(200).json({
      success: true,
      data: shapeCompanyForAdmin(doc),
    });
  } catch (err) {
    next(err);
  }
}

async function getCompanyDocuments(req, res, next) {
  try {
    const { companyId } = req.params;

    const doc = await Company.findById(companyId);
    if (!doc) return res.status(404).json({ success: false, message: "Company not found" });

    return res.status(200).json({
      success: true,
      companyId: String(doc._id),
      companyCode: doc.companyCode || doc.code || doc.companyId || null,
      docs: extractDocs(doc),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/company/:companyId/documents/:docKey
 * Returns { url, name }
 */
async function getCompanyDocument(req, res, next) {
  try {
    const { companyId, docKey } = req.params;
    const key = String(docKey || "").toUpperCase();

    if (!DOC_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: "Invalid document key" });
    }

    const doc = await Company.findById(companyId);
    if (!doc) return res.status(404).json({ success: false, message: "Company not found" });

    const docs = extractDocs(doc);
    const file = docs[key];

    if (!file?.url) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    return res.status(200).json({
      success: true,
      key,
      url: file.url,
      name: file.name,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteCompany(req, res, next) {
  try {
    const { companyId } = req.params;

    const doc = await Company.findById(companyId);
    if (!doc) return res.status(404).json({ success: false, message: "Company not found" });

    await Company.deleteOne({ _id: companyId });

    return res.status(200).json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}

/* =========================
   ✅ DASHBOARD OVERVIEW
   GET /api/admin/dashboard/overview
========================= */
async function getAdminDashboardOverview(req, res, next) {
  try {
    const [pendingRows, approvedRows, rejectedRows] = await Promise.all([
      Company.find({ status: "PENDING" }).sort({ createdAt: -1 }),
      Company.find({ status: "APPROVED" }).sort({ createdAt: -1 }),
      Company.find({ status: "REJECTED" }).sort({ createdAt: -1 }),
    ]);

    const pending = pendingRows.map(shapeCompanyForAdmin);
    const approved = approvedRows.map(shapeCompanyForAdmin);
    const rejected = rejectedRows.map(shapeCompanyForAdmin);

    const total = pending.length + approved.length + rejected.length;

    const approvedWithSub = approved.filter((r) => r?.subscription?.planName);
    const totalSubs = approvedWithSub.length;
    const totalPayments = approvedWithSub.reduce(
      (sum, r) => sum + Number(r?.subscription?.amount || 0),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        counts: {
          total,
          pending: pending.length,
          approved: approved.length,
          rejected: rejected.length,
          totalSubs,
          totalPayments,
        },
        rows: { pending, approved, rejected },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  // auth
  adminLogin,
  adminMe,
  adminLogout,

  // lists
  listPendingCompanies,
  listApprovedCompanies,
  listRejectedCompanies,

  // actions
  approveCompany,
  rejectCompany,

  // details + docs + delete
  getCompanyById,
  getCompanyDocuments,
  getCompanyDocument,
  deleteCompany,

  // ✅ dashboard
  getAdminDashboardOverview,

  // ✅ NEW: plans + subscription update
  getAdminPlans,
  updateCompanySubscription,
};
