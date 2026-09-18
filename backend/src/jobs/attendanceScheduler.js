/**
 * Lightweight in-process nightly job — no external cron dependency.
 *
 * Every hour it checks the clock; once the local time is past 01:00 it runs the
 * auto-absent pass for "yesterday" (marks ABSENT for active employees who have no
 * attendance row on a past working day). Each date is processed at most once per
 * process lifetime. Enable with env `ATTENDANCE_SCHEDULER=on`.
 *
 * For a real deployment you can instead disable this and run
 * `node src/scripts/autoAbsent.js` from the OS scheduler.
 */
const attendanceService = require("../services/attendanceService");

const processed = new Set();
let timer = null;

function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function tick() {
  try {
    const hour = new Date().getHours();
    if (hour < 1) return; // wait until ~01:00 local
    const target = yesterdayKey();
    if (processed.has(target)) return;
    processed.add(target);
    const result = await attendanceService.runAutoAbsentAllCompanies(target);
    console.log(`🗓️  auto-absent ${target}:`, result);
  } catch (err) {
    console.error("auto-absent job failed:", err.message);
  }
}

function start() {
  if (process.env.ATTENDANCE_SCHEDULER !== "on") return;
  if (timer) return;
  console.log("🗓️  attendance scheduler enabled (hourly)");
  timer = setInterval(tick, 60 * 60 * 1000);
  setTimeout(tick, 15 * 1000); // first check shortly after boot
}

module.exports = { start };
