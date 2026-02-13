// src/middleware/uploadCompanyDocs.js
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const uploadDir = path.join(process.cwd(), "uploads", "company-docs");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    const unique = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${safe}`;
    cb(null, unique);
  },
});

function fileFilter(req, file, cb) {
  const ok = file.mimetype === "application/pdf";
  if (!ok) return cb(new Error("Only PDF files are allowed"));
  cb(null, true);
}

const fields = [
  { name: "PAN", maxCount: 1 },
  { name: "ESI", maxCount: 1 },
  { name: "PF", maxCount: 1 },
  { name: "MOA", maxCount: 1 },
  { name: "MSMC", maxCount: 1 }, // optional
  { name: "GST", maxCount: 1 },
  { name: "TradeLicense", maxCount: 1 },
];

const uploadCompanyDocs = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields(fields);

module.exports = { uploadCompanyDocs };
