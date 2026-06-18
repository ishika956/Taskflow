# ⚡ TaskFlow — Multi-Tenant Project Management Tool

A full-stack MERN web application for teams to manage projects using Kanban boards with real-time collaboration — built like a mini Jira/Trello.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [API Reference](#api-reference)
8. [Roles & Permissions](#roles--permissions)
9. [Workflow Guide](#workflow-guide)
10. [Real-Time Events](#real-time-events)
11. [Email Notifications](#email-notifications)
12. [Deployment Guide](#deployment-guide)
13. [Known Limitations](#known-limitations)

---

## Project Overview

TaskFlow lets teams create **Workspaces**, organize work into **Projects**, and manage **Tasks** on a drag-and-drop Kanban board. It supports multi-tenant access with four distinct roles, a task request/approval workflow for members, real-time board updates via Socket.io, and email notifications via Gmail SMTP.

---

## Tech Stack

### Backend
| Package | Purpose |
|---|---|
| Node.js + Express.js | REST API server |
| Mongoose | MongoDB ODM |
| Socket.io | Real-time WebSocket events |
| JSON Web Token (JWT) | Authentication tokens |
| bcryptjs | Password hashing |
| Zod | Request body validation |
| Multer | Local file upload handling |
| Nodemailer | Email via Gmail SMTP |
| dotenv | Environment variable loading |
| cors | Cross-origin request handling |
| nodemon | Dev auto-restart |

### Frontend
| Package | Purpose |
|---|---|
| React 18 + Vite | UI framework + build tool |
| React Router DOM | Client-side routing |
| Axios | HTTP client with interceptors |
| Tailwind CSS v3 | Utility-first styling |
| @dnd-kit/core + sortable | Drag-and-drop Kanban |
| Socket.io-client | Real-time board updates |

### Database
- **MongoDB** (local or MongoDB Atlas)

---

## Features

- **Authentication** — Register, Login, Logout with JWT stored in localStorage. Token auto-attached to every API request. Expires after 7 days.
- **Workspaces** — Create team workspaces, invite members with roles, delete workspace (owner only).
- **Projects** — Create multiple projects inside a workspace with custom accent colors.
- **Kanban Board** — 4 columns: Todo → In Progress → In Review → Done. Drag and drop tasks between columns (Admin/Manager/Owner only).
- **Task Management** — Create tasks with title, description, priority, assignee, deadline, and tags.
- **Task Request Workflow** — Members submit task requests. Admin/Manager approves (creates & assigns task) or rejects with a reason.
- **Task Completion** — Members can mark their own assigned tasks as Done.
- **Task Detail Modal** — Full edit view with description, status, priority, assignee, deadline, tags.
- **Comments** — Post and delete comments on any task.
- **File Attachments** — Upload up to 5 files per task (max 10 MB each). Stored locally in `backend/uploads/`.
- **Real-Time Updates** — Socket.io pushes task create/update/move/delete events to all users on the same board instantly.
- **Email Notifications** — Gmail SMTP sends an email when a task is assigned to someone.
- **Role-Based Access Control** — Four roles with strict backend enforcement on every route.

---

## Project Structure

```
taskflow/
├── .env                          ← All secrets (never commit)
├── .gitignore
├── README.md
│
├── backend/
│   ├── server.js                 ← Entry point, wires everything together
│   ├── db.js                     ← MongoDB connection
│   ├── socket.js                 ← Socket.io init + emitBoardUpdate helper
│   ├── email.js                  ← Nodemailer Gmail SMTP setup
│   │
│   ├── models/
│   │   ├── User.js               ← name, email, password (hashed), avatar
│   │   ├── Workspace.js          ← name, owner, members[{user, role}]
│   │   ├── Project.js            ← name, description, workspace, color
│   │   ├── Task.js               ← title, status, priority, assignee, attachments
│   │   ├── TaskRequest.js        ← member requests awaiting approval
│   │   └── Comment.js            ← task comments
│   │
│   ├── routes/
│   │   ├── auth.js               ← register, login, /me
│   │   ├── workspaces.js         ← CRUD + invite member
│   │   ├── projects.js           ← CRUD
│   │   ├── tasks.js              ← CRUD + move + complete + attachments
│   │   ├── taskRequests.js       ← submit, approve, reject, cancel
│   │   └── comments.js           ← CRUD
│   │
│   ├── middleware/
│   │   ├── auth.js               ← protect: verifies JWT, attaches req.user
│   │   ├── roles.js              ← getUserRole(), requireRole(), requireRoleForTask()
│   │   └── upload.js             ← Multer config (10 MB, allowed types)
│   │
│   └── uploads/                  ← Uploaded files stored here
│
└── frontend/
    ├── index.html
    ├── vite.config.js            ← Dev proxy: /api → localhost:5000
    ├── tailwind.config.js
    │
    └── src/
        ├── main.jsx              ← React root with BrowserRouter
        ├── App.jsx               ← Routes + AuthProvider wrapper
        ├── index.css             ← Tailwind directives + global .input/.btn-primary
        │
        ├── context/
        │   └── AuthContext.jsx   ← Global user state, login/register/logout
        │
        ├── utils/
        │   └── api.js            ← Axios instance, auto-attaches JWT + socketId
        │
        ├── pages/
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx     ← Workspaces sidebar + projects grid
        │   ├── Board.jsx         ← Project board page, socket init
        │   └── Settings.jsx      ← Workspace member list
        │
        └── components/
            ├── Navbar.jsx        ← Top bar with user name + logout
            ├── KanbanBoard.jsx   ← DnD board, task requests panel, modals
            ├── TaskCard.jsx      ← Individual card (role-aware UI)
            └── TaskModal.jsx     ← Task detail: edit, comments, attachments
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- npm v9+
- MongoDB (local) or MongoDB Atlas account

### 1. Clone / Extract the project

```bash
cd taskflow
```

### 2. Set up environment variables

Edit the `.env` file in the root:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/taskflow
JWT_SECRET=your_random_64_char_string
GMAIL_USER=youremail@gmail.com
GMAIL_APP_PASS=xxxx xxxx xxxx xxxx
PORT=5000
CLIENT_URL=http://localhost:5173
```

> See [Environment Variables](#environment-variables) for how to get each value.

### 3. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Run the development servers

Open **two terminals**:

```bash
# Terminal 1 — Backend
cd taskflow/backend
npm run dev
# ✅ Server running on http://localhost:5000
# ✅ MongoDB connected
# ✅ Socket.io initialised
```

```bash
# Terminal 2 — Frontend
cd taskflow/frontend
npm run dev
# ✅ Local: http://localhost:5173
```

### 5. Open the app

Navigate to **http://localhost:5173** in your browser.

---

## Environment Variables

| Variable | Description | How to get it |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | [MongoDB Atlas](https://cloud.mongodb.com) → Connect → Drivers → copy URI |
| `JWT_SECRET` | Secret key for signing tokens | Any random 64-char string. Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `GMAIL_USER` | Gmail address to send emails from | Your Gmail address |
| `GMAIL_APP_PASS` | Gmail App Password (not your real password) | Google Account → Security → 2-Step Verification → App Passwords → Create |
| `PORT` | Backend server port | Default: `5000` |
| `CLIENT_URL` | Frontend URL for CORS | Default: `http://localhost:5173` |

> ⚠️ **Never commit `.env` to Git.** It is already listed in `.gitignore`.

---

## API Reference

All protected routes require the header:
```
Authorization: Bearer <jwt_token>
```

### Auth
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Get current user |

### Workspaces
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workspaces` | ✅ | Get all workspaces for current user |
| POST | `/api/workspaces` | ✅ | Create a workspace |
| PUT | `/api/workspaces/:id` | ✅ Owner | Update workspace name/description |
| DELETE | `/api/workspaces/:id` | ✅ Owner | Delete workspace |
| POST | `/api/workspaces/:id/invite` | ✅ Owner | Invite user by email with role |

### Projects
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/projects/:workspaceId` | ✅ Member+ | Get all projects in workspace |
| POST | `/api/projects` | ✅ Admin+ | Create project |
| PUT | `/api/projects/:id` | ✅ Admin+ | Update project |
| DELETE | `/api/projects/:id` | ✅ Admin+ | Delete project |

### Tasks
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/tasks/:projectId` | ✅ Member+ | Get all tasks for a project |
| POST | `/api/tasks` | ✅ Admin+ | Create task directly |
| PUT | `/api/tasks/:id` | ✅ Admin+ | Full task update |
| PATCH | `/api/tasks/:id/move` | ✅ Admin+ | Move task to another column |
| PATCH | `/api/tasks/:id/complete` | ✅ Assigned member | Mark task as Done |
| DELETE | `/api/tasks/:id` | ✅ Admin+ | Delete task |
| POST | `/api/tasks/:id/attachments` | ✅ Member+ | Upload files (multipart/form-data) |

### Task Requests
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/task-requests/:projectId?workspaceId=` | ✅ | Members: own requests. Admin+: all |
| POST | `/api/task-requests` | ✅ Member only | Submit a task request |
| PATCH | `/api/task-requests/:id/approve` | ✅ Admin+ | Approve → creates & assigns task |
| PATCH | `/api/task-requests/:id/reject` | ✅ Admin+ | Reject with optional reason |
| DELETE | `/api/task-requests/:id` | ✅ Member (own) | Cancel a pending request |

### Comments
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/comments/:taskId` | ✅ Member+ | Get all comments for a task |
| POST | `/api/comments` | ✅ Member+ | Post a comment |
| DELETE | `/api/comments/:id` | ✅ Author only | Delete own comment |

---

## Roles & Permissions

TaskFlow has **4 roles**. The first 3 are assigned when inviting someone. Owner is automatic.

### How roles are assigned

| Role | How you get it |
|---|---|
| **Owner** | Automatically — you created the workspace. Cannot be reassigned. |
| **Admin** | Assigned by Owner at invite time |
| **Manager** | Assigned by Owner at invite time |
| **Member** | Assigned by Owner at invite time (default) |

---

### Permission Matrix

| Action | Owner | Admin | Manager | Member |
|---|:---:|:---:|:---:|:---:|
| **Workspace** |||||
| Create workspace | ✅ | ✅ | ✅ | ✅ |
| Edit workspace name/description | ✅ | ❌ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ | ❌ |
| Invite members | ✅ | ❌ | ❌ | ❌ |
| Assign roles (Admin/Manager/Member) | ✅ | ❌ | ❌ | ❌ |
| **Projects** |||||
| View all projects | ✅ | ✅ | ✅ | ✅ |
| Create project | ✅ | ✅ | ✅ | ❌ |
| Edit project | ✅ | ✅ | ✅ | ❌ |
| Delete project | ✅ | ✅ | ✅ | ❌ |
| **Tasks** |||||
| View all tasks on board | ✅ | ✅ | ✅ | ✅ |
| Create task directly | ✅ | ✅ | ✅ | ❌ |
| Assign task to any member | ✅ | ✅ | ✅ | ❌ |
| Edit any task (title, priority, etc.) | ✅ | ✅ | ✅ | ❌ |
| Drag task to any column | ✅ | ✅ | ✅ | ❌ |
| Delete any task | ✅ | ✅ | ✅ | ❌ |
| Mark assigned task as Done | ✅ | ✅ | ✅ | ✅ (own only) |
| Upload files to any task | ✅ | ✅ | ✅ | ✅ (own only) |
| **Task Requests** |||||
| Submit a task request | ❌ | ❌ | ❌ | ✅ |
| View all requests | ✅ | ✅ | ✅ | ❌ |
| View own requests | ✅ | ✅ | ✅ | ✅ |
| Approve request (creates task) | ✅ | ✅ | ✅ | ❌ |
| Reject request with reason | ✅ | ✅ | ✅ | ❌ |
| Cancel own pending request | ✅ | ✅ | ✅ | ✅ (own only) |
| **Comments** |||||
| Post comment | ✅ | ✅ | ✅ | ✅ |
| Delete own comment | ✅ | ✅ | ✅ | ✅ |
| Delete others' comments | ✅ | ✅ | ❌ | ❌ |

---

### Role Descriptions

#### 👑 Owner
The person who created the workspace. Has complete control over everything. The only one who can delete the workspace or invite/remove members. There is exactly one Owner per workspace and ownership cannot be transferred.

#### 🔴 Admin
Trusted team lead with near-full access. Can manage all projects and tasks, but cannot delete the workspace or change member roles. Ideal for team leads who need full task authority.

#### 🟡 Manager
Project-focused role. Can create and manage projects and tasks, approve or reject member task requests, and assign work. Cannot touch workspace-level settings or member management.

#### 🟢 Member
Standard team member. Read-only access to the board. To get work assigned, they submit a **Task Request** which a Manager or Admin reviews. Once approved, the task is automatically created and assigned to them. They can then mark it as Done when complete. They can upload files and comment on their own tasks.

---

## Workflow Guide

### For Owners — Setting up a workspace

```
1. Register / Login
2. Dashboard → Click "+" in sidebar → Create Workspace
3. Click "👤 Invite Member" → Enter email + choose role → Send Invite
   (The invitee must already have a TaskFlow account)
4. Click "+ New Project" → Name it, pick a color
5. Click the project card → Opens the Kanban board
6. Click "+ Add Task" → Fill in details → Create
```

### For Members — Getting work done

```
1. Login → Go to Dashboard → Click your project
2. See the board (read-only view)
3. Click "✋ Request a Task" → Describe what you want to work on → Submit
4. Wait for Admin/Manager to approve
5. Once approved: task appears on the board assigned to you
   + you receive an email notification
6. Find your task card (highlighted with blue border)
7. Click "✓ Mark as Done" when finished → task moves to Done column
```

### For Admins/Managers — Managing requests

```
1. Open the board
2. See red badge on "📋 Task Requests" button (shows pending count)
3. Click it → review pending requests
4. Click "✓ Approve" → task is created and assigned automatically
   OR
   Click "✗ Reject" → enter a reason → member sees the rejection reason
```

---

## Real-Time Events

TaskFlow uses Socket.io for live board updates. When any user makes a change, all other users on the same board see it instantly without refreshing.

### How it works

1. When a user opens a board, their browser connects to Socket.io and joins a room named `board:<projectId>`
2. The user's `socketId` is sent as an `x-socket-id` header on every API request
3. When the backend processes an action, it emits the event to everyone in the room **except the sender** (to prevent duplicates)
4. Other users' browsers receive the event and update their board state

### Socket Events

| Event | Triggered when | Payload |
|---|---|---|
| `task:created` | A new task is created | Full task object |
| `task:updated` | A task is edited | Updated task object |
| `task:moved` | A task changes column | Updated task object |
| `task:deleted` | A task is deleted | `{ _id, project }` |
| `request:created` | A member submits a request | Full request object |
| `request:updated` | A request is approved/rejected | Updated request object |

---

## Email Notifications

Powered by Nodemailer + Gmail SMTP. An email is sent automatically when:

- A task is assigned to someone (by Admin/Manager creating a task)
- A task request is approved (member gets notified their request was approved and task assigned)

### Email setup

1. Enable 2-Step Verification on your Google Account
2. Go to **Google Account → Security → 2-Step Verification → App Passwords**
3. Create an App Password for "Mail"
4. Copy the 16-character password into `GMAIL_APP_PASS` in `.env`

> ⚠️ Use your **App Password**, not your real Gmail password. App passwords are 16 characters with spaces (e.g. `pcjp tfil cazs qvez`).

---

## Deployment Guide

### Deploy Backend to Render

1. Push your code to GitHub (make sure `.env` is in `.gitignore`)
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
5. Add Environment Variables (same as your `.env` but with production values):
   - `MONGODB_URI` → your Atlas URI
   - `JWT_SECRET` → your secret
   - `GMAIL_USER` → your Gmail
   - `GMAIL_APP_PASS` → your app password
   - `CLIENT_URL` → your Vercel frontend URL (e.g. `https://taskflow.vercel.app`)
   - `PORT` → `5000`
6. Deploy → copy the Render URL (e.g. `https://taskflow-api.onrender.com`)

### Deploy Frontend to Vercel

1. Update `frontend/src/utils/api.js` — change `baseURL` to your Render URL:
   ```js
   const api = axios.create({
     baseURL: 'https://taskflow-api.onrender.com/api',
   });
   ```
2. Update `frontend/src/pages/Board.jsx` — change socket URL:
   ```js
   const s = io('https://taskflow-api.onrender.com');
   ```
3. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
4. Settings:
   - **Root directory:** `frontend`
   - **Framework:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
5. Deploy → your app is live

### MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free cluster
3. Database Access → Add user with password
4. Network Access → Add IP `0.0.0.0/0` (allow all, for Render)
5. Connect → Drivers → copy URI → replace `<password>` with your DB user password
6. Add database name before `?`: `.../taskflow?appName=...`

---

## Known Limitations

- **File storage is local** — uploaded files are saved to `backend/uploads/` on the server. On Render's free tier, the filesystem resets on each deploy. For production, integrate AWS S3 or Cloudinary.
- **No ownership transfer** — the workspace Owner role cannot be reassigned to another user.
- **No workspace member removal** — once invited, members cannot currently be removed via the UI (backend support can be added).
- **No pagination** — all tasks and comments load at once. For large projects, add pagination or infinite scroll.
- **Single file server** — Socket.io and Express run on the same process. For high traffic, separate them and use Redis adapter for Socket.io.
- **Email is fire-and-forget** — email failures are silently ignored so they don't break the API response. Check Gmail quotas if emails stop sending.
- **JWT is not revocable** — logging out only clears localStorage. The token remains valid until it expires (7 days). For security-critical apps, implement a token blacklist.

---

## Built With

This project was built as a complete MERN stack application demonstrating:
- Multi-tenant architecture with role-based access control
- Real-time collaboration with Socket.io
- JWT authentication with protected routes
- File uploads with Multer
- Email notifications with Nodemailer
- Drag-and-drop UI with @dnd-kit
- Responsive design with Tailwind CSS

---

*TaskFlow — Built with ⚡ by the MERN stack*
