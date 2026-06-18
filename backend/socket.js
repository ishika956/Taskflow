let io;

const initSocket = (httpServer) => {
  const { Server } = require('socket.io');
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    socket.on('join-board', (projectId) => {
      socket.join(`board:${projectId}`);
    });
    socket.on('leave-board', (projectId) => {
      socket.leave(`board:${projectId}`);
    });
  });

  console.log('✅ Socket.io initialised');
  return io;
};

// emitBoardUpdate:
// - If senderSocketId is provided, broadcast to everyone EXCEPT the sender
//   (sender already updated their own state directly after the API call)
// - If no senderSocketId, broadcast to everyone (e.g. system events)
const emitBoardUpdate = (projectId, event, data, senderSocketId = null) => {
  if (!io) return;
  if (senderSocketId) {
    // broadcast to room EXCLUDING the sender — prevents duplicates
    const senderSocket = io.sockets.sockets.get(senderSocketId);
    if (senderSocket) {
      senderSocket.to(`board:${projectId}`).emit(event, data);
    } else {
      // sender disconnected already, emit to everyone
      io.to(`board:${projectId}`).emit(event, data);
    }
  } else {
    io.to(`board:${projectId}`).emit(event, data);
  }
};

module.exports = { initSocket, emitBoardUpdate };
