import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import db from './config/db.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (Bound to 0.0.0.0)`);
});
