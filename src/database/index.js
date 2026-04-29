const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Compatibility layer: mimics the sql.js Statement API on top of better-sqlite3
// so that every service file works without any changes.
// ---------------------------------------------------------------------------

class CompatStatement {
  constructor(betterStmt) {
    this._stmt = betterStmt;
    this._params = [];
    this._rows = null;
    this._index = -1;
  }

  /** Sets the bound parameters (array). Resets the cursor. */
  bind(params) {
    this._params = Array.isArray(params) ? params : [];
    this._rows = null;
    this._index = -1;
    return this;
  }

  /**
   * Advances one row.
   * On the first call it executes the query and positions at row 0.
   * Returns true while there are rows, false when exhausted.
   */
  step() {
    if (this._rows === null) {
      this._rows = this._stmt.all(...this._params);
      this._index = 0;
    } else {
      this._index++;
    }
    return this._index < this._rows.length;
  }

  /** Returns the current row as a plain object. */
  getAsObject() {
    if (!this._rows || this._index < 0 || this._index >= this._rows.length) {
      return {};
    }
    return { ...this._rows[this._index] };
  }

  /** Releases the cursor (no-op with better-sqlite3, kept for API compatibility). */
  free() {
    this._rows = null;
    this._index = -1;
  }
}

// ---------------------------------------------------------------------------

class CompatDb {
  constructor(betterDb) {
    this._db = betterDb;
    this._lastChanges = 0;
  }

  /** Returns a CompatStatement for the given SQL. */
  prepare(sql) {
    return new CompatStatement(this._db.prepare(sql));
  }

  /**
   * Executes a write (or DDL/PRAGMA) statement.
   * params is an optional array of bound values.
   */
  run(sql, params = []) {
    const stmt = this._db.prepare(sql);
    const result =
      Array.isArray(params) && params.length > 0 ? stmt.run(...params) : stmt.run();
    this._lastChanges = result ? (result.changes || 0) : 0;
  }

  /** Executes one or more semicolon-separated SQL statements (DDL). */
  exec(sql) {
    this._db.exec(sql);
  }

  /** Returns the number of rows modified by the last run() call. */
  getRowsModified() {
    return this._lastChanges;
  }

  /** Returns the underlying better-sqlite3 Database (use sparingly). */
  get native() {
    return this._db;
  }

  close() {
    try {
      this._db.close();
    } catch (_e) {
      // ignore
    }
  }
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let db = null;      // CompatDb instance (runtime)
let buildDb = null; // CompatDb instance (build scripts only)
let dbPath = null;  // absolute path to the .db file

function getDb() {
  if (buildDb) return buildDb;
  if (!db) throw new Error('Database not initialized');
  return db;
}

function getDbPath() {
  return dbPath;
}

/** Used only by build scripts; getDb() returns this when set. */
function setDbForBuild(database) {
  buildDb = database;
}

function clearBuildDb() {
  buildDb = null;
}

/**
 * Creates a CompatDb at the given file path (for build scripts that run
 * outside of Electron and cannot call initDatabase).
 * @param {string} filePath - absolute path to the .db file to create/open
 * @param {object} [opts]
 * @param {boolean} [opts.wal=false] - enable WAL journal mode
 */
function createBuildDb(filePath, { wal = false } = {}) {
  const Database = require('better-sqlite3');
  const betterDb = new Database(filePath);
  if (wal) betterDb.pragma('journal_mode = WAL');
  betterDb.pragma('foreign_keys = ON');
  return new CompatDb(betterDb);
}

// ---------------------------------------------------------------------------
// no-op — kept so that every existing call site compiles without changes.
// better-sqlite3 writes directly to disk on every db.run(), so there is
// nothing to flush manually.
// ---------------------------------------------------------------------------
function persistDatabase() {
  // intentionally empty
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

async function initDatabase() {
  const { app } = require('electron');
  const { logAuth } = require('../utils/logger');
  const Database = require('better-sqlite3');

  const userData = app.getPath('userData');
  console.log(`[DB] User data path: ${userData}`);
  logAuth('DATABASE INITIALIZATION', {
    userDataPath: userData,
    timestamp: new Date().toISOString(),
  });

  const dataDir = path.join(userData, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  dbPath = path.join(dataDir, 'shawarma_pos.db');
  console.log(`[DB] Database path: ${dbPath}`);

  const dbExists = fs.existsSync(dbPath);
  let runSchemaAfterCreate = false;

  if (!dbExists) {
    // Try to bootstrap from the pre-built template
    const appRoot = app.getAppPath();
    const resPath = process.resourcesPath || appRoot;
    const candidates = [
      path.join(appRoot, 'assets', 'db', 'template.db'),
      path.join(resPath, 'assets', 'db', 'template.db'),
    ];
    const templatePath = candidates.find((p) => fs.existsSync(p));

    if (templatePath) {
      console.log(`[DB] Copying template DB from: ${templatePath}`);
      fs.copyFileSync(templatePath, dbPath);
    } else {
      console.log('[DB] No template found — will run full schema');
      runSchemaAfterCreate = true;
    }
  }

  logAuth('DATABASE PATH VERIFICATION', {
    dbPath,
    exists: fs.existsSync(dbPath),
    sizeBytes: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0,
    timestamp: new Date().toISOString(),
  });

  const betterDb = new Database(dbPath);

  // WAL mode: writers don't block readers; survives crashes better than DELETE journal
  betterDb.pragma('journal_mode = WAL');
  // NORMAL sync: safe with WAL (OS crash-safe, power-loss safe after checkpoint)
  betterDb.pragma('synchronous = NORMAL');
  betterDb.pragma('foreign_keys = ON');

  db = new CompatDb(betterDb);

  if (runSchemaAfterCreate) {
    const { runSchema } = require('./schema');
    runSchema(db);
  } else {
    try {
      const { runMigrations } = require('./migrations');
      runMigrations(db);
    } catch (e) {
      console.error('Migration check failed:', e);
    }

    try {
      const { seedAdminIfNeeded } = require('./schema');
      seedAdminIfNeeded(db);
    } catch (e) {
      console.error('Admin user verification failed:', e);
    }
  }

  // Verify DB is working
  try {
    db.prepare('SELECT 1').step();
    console.log('[DB] ✅ Database connection verified successfully');
  } catch (e) {
    console.error('[DB] ❌ Database connection verification failed:', e);
  }

  return db;
}

async function closeDatabase() {
  if (!db) return;
  // better-sqlite3 already persisted everything; just close cleanly.
  try {
    db.close();
  } catch (e) {
    console.error('Failed to close database:', e);
  }
  db = null;
  dbPath = null;
}

module.exports = {
  getDb,
  getDbPath,
  initDatabase,
  closeDatabase,
  persistDatabase,
  setDbForBuild,
  clearBuildDb,
  createBuildDb,
};
