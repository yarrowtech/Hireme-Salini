const router = require("express").Router();
const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/requireRole");
const { ROLES } = require("../config/roles");
const { employeeMe } = require("../controllers/employee.controller");

router.use(auth, requireRole(ROLES.EMPLOYEE));

router.get("/me", employeeMe);

module.exports = router;
