import { io } from 'socket.io-client';

// Determine backend URL based on environment
const backendUrl = import.meta.env.DEV 
  ? 'http://localhost:3001' // Explicitly use localhost in development
  : import.meta.env.VITE_BACKEND_URL;

// Validate backend URL
if (!backendUrl && !import.meta.env.DEV) {
  console.error('VITE_BACKEND_URL environment variable is not set for production');
  // You might want to throw an error in production
}

const socket = io(backendUrl, {
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling']
});

// Event listeners for debugging
if (import.meta.env.DEV) {
  socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected from server:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    
    // Try different transport if websocket fails
    if (error.message.includes('websocket')) {
      socket.io.opts.transports = ['polling', 'websocket'];
    }
  });
}

export default socket;