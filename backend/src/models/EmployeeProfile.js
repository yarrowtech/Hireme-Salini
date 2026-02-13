const mongoose = require("mongoose");

const employeeProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    employeeId: { type: String, trim: true, required: true },
    department: { type: String, trim: true, default: "General" },
    designation: { type: String, trim: true, default: "Employee" },

    dob: { type: String, trim: true },
    address: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmployeeProfile", employeeProfileSchema);
