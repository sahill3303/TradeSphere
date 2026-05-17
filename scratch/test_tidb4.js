import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function testConnection() {
    const dbConfig = {
        host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
        user: process.env.DB_USER || process.env.MYSQLUSER,
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
        database: process.env.DB_NAME || process.env.MYSQLDATABASE,
        port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
        ssl: (process.env.MYSQL_PUBLIC_URL || (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1'))
            ? { rejectUnauthorized: false }
            : false
    };

    console.log('DEBUG: Database Configuration:');
    console.log('  - Host:', dbConfig.host);
    console.log('  - User:', dbConfig.user);
    console.log('  - Database:', dbConfig.database);
    console.log('  - Port:', dbConfig.port, typeof dbConfig.port);
    console.log('  - SSL:', !!dbConfig.ssl);

    const db = mysql.createPool(dbConfig);

    try {
        const connection = await db.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        await db.end();
    } catch (err) {
        console.error('❌ Database connection failed:', err);
    }
}

testConnection();
