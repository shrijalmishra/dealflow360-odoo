const { AppError } = require("./errorHandler");

// Usage: router.post('/discount-tiers', requireAuth, requireRole('ADMIN', 'SALES_MANAGER'), handler)
//
// This is deliberately a separate middleware from requireAuth: requireAuth
// answers "who is this", requireRole answers "are they allowed to do this
// specific thing". The PS is explicit that permission checks must live in
// the backend, not just be hidden in the frontend UI - this is that
// enforcement point.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required before role check", 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Role '${req.user.role}' is not permitted to perform this action`,
          403
        )
      );
    }
    next();
  };
}

module.exports = { requireRole };
