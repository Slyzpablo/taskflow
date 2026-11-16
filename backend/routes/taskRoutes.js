// =============================================================
// routes/taskRoutes.js — API Route Definitions
// =============================================================
//
// WHAT IS A ROUTER?
//   An Express Router is a mini-application that handles a subset of
//   routes. Here it handles everything under /api/tasks.
//
// WHY SEPARATE ROUTES FROM CONTROLLERS?
//   Routes define WHAT URL maps to WHAT function.
//   Controllers define HOW to handle that request.
//   Keeping them separate makes both easier to read and test.
//
// HOW THIS CONNECTS TO server.js:
//   server.js does: app.use('/api/tasks', taskRoutes)
//   So every route defined here (e.g., router.get('/')) becomes
//   accessible at /api/tasks (not just /).
// =============================================================

const express = require('express');
const router = express.Router();

const {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} = require('../controllers/taskController');

// GET    /api/tasks            → retrieve all tasks (supports ?search= and ?status=)
router.get('/', getAllTasks);

// GET    /api/tasks/:id        → retrieve a single task
router.get('/:id', getTaskById);

// POST   /api/tasks            → create a new task
router.post('/', createTask);

// PUT    /api/tasks/:id        → update task title/description
router.put('/:id', updateTask);

// PATCH  /api/tasks/:id/status → update task status only
router.patch('/:id/status', updateTaskStatus);

// DELETE /api/tasks/:id        → delete a task
router.delete('/:id', deleteTask);

module.exports = router;

