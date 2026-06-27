const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  },
});
app.set('io', io);

io.on('connection', (socket) => {
  socket.join('complaints');
});

// Routes
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const profileRoutes = require('./routes/profileRoutes');
const statsRoutes = require('./routes/statsRoutes');
const { seedAdminIfConfigured } = require('./utils/seedAdmin');

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/export', require('./routes/exportRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Samadhaan API is running' });
});

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const publicDir = path.join(__dirname, 'public');
  const indexFile = path.join(publicDir, 'index.html');

  app.use(express.static(publicDir));

  // Catch-all for React Router (must be after API routes)
  app.get('*', (req, res, next) => {
    if (!req.accepts('html')) {
      return next();
    }

    return res.sendFile(indexFile);
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      status: 'OK',
      message: 'Samadhaan backend is live',
      apiHealth: '/api/health',
    });
  });
}

// Error handling middleware (must be last)
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Connect to MongoDB
const connectDB = require('./config/db');
connectDB().then((conn) => {
  if (conn) {
    seedAdminIfConfigured();
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Samadhaan Backend Server running on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
});


