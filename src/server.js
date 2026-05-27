import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import db from './config/db.js';
import { runMigrations } from './utils/migrate.js';

const PORT = process.env.PORT || 3000;

runMigrations().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT} (Bound to 0.0.0.0)`);
    });
}).catch(err => {
    console.error('Fatal: Migrations failed. Server not started.', err);
});

