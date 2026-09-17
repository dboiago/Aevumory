/**
 * Database Migration Runner
 *
 * Reads SQL migration files from the migrations directory and applies them
 * in order, tracking which have been applied using a schema_migrations table.
 * Uses better-sqlite3 for direct execution.
 */

import fs from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';

/**
 * Initialize the schema_migrations table if it doesn't exist.
 */
const initializeMigrationsTable = (db: Database.Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
};

/**
 * Get all migration files from a directory, sorted by filename.
 */
const getMigrationFiles = (migrationsDir: string): string[] => {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();
};

/**
 * Get which migrations have already been applied.
 */
const getAppliedMigrations = (db: Database.Database): Set<string> => {
  const rows = db.prepare('SELECT version FROM schema_migrations').all() as Array<{
    version: string;
  }>;
  return new Set(rows.map((row) => row.version));
};

/**
 * Run all pending migrations.
 */
export const runMigrations = (db: Database.Database, migrationsDir: string) => {
  initializeMigrationsTable(db);

  const migrationFiles = getMigrationFiles(migrationsDir);
  const appliedMigrations = getAppliedMigrations(db);

  for (const file of migrationFiles) {
    if (appliedMigrations.has(file)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
        file,
        new Date().toISOString(),
      );
      console.log(`Applied migration: ${file}`);
    } catch (error) {
      console.error(`Failed to apply migration ${file}:`, error);
      throw error;
    }
  }
};
