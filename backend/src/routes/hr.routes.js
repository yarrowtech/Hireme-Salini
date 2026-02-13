const router = require("express").Router();
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { ROLES } = require("../config/roles");
const { hrDashboard, addEmployee } = require("../controllers/hr.controller");

router.use(auth, requireRole(ROLES.HR));

router.get("/dashboard", hrDashboard);
router.post("/employees", addEmployee);

module.exports = router;
