const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const cors = require('cors');

const io = new Server(server, {
  cors: {
    origin: "https://chatapp-30fhxla5e-blus-projects-6133c151.vercel.app", 
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
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
