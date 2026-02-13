// src/controllers/company.controller.js
const mongoose = require("mongoose");
const Company = require("../models/Company");

function pickOne(files, key) {
  const arr = files?.[key];
  return Array.isArray(arr) && arr[0] ? arr[0] : null;
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

async function generateCompanyCode() {
  // 3-digit code 100..999
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
    const existing = await Company.findOne({ CIN: cinTrim });
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
        // retry only on duplicate key collisions
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
 * GET /api/company/requests/:id
 */
async function getRequestById(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid requestId" });
    }

    const row = await Company.findById(id).select("-__v").lean();
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

    if (!requestId || !docKey) {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
      });
    }

    const company = await Company.findById(requestId).lean();
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company request not found",
      });
    }

    const doc = company.documents.find(
      (d) => d.key === docKey
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // absolute file path
    const filePath = `${process.cwd()}${doc.path}`;

    res.setHeader("Content-Type", doc.mimeType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${doc.originalName}"`
    );

    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
}


module.exports = { sendRequest, listRequests, getRequestById, getRequestDoc };
