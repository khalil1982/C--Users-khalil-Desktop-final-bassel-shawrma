/**
 * Database Migration System
 * Manages database schema versions and applies migrations incrementally
 */

const fs = require('fs');
const path = require('path');

/**
 * Creates migrations table if it doesn't exist
 *
 * @param {Object} db - sql.js database instance
 */
function createMigrationsTable(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now')),
      description TEXT
    )
  `);
}

/**
 * Gets all applied migrations
 *
 * @param {Object} db - sql.js database instance
 * @returns {Array<string>} Array of applied migration versions
 */
function getAppliedMigrations(db) {
  const stmt = db.prepare('SELECT version FROM migrations ORDER BY version ASC');
  const applied = [];

  while (stmt.step()) {
    const row = stmt.getAsObject();
    applied.push(row.version);
  }

  stmt.free();
  return applied;
}

/**
 * Records a migration as applied
 *
 * @param {Object} db - sql.js database instance
 * @param {Object} migration - Migration object
 */
function recordMigration(db, migration) {
  db.run(
    'INSERT INTO migrations (version, name, description) VALUES (?, ?, ?)',
    [migration.version, migration.name, migration.description || null]
  );
}

/**
 * Runs all pending migrations
 *
 * @param {Object} db - sql.js database instance
 * @returns {Object} Result object with applied migrations count
 */
function runMigrations(db) {
  console.log('🔄 Running database migrations...');

  db.run('PRAGMA foreign_keys = OFF');

  // Create migrations table
  createMigrationsTable(db);

  // Get applied migrations
  const applied = getAppliedMigrations(db);
  console.log(`  ℹ️  Applied migrations: ${applied.length > 0 ? applied.join(', ') : 'none'}`);

  // Load available migrations
  const migrations = loadMigrations();
  console.log(`  ℹ️  Available migrations: ${migrations.length}`);

  // Filter pending migrations
  const pending = migrations.filter(m => !applied.includes(m.version));

  if (pending.length === 0) {
    console.log('  ✅ Database is up to date');
    return { ok: true, applied: 0 };
  }

  console.log(`  🔄 Applying ${pending.length} migration(s)...`);

  // Apply each pending migration
  let appliedCount = 0;
  for (const migration of pending) {
    try {
      console.log(`    ⏳ Applying ${migration.version} - ${migration.name}...`);

      // Execute migration
      migration.up(db);

      // Record migration
      recordMigration(db, migration);

      appliedCount++;
      console.log(`    ✅ ${migration.version} applied successfully`);

    } catch (error) {
      console.error(`    ❌ Error applying migration ${migration.version}:`, error);
      db.run('PRAGMA foreign_keys = ON');
      throw new Error(`Migration failed: ${migration.version} - ${error.message}`);
    }
  }

  console.log(`✅ Migrations completed! Applied ${appliedCount} migration(s)`);

  db.run('PRAGMA foreign_keys = ON');
  return { ok: true, applied: appliedCount };
}

/**
 * Loads all migration files from migrations directory
 *
 * @returns {Array<Object>} Array of migration objects
 */
function loadMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');

  // Create migrations directory if it doesn't exist
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Load migration modules
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  const migrations = files.map(file => {
    const migration = require(path.join(migrationsDir, file));
    return migration;
  });

  return migrations;
}

module.exports = {
  runMigrations,
  getAppliedMigrations
};
