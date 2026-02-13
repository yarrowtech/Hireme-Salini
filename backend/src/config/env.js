// src/config/env.js
require("dotenv").config();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 5000),
  MONGODB_URI: process.env.MONGODB_URI,

  // USER JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",

  // ✅ ADMIN JWT (fallback to USER if not provided)
  ADMIN_JWT_ACCESS_SECRET: process.env.ADMIN_JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET,
  ADMIN_JWT_REFRESH_SECRET: process.env.ADMIN_JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET,
  ADMIN_JWT_ACCESS_EXPIRES_IN: process.env.ADMIN_JWT_ACCESS_EXPIRES_IN || "15m",
  ADMIN_JWT_REFRESH_EXPIRES_IN: process.env.ADMIN_JWT_REFRESH_EXPIRES_IN || "7d",

  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  COOKIE_SECURE: String(process.env.COOKIE_SECURE || "false") === "true",
};

if (!env.MONGODB_URI) throw new Error("❌ Missing MONGODB_URI in .env");
if (!env.JWT_ACCESS_SECRET) throw new Error("❌ Missing JWT_ACCESS_SECRET in .env");
if (!env.JWT_REFRESH_SECRET) throw new Error("❌ Missing JWT_REFRESH_SECRET in .env");

// ✅ These will never be missing because of fallback,
// but keep check if you want strict separation:
// if (!process.env.ADMIN_JWT_ACCESS_SECRET) throw new Error("❌ Missing ADMIN_JWT_ACCESS_SECRET in .env");

module.exports = { env };
