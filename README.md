# TaskFlow

A full-stack Task Management Web Application built with **Node.js**, **Express**, and **PostgreSQL**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript, Bootstrap 5 |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Deployment | Render |

## Features

- Create, read, update, and delete tasks
- Mark tasks as pending or completed
- Task statistics dashboard
- Search tasks by title
- Filter tasks by status
- Responsive design (mobile + desktop)

## Project Structure

```
taskflow/
├── backend/
│   ├── config/db.js
│   ├── controllers/taskController.js
│   ├── middleware/errorHandler.js
│   ├── routes/taskRoutes.js
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Health check |
| GET | /api/tasks | Get all tasks |
| GET | /api/tasks/:id | Get single task |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| PATCH | /api/tasks/:id/status | Update status |
| DELETE | /api/tasks/:id | Delete task |

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL

### Setup

1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/taskflow.git
cd taskflow/backend
```

2. Install dependencies
```bash
npm install
```

3. Create environment file
```bash
cp .env.example .env
```

4. Update `.env` with your local PostgreSQL credentials

5. Create the database and table
```sql
CREATE DATABASE taskflow_db;
\c taskflow_db

CREATE TABLE IF NOT EXISTS tasks (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'completed')),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

6. Start the server
```bash
npm start
```

7. Open `frontend/index.html` in your browser

## Deployment

Backend is deployed on [Render](https://render.com).

Environment variables required on Render:
- `DATABASE_URL` — Render PostgreSQL Internal Database URL
- `NODE_ENV` — set to `production`
- `PORT` — set automatically by Render

## License

MIT
