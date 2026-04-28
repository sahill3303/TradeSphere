import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import clientRoutes from './routes/clients.routes.js';
import tradeRoutes from './routes/trades.routes.js';
import notesRoutes from './routes/notes.routes.js';
import botRoutes from './routes/bot.routes.js';
import newsRoutes from './routes/news.routes.js';
import screenerRoutes from './routes/screener.routes.js';
import watchlistRoutes from './routes/watchlist.routes.js';
import db from './config/db.js';

const app = express();

// Security and Performance Middlewares
app.use(helmet()); // Sets various security headers
app.use(compression()); // Compresses responses (gzip)
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiting - Prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 5000 : 100, // Higher limit for development
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', limiter);

// CORS configuration - dynamic for local and production
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL
].filter(Boolean).map(url => url.replace(/\/$/, '')); // Remove trailing slashes

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps/curl)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    } else {
      console.warn(`CORS BLOCKED: ${origin}`);
      return callback(new Error(`CORS Policy: Origin ${origin} not allowed`), false);
    }
  },
  credentials: true
}));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/screener', screenerRoutes);
app.use('/api/watchlist', watchlistRoutes);


// testing route
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 as connected');
    res.json({
      message: 'API working',
      database: 'Connected',
      db_check: rows[0].connected === 1
    });
  } catch (err) {
    res.status(500).json({
      message: 'API working, but Database FAILED',
      error: err.message
    });
  }
});

// Final Error Handler
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

export default app;

// there was a small issue that i have resolved, now it should work, the issue was both the projects i.e. backend and database both were in the different projects, because of which the database was unable to connect due to shared variable not fetching
