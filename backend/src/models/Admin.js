// src/models/Admin.js
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },

    passwordHash: { type: String, required: true },

    // hard protection
    isActive: { type: Boolean, default: true, index: true },

    // brute protection
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

adminSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil.getTime() > Date.now();
};

module.exports = mongoose.model("Admin", adminSchema);
