// src/models/CompanyOtp.js
const mongoose = require("mongoose");

const companyOtpSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    companyCode: { type: Number, required: true, index: true },

    // (optional but useful for verification audit)
    email: { type: String, required: true, lowercase: true, trim: true, index: true },

    // ✅ REQUIRED (your previous error)
    otpToken: { type: String, required: true, unique: true, index: true },

    /**
     * ✅ store HASH here (not plain otp)
     * In dev you can still return otp in response for testing.
     */
    otp: { type: String, required: true },

    expiresAt: { type: Date, required: true, index: true },

    isUsed: { type: Boolean, default: false },

    attemptsLeft: { type: Number, default: 5 },
  },
  { timestamps: true }
);

// ✅ Auto delete after expiry
companyOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("CompanyOtp", companyOtpSchema);
