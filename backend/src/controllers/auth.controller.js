// src/controllers/auth.controller.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Company = require("../models/Company");
const { ROLES } = require("../config/roles");

/* =========================
   HELPERS
========================= */
function normalizeUsername(u) {
  return String(u || "").trim().toLowerCase();
}

function normalizeEmail(e) {
  return String(e || "").trim().toLowerCase();
}

function is3DigitCompanyCode(code) {
  return Number.isFinite(code) && code >= 100 && code <= 999;
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

/* =========================
   REGISTER (EMPLOYEE / HR)
========================= */
async function register(req, res) {
  try {
    const { username, email, password, companyCode, role } = req.body;

    const code = Number(companyCode);
    if (!is3DigitCompanyCode(code)) {
      return res.status(400).json({ success: false, message: "Invalid company code" });
    }

    const company = await Company.findOne({ companyCode: code });
    if (!company) {
      return res.status(400).json({
        success: false,
        message: "Invalid company code. Please register company first.",
      });
    }

    if (company.status && company.status !== "APPROVED") {
      return res.status(403).json({
        success: false,
        message: "Company is not approved yet.",
      });
    }

    const u = normalizeUsername(username);
    const e = normalizeEmail(email);

    const exists = await User.findOne({
      companyId: company._id,
      $or: [{ username: u }, { email: e }],
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "User already exists in this company",
      });
    }

    const finalRole = role === ROLES.HR || role === "HR"
      ? ROLES.HR
      : ROLES.EMPLOYEE;

    const user = new User({
      username: u,
      email: e,
      role: finalRole,
      companyId: company._id,
      companyCode: code,
      isActive: true,
    });

    await user.setPassword(password);
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please login.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        companyCode: user.companyCode,
        companyId: user.companyId,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(400).json({
      success: false,
      message: err?.message || "Registration failed",
    });
  }
}

/* =========================
   LOGIN (EMPLOYEE / HR)
========================= */
async function login(req, res) {
  try {
    const { username, password, companyCode } = req.body;
    const code = Number(companyCode);

    if (!is3DigitCompanyCode(code)) {
      return res.status(400).json({ success: false, message: "Invalid company code" });
    }

    const company = await Company.findOne({ companyCode: code });
    if (!company) {
      return res.status(400).json({ success: false, message: "Invalid company code" });
    }

    if (company.status && company.status !== "APPROVED") {
      return res.status(403).json({
        success: false,
        message: "Company is not approved yet.",
      });
    }

    const user = await User.findOne({
      username: normalizeUsername(username),
      companyCode: code,
      companyId: company._id,
    });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      {
        type: "USER",
        userId: user._id.toString(),
        role: user.role,
        companyId: user.companyId.toString(),
        companyCode: user.companyCode,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "7d" }
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        companyCode: user.companyCode,
        companyId: user.companyId,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(400).json({
      success: false,
      message: err?.message || "Login failed",
    });
  }
}

/* =========================
   COMPANY LOGIN (NO OTP)
========================= */
async function companyLogin(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const code = Number(req.body.companyCode);

    if (!email || !isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required",
      });
    }

    if (!is3DigitCompanyCode(code)) {
      return res.status(400).json({
        success: false,
        message: "Company code must be 3 digits",
      });
    }

    const company = await Company.findOne({ companyCode: code });
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    if (company.status && company.status !== "APPROVED") {
      return res.status(403).json({
        success: false,
        message: "Company is not approved yet",
      });
    }

    // DEV MODE: email mismatch allowed
    const companyDbEmail = normalizeEmail(company.Email || company.email || "");
    if (companyDbEmail && companyDbEmail !== email) {
      console.warn("DEV MODE: company email mismatch allowed");
    }

    const token = jwt.sign(
      {
        type: "COMPANY",
        role: ROLES.COMPANY,
        companyId: company._id.toString(),
        companyCode: company.companyCode,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "7d" }
    );

    return res.json({
      success: true,
      message: "Company login successful",
      token,
      user: {
        id: company._id,
        role: ROLES.COMPANY,
        companyId: company._id,
        companyCode: company.companyCode,
        email,
        companyName: company.CompanyName || company.companyName || null,
      },
    });
  } catch (err) {
    console.error("COMPANY LOGIN ERROR:", err);
    return res.status(400).json({
      success: false,
      message: err?.message || "Company login failed",
    });
  }
}

/* =========================
   ME
========================= */
async function me(req, res) {
  const user = await User.findById(req.user?._id).select("-passwordHash -refreshTokenHash");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  return res.json({ success: true, user });
}

async function logout(req, res) {
  return res.json({ success: true, message: "Logged out" });
}

module.exports = {
  register,
  login,
  companyLogin,
  me,
  logout,
};
