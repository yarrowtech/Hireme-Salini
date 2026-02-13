const mongoose = require("mongoose");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

async function connectDB(uri) {
  try {
    mongoose.set("strictQuery", true);

    mongoose.connection.on("connected", () => console.log("✅ MongoDB connected"));
    mongoose.connection.on("disconnected", () => console.log("⚠️ MongoDB disconnected"));
    mongoose.connection.on("error", (e) => console.log("❌ MongoDB error:", e.message));

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected (mongoose)");
  } catch (e) {
    console.log("❌ Failed to connect to MongoDB:", e.message);
    throw e;
  }
}

module.exports = { connectDB };
