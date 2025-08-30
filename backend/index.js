const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with error handling
let supabase;
try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error.message);
  process.exit(1);
}

// Middleware - Order is important!
app.use(cors()); // Enable CORS first

// Security headers with Helmet (configured properly)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Parse JSON bodies
app.use(express.json());

// Custom cache control (complements Helmet)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Add charset to Content-Type for JSON responses
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(body) {
    if (typeof body === 'object' && !res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    originalSend.call(this, body);
  };
  next();
});

// Socket.IO setup
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
];

console.log("Allowed origins:", allowedOrigins);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.some(allowedOrigin => 
        origin === allowedOrigin || 
        origin.includes(allowedOrigin.replace('https://', '').replace('http://', ''))
      )) {
        callback(null, true);
      } else {
        console.log("Blocked by CORS:", origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  console.log('Request origin:', socket.handshake.headers.origin);
  socket.join('general-room');

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    connectedUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });
});

// Test Supabase connection endpoint
app.get('/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ message: 'Supabase connection successful', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});