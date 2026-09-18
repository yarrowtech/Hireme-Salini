/**
 * Mark ABSENT for active employees with no attendance row on a past working day.
 * Safe to re-run (idempotent). Skips weekly-offs, holidays and payroll-locked months.
 *
 *   node src/scripts/autoAbsent.js                 # yesterday
 *   node src/scripts/autoAbsent.js --date=2026-09-05
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { env } = require("../config/env");
const attendanceService = require("../services/attendanceService");

function targetDate() {
  const arg = process.argv.find((a) => a.startsWith("--date="));
  if (arg) return arg.split("=")[1];
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

(async () => {
  const date = targetDate();
  await mongoose.connect(env.MONGODB_URI);
  console.log(`Connected. Running auto-absent for ${date}...`);
  const result = await attendanceService.runAutoAbsentAllCompanies(date);
  console.log("Done:", result);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error("auto-absent failed:", err);
  process.exit(1);
});
