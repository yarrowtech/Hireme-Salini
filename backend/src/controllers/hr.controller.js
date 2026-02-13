const { asyncHandler } = require("../utils/asyncHandler");
const { ok, fail } = require("../utils/response");
const User = require("../models/User");
const EmployeeProfile = require("../models/EmployeeProfile");
const Subscription = require("../models/Subscription");
const { ROLES } = require("../config/roles");
const { audit } = require("../utils/audit");

async function ensureActiveSubscription(companyId) {
  const sub = await Subscription.findOne({ companyId });
  return sub && sub.status === "ACTIVE";
}

const hrDashboard = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const [employees] = await Promise.all([
    EmployeeProfile.countDocuments({ companyId })
  ]);
  return ok(res, { employees }, "HR dashboard");
});

const addEmployee = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  if (!companyId) return fail(res, "HR is not linked to any company", 400);

  const subOk = await ensureActiveSubscription(companyId);
  if (!subOk) return fail(res, "Subscription inactive. Activate plan to add employees.", 403);

  const { name, email, password, employeeId, department, designation } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return fail(res, "Email already in use", 409);

  const user = new User({ name, email, role: ROLES.EMPLOYEE, companyId, passwordHash: "temp" });
  await user.setPassword(password);
  await user.save();

  const profile = await EmployeeProfile.create({
    userId: user._id,
    companyId,
    employeeId,
    department,
    designation
  });

  await audit({
    actorUserId: req.user._id,
    companyId,
    action: "HR_ADD_EMPLOYEE",
    meta: { employeeUserId: user._id, employeeId }
  });

  return ok(res, { user, profile }, "Employee created");
});

module.exports = { hrDashboard, addEmployee };
