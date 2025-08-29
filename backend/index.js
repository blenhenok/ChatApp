const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const helmet = require('helmet');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Add Helmet for security headers RIGHT HERE
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now (you might need to configure this later)
  crossOriginEmbedderPolicy: false
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
});

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
];

console.log("Allowed origins:", allowedOrigins);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const connectedUsers = new Map();
console.log("Allowed origins:", allowedOrigins);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.join('general-room');

  console.log('User connected:', socket.id);
  console.log('Request origin:', socket.handshake.headers.origin);

  socket.on('user_joined', (userId) => {
    connectedUsers.set(socket.id, userId);
    socket.userId = userId;
    console.log(`User ${userId} joined with socket ID: ${socket.id}`);
  });

  socket.on('send_message', async (data) => {
    try {
      console.log('Message received:', data);
      
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

      io.to('general-room').emit('receive_message', {
        content: data.content,
        username: username || 'Anonymous',
        timestamp: new Date().toISOString()
      });

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

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    connectedUsers.delete(socket.id);
  });
});

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
