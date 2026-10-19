require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const emailRoutes = require('./routes/emailRoutes');

const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// Rate Limiter Middleware to protect against brute-force & denial of service
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes.' },
});
app.use(globalLimiter);

// Security Middleware (Configured CSP to allow trusted frontend assets and APIs)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", '*'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://dakly.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);

// Serve Static Frontend Assets (Logos, SVGs, Badges - index: false ensures no HTML index is served)
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

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

// Database connection middleware (ensures DB is connected on Vercel serverless invocations)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB Connection Middleware Error:', err.message);
    res.status(500).json({ success: false, error: `Database connection error: ${err.message}` });
  }
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

// Official Web Dashboard Redirect
app.get('/dashboard', globalLimiter, (req, res) => {
  res.redirect(process.env.FRONTEND_URL || 'https://dakly.vercel.app');
});

// API Welcome & Microservice Status (Pure JSON API Engine Status)
app.get('/', globalLimiter, (req, res) => {
  res.json({
    service: 'Dakly Transactional Email Engine',
    tagline: 'The zero-setup headless transactional email delivery engine for developers.',
    status: 'ONLINE',
    version: '1.0.0',
    cluster: '100% OPERATIONAL',
    dashboard: process.env.FRONTEND_URL || 'https://dakly.vercel.app',
    documentation: 'https://github.com/parthpatil1234p-svg/Dakly#readme',
    endpoints: {
      health: 'GET /health',
      ping: 'GET /api/ping',
      sendEmail: 'POST /api/send (Headers: { x-api-key })',
      checkStatus: 'GET /api/status/:trackingId',
      deliveryAuditLogs: 'GET /api/logs (Headers: { x-api-key })',
      dashboardStats: 'GET /api/stats (Headers: { x-api-key })',
      deliveryReports: 'GET /api/reports (Headers: { x-api-key })',
      templates: 'GET /api/templates',
      trackingPixel: 'GET /api/tracking/pixel/:trackingId',
      trackingClick: 'GET /api/tracking/click/:trackingId',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
      },
      projects: {
        list: 'GET /api/projects',
        create: 'POST /api/projects',
        get: 'GET /api/projects/:id',
        update: 'PATCH /api/projects/:id',
        rotateApiKey: 'POST /api/projects/:id/rotate-key',
        addSender: 'POST /api/projects/:id/senders',
        testSender: 'POST /api/projects/:id/senders/:senderId/test',
        deleteSender: 'DELETE /api/projects/:id/senders/:senderId',
        webhooks: 'POST /api/projects/:id/webhook',
        ipWhitelist: 'POST /api/projects/:id/security/whitelist',
        inviteMember: 'POST /api/projects/:id/members/invite',
      },
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
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


// Connect to MongoDB and Start Server locally (or in Docker/VPS)
if (!process.env.VERCEL && require.main === module) {
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
