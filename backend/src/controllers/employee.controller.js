const { asyncHandler } = require("../utils/asyncHandler");
const { ok } = require("../utils/response");
const EmployeeProfile = require("../models/EmployeeProfile");

const employeeMe = asyncHandler(async (req, res) => {
  const profile = await EmployeeProfile.findOne({ userId: req.user._id }).populate("companyId", "name code");
  return ok(res, { user: req.user, profile }, "Employee profile");
});

module.exports = { employeeMe };
