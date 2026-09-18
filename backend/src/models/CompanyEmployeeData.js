const mongoose = require("mongoose");

/**
 * Single source of truth for company employee master data.
 *
 * Replaces the embedded `CompanyServiceAccess.employees[]` array. Every document
 * always carries BOTH `companyId` and `companyCode` so employees can be looked
 * up directly by either without going through CompanyServiceAccess.
 *
 * Collection: `companyEmployeeData`
 */
const companyEmployeeDataSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    companyCode: { type: String, trim: true, required: true, index: true },
    employeeId: { type: String, trim: true, required: true },

    // Auth linkage only (set when the employee has a portal login).
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Identity & contact
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    contact: { type: String, trim: true, default: "" },
    username: { type: String, trim: true, lowercase: true, default: "" },
    photoUrl: { type: String, trim: true, default: "" },

    // Job
    role: { type: String, trim: true, default: "Employee" },
    department: { type: String, trim: true, default: "General" },
    designation: { type: String, trim: true, default: "" },
    employmentType: { type: String, trim: true, default: "" },
    joiningDate: { type: String, trim: true, default: "" },
    manager: { type: String, trim: true, default: "" },
    supervisorName: { type: String, trim: true, default: "" },
    workLocation: { type: String, trim: true, default: "" },

    // Attendance configuration
    shiftName: { type: String, trim: true, default: "" },
    shiftStart: { type: String, trim: true, default: "" },
    shiftEnd: { type: String, trim: true, default: "" },
    weeklyOff: { type: String, trim: true, default: "" },
    attendanceMode: { type: String, trim: true, default: "" },
    geoTaggingEnabled: { type: Boolean, default: false },
    accessLevel: { type: String, trim: true, default: "" },

    // KYC
    aadhaarNumber: { type: String, trim: true, default: "" },
    aadhaarStatus: { type: String, trim: true, default: "" },
    panNumber: { type: String, trim: true, default: "" },
    panStatus: { type: String, trim: true, default: "" },

    // Personal
    dateOfBirth: { type: String, trim: true, default: "" },
    dob: { type: String, trim: true, default: "" },
    gender: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    emergencyContactName: { type: String, trim: true, default: "" },
    emergencyContactPhone: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },

    // Ops
    type: { type: String, enum: ["EMPLOYEE"], default: "EMPLOYEE" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    assignedHrId: { type: String, trim: true, default: "" },
    assignedHrName: { type: String, trim: true, default: "" },
    assignedAt: { type: Date, default: null },
    hasLogin: { type: Boolean, default: false },
    loginUpdatedAt: { type: Date, default: null },
    passwordUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "companyEmployeeData" }
);

companyEmployeeDataSchema.index({ companyId: 1, employeeId: 1 }, { unique: true });
companyEmployeeDataSchema.index({ companyCode: 1, employeeId: 1 });
companyEmployeeDataSchema.index({ companyId: 1, status: 1 });
companyEmployeeDataSchema.index({ companyId: 1, assignedHrId: 1 });

module.exports = mongoose.model("CompanyEmployeeData", companyEmployeeDataSchema);
