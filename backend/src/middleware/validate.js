// middleware/validate.js
function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.issues,
      });
    }

    // ✅ useful for admin controllers & clean coding
    req.validated = parsed.data;

    next();
  };
}

module.exports = { validate };
