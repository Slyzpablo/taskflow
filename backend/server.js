// =============================================================
// server.js — Application Entry Point
// =============================================================
//
// This is the first file Node.js runs. It is responsible for:
//   1. Loading environment variables from .env
//   2. Creating the Express application instance
//   3. Registering global middleware (CORS, JSON parsing)
//   4. Mounting route handlers
//   5. Registering the global error handler
//   6. Starting the HTTP server on the correct port
//
// WHY dotenv?
//   Node.js does not automatically read .env files. The `dotenv` package
//   reads your .env file and loads every key=value pair into process.env
//   so the rest of the app can access them with process.env.KEY_NAME.
//   It MUST be loaded before any other require() that reads process.env.
//
// WHY cors?
//   Browsers enforce the Same-Origin Policy: a web page at one origin
//   (e.g., your GitHub Pages frontend) is blocked from making fetch()
//   calls to a different origin (e.g., your Render backend) unless the
//   server explicitly allows it. The `cors` middleware adds the right
//   HTTP headers to every response so the browser permits the request.
//
// WHY express.json()?
//   By default Express does not parse the body of POST/PUT requests.
//   This middleware reads the raw bytes, parses them as JSON, and puts
//   the result on req.body so your controllers can use it.
//
// WHY process.env.PORT?
//   Locally you want port 5000. On Render, the platform assigns a
//   dynamic port and passes it via the PORT environment variable.
//   If you hardcode 5000, your app will never start on Render.
// =============================================================

// Step 1: Load environment variables BEFORE anything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Import our modular router and middleware
const taskRoutes = require('./routes/taskRoutes');
const errorHandler = require('./middleware/errorHandler');

// Step 2: Create the Express application
const app = express();

// Step 3: Register global middleware
// ---------------------------------------------------------------

// CORS — allow requests from any origin during development.
// In a production hardening step you would restrict this to your
// specific frontend URL, e.g.: cors({ origin: 'https://yourapp.com' })
app.use(cors());

// JSON body parsing — makes req.body available in controllers
app.use(express.json());

// Optional: parse URL-encoded form data (not needed here but good practice)
app.use(express.urlencoded({ extended: true }));

// Step 4: Health check endpoint
// This is the first endpoint you should test after deployment.
// Render (and monitoring tools) can ping it to verify the app is alive.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TaskFlow API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Step 5: Mount the task routes
// All routes defined in taskRoutes.js are prefixed with /api/tasks
app.use('/api/tasks', taskRoutes);

// Step 6: Handle requests to unknown routes (404)
// This runs only if no route above matched the request
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Step 7: Register the global error handler
// IMPORTANT: This must be the LAST middleware registered.
// Express identifies it as an error handler because it has 4 parameters.
app.use(errorHandler);

// Step 8: Start the server
// Use the PORT from environment variables, falling back to 5000 locally
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('==============================================');
  console.log(`🚀 TaskFlow API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log('==============================================');
});

// Export app for potential testing frameworks (e.g., Jest + Supertest)
module.exports = app;

