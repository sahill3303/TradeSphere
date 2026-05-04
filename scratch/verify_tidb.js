import mysql from 'mysql2/promise';

async function verify() {
    const config = {
        host: 'gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com',
        user: '3pPsAuYREKGMRqa.root',
        password: 'vcLbjGpqMvB8dkOQ',
        database: 'test',
        port: 4000,
        ssl: { rejectUnauthorized: false }
    };

    const connection = await mysql.createConnection(config);
    const [rows] = await connection.query('SHOW TABLES');
    console.log('Tables in TiDB:', rows.map(r => Object.values(r)[0]));
    await connection.end();
}

verify().catch(console.error);
