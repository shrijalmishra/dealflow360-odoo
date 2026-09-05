const jwt = require("jsonwebtoken");
const { AppError } = require("./errorHandler");

function getTokenFromHeader(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

// Verifies an internal user (Sales Rep / Manager / Finance / Admin) token.
// Populates req.user = { id, role }.
function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return next(new AppError("Missing or invalid Authorization header", 401));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== "internal") {
      return next(new AppError("This endpoint requires an internal user token", 401));
    }
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(new AppError("Invalid or expired token", 401));
  }
}

// Verifies a customer portal token, kept on a SEPARATE secret from
// internal auth so a leaked/forged customer token can never be replayed
// against internal endpoints (and vice versa). Populates req.customer.
function requireCustomerAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return next(new AppError("Missing or invalid Authorization header", 401));

  try {
    const payload = jwt.verify(token, process.env.CUSTOMER_JWT_SECRET);
    if (payload.type !== "customer") {
      return next(new AppError("This endpoint requires a customer portal token", 401));
    }
    req.customer = { portalUserId: payload.sub, customerId: payload.customerId };
    next();
  } catch (err) {
    next(new AppError("Invalid or expired token", 401));
  }
}

module.exports = { requireAuth, requireCustomerAuth };
