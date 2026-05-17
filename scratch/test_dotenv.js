import dotenv from 'dotenv';
const parsed = dotenv.config();
console.log('Parsed env from file:', parsed.parsed.DB_HOST);
console.log('process.env.DB_HOST:', process.env.DB_HOST);
