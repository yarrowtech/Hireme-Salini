const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, unique: true },
    plan: { type: String, trim: true, default: "FREE" },
    status: { type: String, enum: ["ACTIVE", "EXPIRED", "PAUSED"], default: "ACTIVE" },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
