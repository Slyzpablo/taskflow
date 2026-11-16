// =============================================================
// middleware/errorHandler.js — Global Error Handler
// =============================================================
//
// WHAT THIS FILE DOES:
//   Express has a special type of middleware called an "error handler".
//   Any time a route or controller calls next(error), Express skips
//   all remaining normal middleware and jumps straight here.
//
// WHY USE CENTRALIZED ERROR HANDLING?
//   Without it, you'd need try/catch + res.status(500).json(...)
//   duplicated in every controller. With it, controllers just throw
//   or call next(err) and this one function handles ALL errors
//   consistently — right status codes, right JSON shape, no crashes.
//
// HOW EXPRESS KNOWS THIS IS AN ERROR HANDLER:
//   The function signature must have FOUR parameters: (err, req, res, next).
//   The leading `err` parameter is the signal to Express.
// =============================================================

const errorHandler = (err, req, res, next) => {
  // Log the full error stack in development so you can debug easily.
  // In production we avoid leaking stack traces to clients.
  if (process.env.NODE_ENV === 'development') {
    console.error('💥 Error:', err.stack);
  } else {
    console.error('💥 Error:', err.message);
  }

  // Use the status code attached to the error object if available,
  // otherwise fall back to 500 Internal Server Error.
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // Only include the stack trace in development responses
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;

