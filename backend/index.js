const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const cors = require('cors');

// Initialize Socket.IO with CORS enabled for your Vercel frontend
const io = new Server(server, {
  cors: {
    origin: "https://chatapp-30fhxla5e-blus-projects-6133c151.vercel.app", // Change this to your Vercel URL later
    methods: ["GET", "POST"]
  }
});

// Basic middleware
app.use(cors());
app.use(express.json());

// Placeholder route to check if server is live
app.get('/', (req, res) => {
  res.send('Chat Server is Running!');
});

// Placeholder for Socket.IO logic (we'll add this next week)
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});