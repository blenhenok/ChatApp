if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_ANON_KEY:', supabaseKey ? 'Exists' : 'Missing');
  // Don't exit in production - let it run but log the error
} else {
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized successfully');
}

app.get('/test-supabase', async (req, res) => {
  try {
    console.log('Testing Supabase connection...');
        const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase test error:', error);
      return res.status(500).json({ 
        error: 'Supabase connection failed',
        details: error.message 
      });
    }
    
    console.log('Supabase test successful:', data);
    res.json({ 
      message: 'Supabase connection successful',
      data: data 
    });
  } catch (err) {
    console.error('Unexpected error in test endpoint:', err);
    res.status(500).json({ 
      error: 'Unexpected error',
      details: err.message 
    });
  }
});


const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Chat Server is Running!');
});

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.join('general-room');

  socket.on('send_message', (data) => {
    io.to('general-room').emit('receive_message', data);
    console.log('Message received:', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
