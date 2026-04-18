# SafeX 4.0 – Smart Helmet Safety System

This is the fully rebuilt SafeX 4.0 stack using React.js, Express.js, MongoDB, and Socket.IO for real-time telemetry.

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, Recharts, Lucide Icons, Socket.IO Client
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), Socket.IO, JWT

## Directory Structure
- `/backend`: Node.js API and Socket.IO server.
- `/frontend`: React.js SPA dashboard.

---

## 1. Local Setup Instructions

### Prerequisites
1. You must have **Node.js** installed.
2. You must have a **MongoDB** database (either installed locally via MongoDB Compass/Community Server, or a free cloud cluster via MongoDB Atlas).

### Backend Setup
1. Open a terminal and navigate to the backend:
   ```bash
   cd v4/backend
   ```
2. Set up your environment variables. Ensure the `.env` file exists with:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/safex4  # Or your MongoDB Atlas URI
   JWT_SECRET=super_secret_safex_key_2026
   ```
3. Start the server:
   ```bash
   node server.js
   ```

### Frontend Setup
1. Open a *second* terminal and navigate to the frontend:
   ```bash
   cd v4/frontend
   ```
2. Start the React development server:
   ```bash
   npm run dev
   ```
3. Open your browser to the local address provided by Vite (usually `http://localhost:5173`).

---

## 2. Deployment

### Backend (Render)
1. Push this code to GitHub.
2. Go to Render.com and create a new **Web Service**.
3. Set Root Directory to `v4/backend`.
4. Build Command: `npm install`
5. Start Command: `node server.js`
6. Add Environment Variables (`MONGODB_URI` and `JWT_SECRET`).

### Frontend (Vercel)
1. Go to Vercel.com and import your GitHub repository.
2. Set the Root Directory to `v4/frontend`.
3. Vercel will automatically detect Vite and run `npm run build`.
4. Deploy!

