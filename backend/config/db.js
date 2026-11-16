// =============================================================
// config/db.js — PostgreSQL Database Connection
// =============================================================
//
// WHAT THIS FILE DOES:
//   Creates a "connection pool" to PostgreSQL using the `pg` package.
//   A pool keeps several database connections open and reuses them,
//   which is much more efficient than opening a new connection for
//   every single HTTP request.
//
// WHY `pg` (node-postgres)?
//   It is the official, battle-tested PostgreSQL client for Node.js.
//   It supports connection pooling, parameterized queries (which prevent
//   SQL injection attacks), and async/await out of the box.
//
// WHY process.env.DATABASE_URL?
//   We never hardcode database credentials in source code. Instead we
//   read them from an environment variable. Locally this comes from
//   your .env file (loaded by dotenv in server.js). On Render it comes
//   from the environment variable you configure in the dashboard.
// =============================================================

const { Pool } = require('pg');

// Create the connection pool.
// When DATABASE_URL is set, pg automatically parses the host, port,
// user, password, and database name from the connection string.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // SSL configuration:
  //   - In production (Render), PostgreSQL requires SSL.
  //   - rejectUnauthorized: false tells pg to accept Render's self-signed
  //     certificate. This is safe for Render's managed database.
  //   - Locally we skip SSL entirely.
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// Test the connection when this module first loads.
// This gives you an early warning in the console if credentials are wrong.
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release(); // Return the test connection back to the pool immediately
  }
});

// Export the pool so any other file can run queries using pool.query(...)
module.exports = pool;

