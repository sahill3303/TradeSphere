import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQLUSER,
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
    database: process.env.DB_NAME || process.env.MYSQLDATABASE,
    port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    // Production cloud databases like Railway often require SSL
    ssl: (process.env.MYSQLHOST || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1'))
        ? { rejectUnauthorized: false }
        : false
};
console.log('DEBUG: Database Configuration:');
console.log('  - Host:', dbConfig.host);
console.log('  - User:', dbConfig.user);
console.log('  - Database:', dbConfig.database);
console.log('  - Port:', dbConfig.port);
console.log('  - SSL:', !!dbConfig.ssl);


const db = mysql.createPool(dbConfig);

// Test the connection on startup
db.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully to', process.env.DB_HOST);
        connection.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        console.error('Check your DB_HOST, DB_USER, and DB_PASSWORD variables.');
    });

export default db;
