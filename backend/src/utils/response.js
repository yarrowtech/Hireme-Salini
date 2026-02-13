function ok(res, data, message = "OK") {
  return res.json({ success: true, message, data });
}
function fail(res, message = "Failed", status = 400, data = null) {
  return res.status(status).json({ success: false, message, data });
}
module.exports = { ok, fail };
