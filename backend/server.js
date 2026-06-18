require('dotenv').config({ path: '../.env' });

const express = require('express');
const http    = require('http');
const cors    = require('cors');
const path    = require('path');

const connectDB      = require('./db');
const { initSocket } = require('./socket');

const authRoutes        = require('./routes/auth');
const workspaceRoutes   = require('./routes/workspaces');
const projectRoutes     = require('./routes/projects');
const taskRoutes        = require('./routes/tasks');
const commentRoutes     = require('./routes/comments');
const taskRequestRoutes = require('./routes/taskRequests');
const invitationRoutes  = require('./routes/invitations');

const app    = express();
const server = http.createServer(app);

connectDB();
initSocket(server);

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',          authRoutes);
app.use('/api/workspaces',    workspaceRoutes);
app.use('/api/projects',      projectRoutes);
app.use('/api/tasks',         taskRoutes);
app.use('/api/comments',      commentRoutes);
app.use('/api/task-requests', taskRequestRoutes);
app.use('/api/invitations',   invitationRoutes);

app.get('/', (req, res) => res.json({ message: '🚀 TaskFlow API running' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
