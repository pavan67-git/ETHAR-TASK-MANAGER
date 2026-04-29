# TaskFlow - Team Task Manager

TaskFlow is a full-stack web application designed for teams to create projects, assign tasks, and track progress with role-based access control.

## 🚀 Key Features

*   **Authentication**: Secure Signup/Login with JWT.
*   **Role-Based Access Control**: Admin and Member roles.
*   **Project Management**: Create, view, update, and archive projects.
*   **Kanban Board**: Drag-and-drop task tracking (To Do, In Progress, In Review, Done).
*   **Task Management**: Assign tasks to members, set priorities, due dates, and add comments.
*   **Dashboard**: Overview of tasks, statuses, overdue deadlines, and project progress.
*   **Premium Design**: Modern UI with glassmorphism, responsive layouts, and dynamic charts.

## ⚙️ Tech Stack

*   **Frontend**: Vanilla HTML, CSS, JavaScript (No framework, pure DOM manipulation).
*   **Backend**: Node.js, Express.js.
*   **Database**: MongoDB (Mongoose ORM).
*   **Authentication**: JSON Web Tokens (JWT) & bcryptjs.
*   **Deployment**: Railway

## 🛠️ Local Setup

1.  **Clone the repository**
2.  **Install dependencies**
    ```bash
    npm install
    # or
    cd backend && npm install
    ```
3.  **Environment Variables**
    Create a `.env` file in the `backend/` directory based on `backend/.env.example`:
    ```env
    PORT=5000
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    JWT_EXPIRES_IN=7d
    FRONTEND_URL=http://localhost:5000
    ```
4.  **Run the application**
    ```bash
    npm start
    # or
    cd backend && npm run dev
    ```
5.  Open your browser and navigate to `http://localhost:5000`.

## 🌐 Deployment

This application is configured for seamless deployment on Railway.

1. Connect your GitHub repository to Railway.
2. Add the required environment variables (`MONGODB_URI`, `JWT_SECRET`).
3. Railway will automatically install dependencies and start the app using the root `package.json` and `Procfile`.
