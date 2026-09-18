const router = require("express").Router();
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { ROLES } = require("../config/roles");
const {
  employeeMe,
  getEmployeeDashboard,
  getMyAttendance,
  checkIn,
  checkOut,
  leaveRequest,
} = require("../controllers/employee.controller");

router.use(auth, requireRole(ROLES.EMPLOYEE));

router.get("/me", employeeMe);
router.get("/dashboard", getEmployeeDashboard);
router.get("/attendance", getMyAttendance);
router.post("/attendance/check-in", checkIn);
router.post("/attendance/check-out", checkOut);
router.post("/attendance/leave-request", leaveRequest);

module.exports = router;
