import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    // Production cloud databases like Railway often require SSL
    ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') 
        ? { rejectUnauthorized: false } 
        : false
};

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
