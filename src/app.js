import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import clientRoutes from './routes/clients.routes.js';
import tradeRoutes from './routes/trades.routes.js';

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

// test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API working' });
});

export default app;
