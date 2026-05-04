import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function migrate() {
    const config = {
        host: 'gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com',
        user: '3pPsAuYREKGMRqa.root',
        password: 'vcLbjGpqMvB8dkOQ',
        database: 'test',
        port: 4000,
        ssl: { rejectUnauthorized: false }
    };

    console.log('Connecting to TiDB Cloud...');
    const connection = await mysql.createConnection(config);
    console.log('Connected!');

    const sqlPath = 'c:/Users/HP/Desktop/AJ Consultancy/database_setup.sql';
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // Remove comments and split by semicolon
    const queries = sql
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--'));

    console.log(`Executing ${queries.length} queries...`);

    for (let query of queries) {
        try {
            await connection.query(query);
            console.log('Success:', query.split('\n')[0].substring(0, 50) + '...');
        } catch (err) {
            console.error('Error in query:', query);
            console.error('Message:', err.message);
        }
    }

    console.log('Migration complete!');
    await connection.end();
}

migrate().catch(console.error);
