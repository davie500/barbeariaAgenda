import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const banco = mysql.createPool({
  host: process.env.BANCO_HOST || 'localhost',
  port: Number(process.env.BANCO_PORTA || 3306),
  user: process.env.BANCO_USUARIO || 'root',
  password: process.env.BANCO_SENHA || '',
  database: process.env.BANCO_NOME || 'barbearia',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  timezone: 'local',
});

export default banco;
