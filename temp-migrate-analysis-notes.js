import db from './src/config/db.js';

async function migrate() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS analysis_notes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                symbol VARCHAR(100) DEFAULT NULL,
                content TEXT,
                saved_price DECIMAL(15,2) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);
        console.log('Successfully created analysis_notes table.');
        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
}

migrate();
