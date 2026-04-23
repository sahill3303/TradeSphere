import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

let db;

// Support both single URL connection and individual variables
// This is significantly more robust for cloud deployments like Railway
if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
    const connectionString = process.env.MYSQL_URL || process.env.DATABASE_URL;
    db = mysql.createPool(connectionString);
    console.log('DEBUG: Connecting using database URL');
} else {
    const dbConfig = {
        host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
        user: process.env.DB_USER || process.env.MYSQLUSER,
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
        database: process.env.DB_NAME || process.env.MYSQLDATABASE,
        port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
        // Production cloud databases like Railway often require SSL
        ssl: (process.env.MYSQL_PUBLIC_URL || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1'))
            ? { rejectUnauthorized: false }
            : false
    };

    console.log('DEBUG: Database Configuration:');
    console.log('  - Host:', dbConfig.host);
    console.log('  - User:', dbConfig.user);
    console.log('  - Database:', dbConfig.database);
    console.log('  - SSL:', !!dbConfig.ssl);

    db = mysql.createPool(dbConfig);
}

// Test the connection on startup
db.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        console.error('Check your environment variables (DB_HOST or MYSQL_URL).');
    });

export default db;

