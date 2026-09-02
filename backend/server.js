// import dotenv from "dotenv";

// dotenv.config();

// const http = require("http");
// const app = require("./src/app");                 // ✅ correct path
// const { connectDB } = require("./src/config/db"); // ✅ correct path
// const { env } = require("./src/config/env");      // ✅ correct path


// (async () => {
//   try {
//     await connectDB(env.MONGODB_URI);

//     const server = http.createServer(app);
//     server.listen(env.PORT, () => {
//       console.log(`✅ HireMe API running on port ${env.PORT}`);
//     });
//   } catch (error) {
//     console.error("❌ Server startup error:", error);
//     process.exit(1);
//   }
// })();
// server.js (CommonJS)
require("dotenv").config();

const http = require("http");
const app = require("./src/app");
const { connectDB } = require("./src/config/db");
const { env } = require("./src/config/env");
(async () => {
  try {
    // Debug (masked)
    const uri = env.MONGODB_URI;
    console.log("✅ Mongo Host:", uri?.match(/@([^/]+)\//)?.[1] || "MISSING_URI");

    await connectDB(uri);

    const server = http.createServer(app);
    server.listen(env.PORT, () => {
      console.log(`✅ HireMe API running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
})();
