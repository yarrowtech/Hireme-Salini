const mongoose = require("mongoose");

const salaryStructureSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    employeeId: { type: String, trim: true, required: true, index: true },
    employeeName: { type: String, trim: true, default: "" },
    effectiveFrom: { type: String, trim: true, required: true },
    effectiveTo: { type: String, trim: true, default: "" },
    currency: { type: String, trim: true, default: "INR" },
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    overtimeRatePerHour: { type: Number, default: 0 },
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    incomeTax: { type: Number, default: 0 },
    insurance: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    createdBy: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

salaryStructureSchema.index({ companyId: 1, employeeId: 1, effectiveFrom: -1 });

module.exports = mongoose.model("SalaryStructure", salaryStructureSchema);
