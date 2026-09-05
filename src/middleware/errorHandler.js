// Custom error class so services can throw with an explicit HTTP status
// instead of every controller guessing what status code fits.
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isAppError = true;
  }
}

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.isAppError ? err.statusCode : 500;

  if (!err.isAppError) {
    // Unexpected errors get logged in full; expected AppErrors don't need
    // to spam the console since they represent normal control flow (bad
    // input, missing resource, permission denied, etc).
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      message: err.message || "Internal server error",
      ...(process.env.NODE_ENV === "development" && !err.isAppError
        ? { stack: err.stack }
        : {}),
    },
  });
}

module.exports = { AppError, notFoundHandler, errorHandler };
