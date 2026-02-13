// src/middleware/adminAuth.js
const { verifyAdminAccessToken } = require("../utils/jwt");
const Admin = require("../models/Admin");

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  const [type, token] = h.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

const adminOnly = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }

    // ✅ verify using ADMIN secret
    const decoded = verifyAdminAccessToken(token);

    // ✅ if you set role in token (recommended)
    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const admin = await Admin.findById(decoded.sub).select("_id username email isActive");
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: "Admin not found or inactive" });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid/expired token" });
  }
};

module.exports = { adminOnly };
