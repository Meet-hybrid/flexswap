/**
 * Global Express error handler.
 * Must be registered last with app.use(errorHandler).
 */
const errorHandler = (err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}: ${message}`);

  res.status(status).json({
    error:   message,
    path:    req.path,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * Wrap async route handlers to forward errors to errorHandler.
 * Usage: router.get("/route", asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
