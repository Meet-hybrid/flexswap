const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/constants");

/**
 * Protect routes — verifies Bearer JWT token.
 * Attaches decoded user payload to req.user.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ error: "Authorization token required" });

  const token = authHeader.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
    return res.status(401).json({ error: message });
  }
};

/**
 * Optional auth — attaches user if token present, continues regardless.
 */
const optionalAuth = (req, _res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
};

module.exports = { authMiddleware, optionalAuth };
