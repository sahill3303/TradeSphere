import express from 'express';
import { getDailyNews } from '../controllers/news.controller.js';

const router = express.Router();

router.get('/', getDailyNews);

export default router;
