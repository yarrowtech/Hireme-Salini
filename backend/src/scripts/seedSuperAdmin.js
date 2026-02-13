// src/seedAdmin.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin");

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI in .env");

  const username = (process.env.SEED_ADMIN_USERNAME || "admin").toLowerCase().trim();
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@hireme.com").toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123456";

  await mongoose.connect(MONGODB_URI);

  const exists = await Admin.findOne({ $or: [{ username }, { email }] });
  if (exists) {
    console.log("✅ Admin already exists:", exists.username, exists.email);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const created = await Admin.create({
    username,
    email,
    passwordHash,
    isActive: true,
  });

  console.log("✅ Admin seeded:");
  console.log({
    id: created._id.toString(),
    username,
    email,
    password: password, // show only in console (do not commit real password)
  });

  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error("❌ seedAdmin failed:", e);
  process.exit(1);
});
