import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const app = express(); // ✅ FIRST create app

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to AJ Consultancy API' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Dashboard routes
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/test', (req, res) => {
  res.json({ message: 'API working' });
});

export default app;
