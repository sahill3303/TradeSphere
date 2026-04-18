import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import clientRoutes from './routes/clients.routes.js';
import tradeRoutes from './routes/trades.routes.js';
import notesRoutes from './routes/notes.routes.js';
import botRoutes from './routes/bot.routes.js';
import newsRoutes from './routes/news.routes.js';
import screenerRoutes from './routes/screener.routes.js';

const app = express(); // ✅ MUST be before app.use

// middleware
app.use(express.json());

// CORS configuration - dynamic for local and production
const allowedOrigins = [
  'http://localhost:5173', // Vite default
  'http://localhost:3000',
  process.env.CLIENT_URL   // Your Vercel URL (will be set in Render)
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS Policy: Access denied'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(morgan('dev'));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/screener', screenerRoutes);

// test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API working' });
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

