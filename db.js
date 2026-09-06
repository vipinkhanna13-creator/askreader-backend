import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. On Replit: Tools -> Database -> PostgreSQL, " +
    "then copy the connection string into Secrets as DATABASE_URL."
  );
}

// Managed Postgres providers (Replit, Neon, Supabase, RDS) generally require
// SSL but present a certificate that Node's default chain doesn't trust —
// rejectUnauthorized:false is the standard workaround for this class of
// managed-Postgres connection, not a general security downgrade.
const useSsl = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
