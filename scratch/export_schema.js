import mysql from 'mysql2/promise';
import fs from 'fs';

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'tradesphere'
};

async function exportSchema() {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database.');

    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);

    let sql = '-- TradeSphere Multi-Tenant Database Schema\n';
    sql += '-- Generated for Railway Production Deployment\n\n';

    for (const table of tableNames) {
        const [[{ 'Create Table': createSql }]] = await connection.query(`SHOW CREATE TABLE \`${table}\``);
        sql += `DROP TABLE IF EXISTS \`${table}\`;\n`;
        sql += createSql + ';\n\n';
    }

    fs.writeFileSync('database_setup.sql', sql);
    console.log('Schema exported to database_setup.sql');
    await connection.end();
}

exportSchema().catch(err => {
    console.error('Export failed:', err);
    process.exit(1);
});
