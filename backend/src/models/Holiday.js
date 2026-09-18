const mongoose = require("mongoose");

/**
 * Company holiday calendar. A date present here makes every employee's attendance
 * for that day resolve to HOLIDAY (and it counts as a payable day).
 *
 * Collection: `holidays`
 */
const holidaySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    companyCode: { type: String, trim: true, default: "" },
    date: { type: String, trim: true, required: true }, // YYYY-MM-DD
    name: { type: String, trim: true, default: "Holiday" },
    recurring: { type: Boolean, default: false }, // repeats every year on the same MM-DD
  },
  { timestamps: true }
);

holidaySchema.index({ companyId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Holiday", holidaySchema);
