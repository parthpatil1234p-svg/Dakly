require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

const projectRoutes = require('./routes/projectRoutes');
const emailRoutes = require('./routes/emailRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());
app.use(cors());

// Body Parsers (15MB limit to allow base64 PDF/image attachments)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Live HTTP Request Logger (Prints in Render Console for every request)
app.use((req, res, next) => {
  const start = Date.now();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const icon = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
    console.log(`[${new Date().toISOString()}] ${icon} ${req.method} ${req.originalUrl} | Status: ${statusCode} | Time: ${duration}ms | IP: ${clientIp}`);
  });

  next();
});

// Health Check Endpoint (For Render / Vercel / UptimeRobot keep-awake)
app.get('/health', async (req, res) => {
  const mongoose = require('mongoose');
  let dbStatus = 'disconnected';
  if (mongoose.connection.readyState === 1) dbStatus = 'connected';
  else if (mongoose.connection.readyState === 2) dbStatus = 'connecting';

  res.json({
    status: 'healthy',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    service: 'Dakly Transactional Email Engine',
    database: {
      status: dbStatus,
      readyState: mongoose.connection.readyState,
      hasMongoUri: !!process.env.MONGODB_URI,
      hasEncryptionKey: !!process.env.ENCRYPTION_MASTER_KEY,
    },
  });
});

// API Welcome & Quick Info
app.get('/', (req, res) => {
  res.json({
    name: '📮 Dakly API',
    tagline: 'The zero-setup headless transactional email delivery engine for developers.',
    status: 'active',
    version: '1.0.0',
    documentation: {
      healthCheck: 'GET /health',
      createProject: 'POST /api/projects',
      listProjects: 'GET /api/projects',
      sendEmail: 'POST /api/send (Headers: { x-api-key })',
      checkStatus: 'GET /api/status/:trackingId',
      deliveryReports: 'GET /api/reports (Headers: { x-api-key })',
    },
  });
});

// Mount Routes
app.use('/api/projects', projectRoutes);
app.use('/api', emailRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Database connection middleware (ensures DB is connected on Vercel serverless invocations)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB Connection Middleware Error:', err);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

// Connect to MongoDB and Start Server locally (or in Docker/VPS)
if (!process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`\n=================================================`);
      console.log(`🚀 Dakly Email Engine Running on Port ${PORT}`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🩺 Health: http://localhost:${PORT}/health`);
      console.log(`=================================================\n`);
    });
  });
}

// Export for Vercel Serverless
module.exports = app;
