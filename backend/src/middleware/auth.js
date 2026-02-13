// src/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");

async function auth(req, res, next) {
  try {
    const header = String(req.headers.authorization || "");
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized: token missing" });
    }

    if (!process.env.JWT_ACCESS_SECRET) {
      return res.status(500).json({ success: false, message: "Server misconfigured: JWT secret missing" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err?.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, message: "Unauthorized: token expired" });
      }
      return res.status(401).json({ success: false, message: "Unauthorized: invalid token" });
    }

    // ✅ COMPANY token
    if (decoded?.type === "COMPANY" && decoded?.companyId) {
      const company = await Company.findById(decoded.companyId).select("-__v");
      if (!company) {
        return res.status(401).json({ success: false, message: "Unauthorized: company not found" });
      }

      if (company.status && company.status !== "APPROVED") {
        return res.status(403).json({ success: false, message: "Company is not approved yet." });
      }

      // Attach both for compatibility
      req.company = company;
      req.user = {
        _id: company._id,
        role: decoded?.role || "COMPANY",
        companyCode: company.companyCode,
        type: "COMPANY",
      };

      req.authType = "COMPANY";
      return next();
    }

    // ✅ USER token (EMPLOYEE/HR)
    if (!decoded?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: invalid token payload" });
    }

    const user = await User.findById(decoded.userId).select("-passwordHash -refreshTokenHash");
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Unauthorized: user not found/inactive" });
    }

    // optional: attach company too (helps in many routes)
    let company = null;
    if (decoded?.companyId) {
      company = await Company.findById(decoded.companyId).select("-__v");
      if (company?.status && company.status !== "APPROVED") {
        return res.status(403).json({ success: false, message: "Company is not approved yet." });
      }
    }

    req.user = user;
    req.company = company || null;
    req.authType = "USER";
    return next();
  } catch (err) {
    console.error("AUTH MIDDLEWARE ERROR:", err);
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

module.exports = { auth };
