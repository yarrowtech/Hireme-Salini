const mongoose = require("mongoose");

const companyServiceAccessSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },
    companyCode: { type: String, trim: true, default: "" },
    employees: [
      {
        id: { type: String, trim: true, required: true },
        companyCode: { type: String, trim: true, default: "" },
        name: { type: String, trim: true, required: true },
        role: { type: String, trim: true, default: "Employee" },
        department: { type: String, trim: true, default: "General" },
        type: { type: String, enum: ["EMPLOYEE"], default: "EMPLOYEE" },
        email: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        contact: { type: String, trim: true, default: "" },
        status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
        assignedHrId: { type: String, trim: true, default: "" },
        assignedHrName: { type: String, trim: true, default: "" },
        assignedAt: { type: Date, default: null },
      },
    ],
    hrAccounts: [
      {
        id: { type: String, trim: true, required: true },
        companyCode: { type: String, trim: true, default: "" },
        name: { type: String, trim: true, required: true },
        role: { type: String, trim: true, default: "HR" },
        department: { type: String, trim: true, default: "Human Resources" },
        designation: { type: String, trim: true, default: "HR" },
        email: { type: String, trim: true, default: "" },
        phone: { type: String, trim: true, default: "" },
        contact: { type: String, trim: true, default: "" },
        status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
        notes: { type: String, trim: true, default: "" },
        username: { type: String, trim: true, lowercase: true, default: "" },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        hasLogin: { type: Boolean, default: false },
        loginUpdatedAt: { type: Date, default: null },
        passwordUpdatedAt: { type: Date, default: null },
      },
    ],
    subscription: {
      planKey: { type: String, trim: true, default: "STARTER" },
      billing: { type: String, enum: ["MONTHLY", "YEARLY"], default: "MONTHLY" },
      purchasedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date, default: null },
      purchaseCount: { type: Number, default: 1 },
      renewCount: { type: Number, default: 0 },
      history: [
        {
          planKey: { type: String, trim: true, default: "STARTER" },
          billing: { type: String, enum: ["MONTHLY", "YEARLY"], default: "MONTHLY" },
          purchasedAt: { type: Date, default: Date.now },
          expiresAt: { type: Date, default: null },
        },
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanyServiceAccess", companyServiceAccessSchema);
