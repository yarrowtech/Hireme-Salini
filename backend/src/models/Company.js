// src/models/Company.js
const mongoose = require("mongoose");

const docSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // PAN, GST, etc
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true }, // saved file path
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    CompanyName: { type: String, required: true, trim: true },
    Contact: { type: String, required: true, trim: true },
    Email: { type: String, required: true, trim: true, lowercase: true },
    Address: { type: String, required: true, trim: true },
    CIN: { type: String, required: true, trim: true },
    PAN_No: { type: String, required: true, trim: true },

    // ✅ NEW: subscription selection from Step 3
    planKey: {
      type: String,
      enum: ["STARTER", "PROFESSIONAL", "ENTERPRISE"],
      required: true,
      index: true,
    },
    billingCycle: {
      type: String,
      enum: ["MONTHLY", "YEARLY"],
      required: true,
    },

    // ✅ optional snapshot of price at submit-time
    planPrice: { type: Number, default: null },

    // ✅ generated unique 3-digit code
    companyCode: { type: Number, required: true, min: 100, max: 999, index: true },

    documents: { type: [docSchema], default: [] },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },

    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    rejectReason: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

// ✅ Prevent duplicate partner requests for same CIN
companySchema.index({ CIN: 1 }, { unique: true });

module.exports = mongoose.model("Company", companySchema);
