const mongoose = require("mongoose");

const payrollItemSchema = new mongoose.Schema(
  {
    employeeId: { type: String, trim: true, required: true },
    employeeName: { type: String, trim: true, required: true },
    department: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "Employee" },
    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    paidLeave: { type: Number, default: 0 },
    unpaidLeave: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    attendanceDeduction: { type: Number, default: 0 },
    statutoryDeductions: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryStructure", default: null },
    status: {
      type: String,
      enum: ["DRAFT", "CALCULATED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "PAID", "FAILED", "CANCELLED"],
      default: "DRAFT",
    },
    payment: {
      paymentDate: { type: Date, default: null },
      paymentMethod: { type: String, enum: ["BANK_TRANSFER", "UPI", "CASH", "OTHER", ""], default: "" },
      amount: { type: Number, default: 0 },
      referenceNo: { type: String, trim: true, default: "" },
      proofName: { type: String, trim: true, default: "" },
      paidBy: { type: String, trim: true, default: "" },
      confirmationDate: { type: Date, default: null },
      failureReason: { type: String, trim: true, default: "" },
    },
    payslip: {
      generatedAt: { type: Date, default: null },
      payslipNo: { type: String, trim: true, default: "" },
    },
  },
  { _id: true, timestamps: true }
);

const approvalSchema = new mongoose.Schema(
  {
    approvedBy: { type: String, trim: true, default: "" },
    approvedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const payrollRunSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    month: { type: String, trim: true, required: true },
    periodStart: { type: String, trim: true, required: true },
    periodEnd: { type: String, trim: true, required: true },
    attendanceLocked: { type: Boolean, default: false },
    attendanceLockedAt: { type: Date, default: null },
    attendanceLockedBy: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["DRAFT", "CALCULATED", "UNDER_REVIEW", "APPROVED", "PROCESSING", "PAID", "FAILED", "CANCELLED"],
      default: "DRAFT",
    },
    totalGross: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    approvals: { type: [approvalSchema], default: [] },
    items: { type: [payrollItemSchema], default: [] },
    createdBy: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

payrollRunSchema.index({ companyId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("PayrollRun", payrollRunSchema);
