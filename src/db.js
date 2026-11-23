import './env.js';
import mysql from 'mysql2/promise';

// All times are stored in UTC.
export function getPool(extra = {}) {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: 'Z',
    connectionLimit: 4,
    charset: 'utf8mb4',
    ...extra,
  });
}

// Hostinger closes database connections that sit idle, and the jobs wait minutes on Roblox
// between queries. Pinging every 15 s keeps the one connection (and its lock) alive.
// Call the returned function to stop.
export function keepAlive(conn, ms = 15000) {
  const timer = setInterval(() => conn.query('SELECT 1').catch(() => {}), ms);
  timer.unref();
  return () => clearInterval(timer);
}

// Inserts rows in chunks so one statement never gets too large for shared hosting limits.
export async function insertMany(db, sql, rows, size = 500) {
  for (let i = 0; i < rows.length; i += size) {
    await db.query(sql, [rows.slice(i, i + size)]);
  }
}
