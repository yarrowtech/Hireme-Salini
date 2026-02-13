// src/validators/auth.validators.js
const { z } = require("zod");

/**
 * ✅ companyCode:
 * - accepts "123" or 123
 * - converts string -> number
 * - must be integer
 * - must be in 100..999 (3 digits)
 */
const companyCodeSchema = z.preprocess(
  (val) => {
    if (typeof val === "string") {
      const v = val.trim();
      if (!v) return undefined;
      return Number(v);
    }
    return val;
  },
  z
    .number({
      required_error: "Company code is required",
      invalid_type_error: "Company code must be a number",
    })
    .min(100, "Company code must be exactly 3 digits (100-999)")
    .max(999, "Company code must be exactly 3 digits (100-999)")
    .refine((n) => Number.isInteger(n), {
      message: "Company code must be an integer",
    })
);

/* =========================================================
   EMPLOYEE / HR LOGIN
   POST /api/auth/login
========================================================= */
const loginSchema = z.object({
  body: z.object({
    username: z.string().trim().min(3, "Username must be at least 3 characters"),
    password: z.string().trim().min(6, "Password must be at least 6 characters"),
    companyCode: companyCodeSchema,
  }),
});

/* =========================================================
   EMPLOYEE / HR REGISTER
   POST /api/auth/register
========================================================= */
const registerSchema = z.object({
  body: z.object({
    username: z.string().trim().min(3, "Username must be at least 3 characters"),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().trim().min(6, "Password must be at least 6 characters"),
    companyCode: companyCodeSchema,

    // ✅ only HR or EMPLOYEE allowed
    role: z.enum(["HR", "EMPLOYEE"]).optional(),
  }),
});

/* =========================================================
   ✅ COMPANY LOGIN (NO OTP)
   POST /api/auth/company/login
========================================================= */
const companyLoginSchema = z.object({
  body: z.object({
    email: z.string().trim().email("Enter a valid company email"),
    companyCode: companyCodeSchema,
  }),
});

module.exports = {
  loginSchema,
  registerSchema,

  // ✅ company auth (NO OTP)
  companyLoginSchema,
};
