import { neon } from '@neondatabase/serverless';
import { configureNeonForLocalDev } from './configure-neon';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

configureNeonForLocalDev(process.env.DATABASE_URL);

export const sql = neon(process.env.DATABASE_URL);
