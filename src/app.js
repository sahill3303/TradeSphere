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
import path from 'path';

const app = express(); // ✅ MUST be before app.use

// middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/news', newsRoutes);

// Static files (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API working' });
});

export default app;

