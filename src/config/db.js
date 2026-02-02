import mysql from 'mysql2/promise';

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '3303',
    database: 'aj_consulting'
});

console.log('Database connected');

export default db;
