// src/validators/admin.validators.js
const { z } = require("zod");

const adminLoginSchema = z.object({
  body: z.object({
    username: z.string().trim().min(3, "Username is required").max(50),
    password: z.string().min(6, "Password is required").max(200),
  }),
});

module.exports = { adminLoginSchema };
