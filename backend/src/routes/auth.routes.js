// src/routes/auth.routes.js
const router = require("express").Router();

const {
  register,
  login,
  companyLogin, // ✅ simple company login (no OTP)
  me,
  logout,
} = require("../controllers/auth.controller");

const { validate } = require("../middleware/validate");
const {
  loginSchema,
  registerSchema,
  companyLoginSchema,
} = require("../validators/auth.validators");
const { auth } = require("../middleware/auth");

/* =========================
   HEALTH
========================= */
router.get("/ping", (req, res) => res.json({ ok: true }));

/* =========================
   EMPLOYEE / HR
========================= */
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

/* =========================
   COMPANY (NO OTP)
========================= */
router.post("/company/login", validate(companyLoginSchema), companyLogin);

/* =========================
   COMMON
========================= */
router.get("/me", auth, me);
router.post("/logout", auth, logout);

module.exports = router;
