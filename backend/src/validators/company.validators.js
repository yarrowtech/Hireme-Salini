// src/validators/company.validators.js
const { z } = require("zod");

const sendRequestSchema = z.object({
  body: z.object({
    CompanyName: z.string().trim().min(2, "Company name is required"),
    Contact: z.string().trim().min(5, "Contact is required"),
    Email: z.string().trim().email("Valid email is required"),
    Address: z.string().trim().min(5, "Address is required"),
    CIN: z.string().trim().min(3, "CIN is required"),
    PAN_No: z.string().trim().min(3, "PAN number is required"),

    // ✅ NEW
    planKey: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"], {
      required_error: "Plan is required",
    }),
    billingCycle: z.enum(["MONTHLY", "YEARLY"], {
      required_error: "Billing cycle is required",
    }),
  }),
});

module.exports = { sendRequestSchema };
