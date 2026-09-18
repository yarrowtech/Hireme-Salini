/**
 * One-off migration: copy every company's legacy embedded
 * `CompanyServiceAccess.employees[]` into the `companyEmployeeData` collection.
 *
 * Safe to re-run — `migrateCompany` skips companies that already have rows.
 *
 *   node src/scripts/migrateEmployees.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { env } = require("../config/env");
const CompanyServiceAccess = require("../models/CompanyServiceAccess");
const companyEmployees = require("../services/companyEmployees");

(async () => {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected. Migrating employees...");

  const companies = await CompanyServiceAccess.find({}).select("companyId companyCode").lean();
  let total = 0;
  for (const sa of companies) {
    const result = await companyEmployees.migrateCompany(sa.companyId, sa.companyCode);
    if (result.migrated) {
      total += result.migrated;
      console.log(`  ${sa.companyId}: migrated ${result.migrated}`);
    } else if (result.skipped) {
      console.log(`  ${sa.companyId}: already migrated, skipped`);
    }
  }

  console.log(`Done. ${total} employee record(s) migrated across ${companies.length} companies.`);
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
