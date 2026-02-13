// src/routes/company.routes.js
const router = require("express").Router();

const {
  sendRequest,
  listRequests,
  getRequestById,
  getRequestDoc,
} = require("../controllers/company.controller");

const { validate } = require("../middleware/validate");
const { sendRequestSchema } = require("../validators/company.validators");
const { uploadCompanyDocs } = require("../middleware/uploadCompanyDocs");

// ✅ POST /api/company/request  (multipart/form-data)
router.post(
  "/request",
  uploadCompanyDocs, // multer MUST come before validate (so req.body exists)
  validate(sendRequestSchema),
  sendRequest
);

// ✅ GET /api/company/requests?email=...  OR  ?cin=...
router.get("/requests", listRequests);

// ✅ GET /api/company/requests/:id
router.get("/requests/:id", getRequestById);

// 🔥 Get document (PDF)
router.get(
  "/requests/:requestId/docs/:docKey",
  getRequestDoc
);

module.exports = router;
