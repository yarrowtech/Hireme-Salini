// src/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../config/roles");

const userSchema = new mongoose.Schema(
  {
    // frontend doesn't send name, keep optional
    name: { type: String, trim: true, default: "" },

    username: { type: String, trim: true, lowercase: true, required: true },

    email: { type: String, trim: true, lowercase: true, required: true },

    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.EMPLOYEE,
    },

    // user belongs to company
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    // optional redundancy (ok to keep)
    companyCode: { type: Number, required: true, index: true },

    isActive: { type: Boolean, default: true },

    refreshTokenHash: { type: String, default: null },

    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ✅ Unique per company
userSchema.index({ companyId: 1, username: 1 }, { unique: true });
userSchema.index({ companyId: 1, email: 1 }, { unique: true });

userSchema.methods.setPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(password, salt);
};

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model("User", userSchema);
