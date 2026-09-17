/**
 * Aevumory Backend Server
 *
 * Fastify HTTP server with SQLite persistence.
 * Serves API endpoints and frontend static assets.
 * Uses better-sqlite3 with WAL mode enabled.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import Database from 'better-sqlite3';
import { getAppConfig } from './app.config';
import { runMigrations } from './persistence/migrate';
import { SqliteTemporalRepository } from './persistence/temporal.repository.sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Initialize and configure the database.
 */
const initializeDatabase = (dbPath: string): Database.Database => {
  const db = new Database(dbPath);

  // Enable WAL mode for concurrent read access
  db.pragma('journal_mode = WAL');

  // Set a reasonable timeout for busy locks
  db.pragma('busy_timeout = 5000');

  return db;
};

/**
 * Create and configure the Fastify server.
 */
const createServer = async (db: Database.Database) => {
  const fastify = Fastify({
    logger: true,
  });

  // Create repositories
  const temporalRepository = new SqliteTemporalRepository(db);

  // ============================================================================
  // Health Check Endpoint
  // ============================================================================

  fastify.get('/api/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });

  // ============================================================================
  // Temporal Endpoints (for testing/verification)
  // ============================================================================

  // List all temporal sources
  fastify.get('/api/temporal/sources', async (request, reply) => {
    const rows = db
      .prepare(
        `
      SELECT
        source_id,
        kind,
        name,
        enabled,
        sync_status,
        last_synced_at,
        created_at,
        updated_at
      FROM temporal_sources
      ORDER BY created_at DESC
    `,
      )
      .all() as any[];

    return rows.map((row) => ({
      source_id: row.source_id,
      kind: row.kind,
      name: row.name,
      enabled: row.enabled === 1,
      sync_status: row.sync_status,
      last_synced_at: row.last_synced_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  });

  // List all events
  fastify.get('/api/temporal/events', async (request, reply) => {
    const rows = db
      .prepare(
        `
      SELECT
        event_id,
        source_id,
        title,
        status,
        created_at,
        updated_at
      FROM household_events
      ORDER BY created_at DESC
    `,
      )
      .all() as any[];

    return rows;
  });

  // List all occurrences
  fastify.get('/api/temporal/occurrences', async (request, reply) => {
    const rows = db
      .prepare(
        `
      SELECT
        occurrence_id,
        event_id,
        status,
        created_at,
        updated_at
      FROM event_occurrences
      ORDER BY created_at DESC
    `,
      )
      .all() as any[];

    return rows;
  });

  // ============================================================================
  // Static Asset Serving (Frontend in Production)
  // ============================================================================

  // In production, serve built frontend from dist/ folder
  const frontendPath = path.join(__dirname, '../frontend/dist');
  try {
    await fastify.register(fastifyStatic, {
      root: frontendPath,
      prefix: '/',
    });

    // Fallback to index.html for SPA routing
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        reply.code(404).send({ error: 'Not Found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  } catch (error) {
    // Frontend dist may not exist in development
    console.log('Frontend dist not found; API-only mode');
  }

  return fastify;
};

/**
 * Main entry point.
 */
const main = async () => {
  const config = getAppConfig();

  console.log(`Starting Aevumory Backend`);
  console.log(`PORT: ${config.port}`);
  console.log(`DATA_DIR: ${config.dataDir}`);

  // Ensure data directory exists
  try {
    // Create parent directory if needed
    const fs = await import('fs/promises');
    await fs.mkdir(config.dataDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create data directory:', error);
    process.exit(1);
  }

  // Initialize database
  const dbPath = path.join(config.dataDir, 'aevumory.db');
  console.log(`Database: ${dbPath}`);

  const db = initializeDatabase(dbPath);

  try {
    // Run migrations
    const migrationsDir = path.join(__dirname, '../migrations');
    runMigrations(db, migrationsDir);

    // Create server
    const fastify = await createServer(db);

    // Start listening
    await fastify.listen({ port: config.port, host: '0.0.0.0' });

    console.log(`✓ Server listening on http://0.0.0.0:${config.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    db.close();
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close();
    process.exit(0);
  });
};

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
