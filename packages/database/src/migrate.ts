import fs from 'node:fs';
import path from 'node:path';
import type pg from 'pg';
import { getPool, transaction } from './index.js';

const MIGRATIONS_TABLE = '_migrations';

async function ensureMigrationsTable(client: pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client: pg.PoolClient): Promise<Set<string>> {
  const result = await client.query(`SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`);
  return new Set(result.rows.map((r: { name: string }) => r.name));
}

function readMigrationFiles(migrationsDir: string): { name: string; sql: string }[] {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => ({
      name,
      sql: fs.readFileSync(path.join(migrationsDir, name), 'utf-8'),
    }));
}

export async function runMigrations(migrationsDir: string): Promise<string[]> {
  const pool = getPool();
  const applied: string[] = [];

  await transaction(pool, async (client) => {
    await ensureMigrationsTable(client);

    const alreadyApplied = await getAppliedMigrations(client);
    const migrations = readMigrationFiles(migrationsDir);

    for (const migration of migrations) {
      if (alreadyApplied.has(migration.name)) {
        continue;
      }

      console.log(`Applying migration: ${migration.name}`);
      await client.query(migration.sql);
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`,
        [migration.name],
      );
      applied.push(migration.name);
    }
  });

  if (applied.length === 0) {
    console.log('No new migrations to apply.');
  } else {
    console.log(`Applied ${String(applied.length)} migration(s).`);
  }

  return applied;
}
