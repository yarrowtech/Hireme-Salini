const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const { env } = require("./config/env");
const { notFound } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const hrRoutes = require("./routes/hr.routes");
const companyRoutes = require("./routes/company.routes");
const employeeRoutes = require("./routes/employee.routes");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 180
  })
);

const path = require("path");
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));


app.get("/health", (req, res) => res.json({ ok: true, service: "HireMe API" }));

/** Base Routes */
app.use("/api/auth", authRoutes);

/** Portal Routes */
app.use("/api/admin", adminRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/employee", employeeRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
