import mysql from 'mysql2/promise';

async function testConnection() {
    const config = {
        host: 'gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com',
        user: '3pPsAuYREKGMRqa.root',
        password: 'vcLbjGpqMvB8dkOQ',
        database: 'test',
        port: 4000,
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: true
        }
    };

    console.log('Testing connection with config:', { ...config, password: '***' });

    try {
        const connection = await mysql.createConnection(config);
        console.log('✅ Connected successfully!');
        await connection.end();
    } catch (err) {
        console.error('❌ Connection failed:', err);
    }
}

testConnection();
