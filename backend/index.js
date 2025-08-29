const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO setup with CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store connected users and their rooms
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join the general room by default
  socket.join('general-room');

  // Handle user joining with their user ID
  socket.on('user_joined', (userId) => {
    connectedUsers.set(socket.id, userId);
    socket.userId = userId;
    console.log(`User ${userId} joined with socket ID: ${socket.id}`);
  });

  // Handle incoming messages
  socket.on('send_message', async (data) => {
    try {
      console.log('Message received:', data);
      
      // Get the sender's username from Supabase if not provided
      let username = data.username;
      if (!username && socket.userId) {
        const { data: userData, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', socket.userId)
          .single();
        
        if (!error && userData) {
          username = userData.username;
        }
      }

      // Broadcast the message to everyone in the general room
      io.to('general-room').emit('receive_message', {
        content: data.content,
        username: username || 'Anonymous',
        timestamp: new Date().toISOString()
      });

      // Optional: Save message to database
      if (socket.userId) {
        await supabase
          .from('messages')
          .insert({
            content: data.content,
            user_id: socket.userId,
            channel_id: 'general-room',
            created_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    connectedUsers.delete(socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});