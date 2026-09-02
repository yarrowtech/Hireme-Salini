const mongoose = require("mongoose");

const payrollRowSchema = new mongoose.Schema(
  {
    employeeId: { type: String, trim: true, required: true },
    employeeName: { type: String, trim: true, required: true },
    role: { type: String, trim: true, default: "Employee" },
    month: { type: String, trim: true, default: "Current" },
    baseSalary: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["PENDING", "INITIATED", "SUBMITTED", "CONFIRMED", "FAILED"],
      default: "PENDING",
    },
  },
  { _id: false }
);

const payrollTxnSchema = new mongoose.Schema(
  {
    createdAt: { type: Date, default: Date.now },
    companyName: { type: String, trim: true, default: "Company" },
    month: { type: String, trim: true, default: "Current" },
    method: { type: String, trim: true, default: "BANK_TRANSFER" },
    amount: { type: Number, default: 0 },
    referenceNo: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    proofName: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["SUBMITTED", "CONFIRMED", "FAILED"],
      default: "SUBMITTED",
    },
  },
  { _id: false }
);

const companyPayrollSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },
    rows: { type: [payrollRowSchema], default: [] },
    transactions: { type: [payrollTxnSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanyPayroll", companyPayrollSchema);
