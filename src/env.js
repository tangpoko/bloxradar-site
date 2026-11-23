// Loads .env from the project folder, not the current directory.
// Hostinger cron jobs start somewhere else, so dotenv's default lookup would find nothing.
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url) });

export function requireDbEnv() {
  const missing = ['DB_HOST', 'DB_USER', 'DB_NAME'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing ${missing.join(', ')}. Fill in .env in the project folder.`);
    process.exit(1);
  }
}
