// =============================================================
// controllers/taskController.js — Business Logic for Tasks
// =============================================================
//
// WHAT IS A CONTROLLER?
//   A controller contains the actual business logic for each API endpoint.
//   It receives the HTTP request, talks to the database, and sends back
//   a response. Separating this from the router keeps each file focused
//   on a single responsibility (Separation of Concerns principle).
//
// HOW DATABASE QUERIES WORK HERE:
//   We use pool.query(sql, [params]) — parameterized queries.
//   The $1, $2 placeholders are NEVER string-concatenated with user input.
//   The `pg` library sends them separately to PostgreSQL, which makes
//   SQL injection attacks impossible.
//
//   Example of UNSAFE code (never do this):
//     pool.query(`SELECT * FROM tasks WHERE id = ${req.params.id}`)
//
//   Example of SAFE code (what we do):
//     pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id])
// =============================================================

const pool = require('../config/db');

// -------------------------------------------------------------
// HELPER: Create a custom error with an HTTP status code
// -------------------------------------------------------------
const createError = (message, statusCode) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// -------------------------------------------------------------
// GET /api/tasks
// Retrieve all tasks, with optional search and status filtering
// -------------------------------------------------------------
const getAllTasks = async (req, res, next) => {
  try {
    // Extract optional query parameters from the URL
    // Example: GET /api/tasks?search=report&status=pending
    const { search, status } = req.query;

    // Start building the SQL query dynamically
    let query = 'SELECT * FROM tasks';
    const params = [];
    const conditions = [];

    // If a search term was provided, filter by title (case-insensitive)
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`title ILIKE $${params.length}`);
    }

    // If a status filter was provided, filter by status
    if (status && ['pending', 'completed'].includes(status.toLowerCase())) {
      params.push(status.toLowerCase());
      conditions.push(`status = $${params.length}`);
    }

    // Append WHERE clause only if there are conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Always return tasks newest-first
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    next(err); // Pass error to the global error handler
  }
};

// -------------------------------------------------------------
// GET /api/tasks/:id
// Retrieve a single task by its ID
// -------------------------------------------------------------
const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate that id is a positive integer before querying
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return next(createError('Task ID must be a positive integer', 400));
    }

    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return next(createError(`Task with ID ${id} not found`, 404));
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// POST /api/tasks
// Create a new task
// -------------------------------------------------------------
const createTask = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    // --- Input Validation ---
    if (!title || title.trim() === '') {
      return next(createError('Task title is required', 400));
    }
    if (title.trim().length > 255) {
      return next(createError('Task title cannot exceed 255 characters', 400));
    }

    // Insert the new task; PostgreSQL sets id, created_at, updated_at automatically
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [title.trim(), description ? description.trim() : null]
    );

    // 201 Created is the correct status code when a new resource is created
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// PUT /api/tasks/:id
// Update a task's title and/or description
// -------------------------------------------------------------
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return next(createError('Task ID must be a positive integer', 400));
    }

    if (!title || title.trim() === '') {
      return next(createError('Task title is required', 400));
    }
    if (title.trim().length > 255) {
      return next(createError('Task title cannot exceed 255 characters', 400));
    }

    // Check the task exists first
    const existing = await pool.query(
      'SELECT id FROM tasks WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return next(createError(`Task with ID ${id} not found`, 404));
    }

    // NOW() updates the updated_at timestamp on every edit
    const result = await pool.query(
      `UPDATE tasks
       SET title = $1, description = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [title.trim(), description ? description.trim() : null, id]
    );

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// PATCH /api/tasks/:id/status
// Toggle a task's status between 'pending' and 'completed'
// -------------------------------------------------------------
const updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return next(createError('Task ID must be a positive integer', 400));
    }

    // Validate that the status value is one of the two allowed values
    if (!status || !['pending', 'completed'].includes(status.toLowerCase())) {
      return next(
        createError('Status must be either "pending" or "completed"', 400)
      );
    }

    const existing = await pool.query(
      'SELECT id FROM tasks WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return next(createError(`Task with ID ${id} not found`, 404));
    }

    const result = await pool.query(
      `UPDATE tasks
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status.toLowerCase(), id]
    );

    res.status(200).json({
      success: true,
      message: `Task marked as ${status}`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// DELETE /api/tasks/:id
// Permanently delete a task
// -------------------------------------------------------------
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return next(createError('Task ID must be a positive integer', 400));
    }

    const existing = await pool.query(
      'SELECT id FROM tasks WHERE id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      return next(createError(`Task with ID ${id} not found`, 404));
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    // 200 with a message is clearer for beginners than 204 No Content
    res.status(200).json({
      success: true,
      message: `Task with ID ${id} deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
};

// Export all controller functions so the router can use them
module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};

