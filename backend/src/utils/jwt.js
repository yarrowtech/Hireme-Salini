// utils/jwt.js
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

/* =========================
   USER TOKENS (existing)
========================= */
function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

/* =========================
   ADMIN TOKENS (new)
   - Separate secrets
   - Separate expiry
========================= */
function signAdminAccessToken(payload) {
  return jwt.sign(payload, env.ADMIN_JWT_ACCESS_SECRET, {
    expiresIn: env.ADMIN_JWT_ACCESS_EXPIRES_IN,
  });
}

function signAdminRefreshToken(payload) {
  return jwt.sign(payload, env.ADMIN_JWT_REFRESH_SECRET, {
    expiresIn: env.ADMIN_JWT_REFRESH_EXPIRES_IN,
  });
}

function verifyAdminAccessToken(token) {
  return jwt.verify(token, env.ADMIN_JWT_ACCESS_SECRET);
}

function verifyAdminRefreshToken(token) {
  return jwt.verify(token, env.ADMIN_JWT_REFRESH_SECRET);
}

module.exports = {
  // user
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,

  // admin
  signAdminAccessToken,
  signAdminRefreshToken,
  verifyAdminAccessToken,
  verifyAdminRefreshToken,
};
