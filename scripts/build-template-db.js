/**
 * Build Template DB for clean / EXE packaging.
 * Creates a DB with schema + migrations + menu + expense_categories (purchase categories),
 * then removes ALL transactional and personal data.
 * Output: assets/db/template.db
 *
 * Run before packaging: npm run build:template-db
 * Strategy: OPTION A (Template DB)
 *
 * Uses sql.js (devDependency) — a pure-JS/WASM SQLite that runs in plain Node.js
 * without needing to be rebuilt for Electron. The production app uses better-sqlite3.
 */

const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..');
const wasmPath = path.join(projectRoot, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const templateDir = path.join(projectRoot, 'assets', 'db');
const templatePath = path.join(templateDir, 'template.db');

async function main() {
  if (!fs.existsSync(wasmPath)) {
    console.error('sql.js WASM not found. Run npm install.');
    process.exit(1);
  }

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs({ locateFile: () => wasmPath });
  const db = new SQL.Database();

  const dbModule = require('../src/database/index');
  const { runSchema } = require('../src/database/schema');
  const { runTemplateCleanup } = require('../src/database/templateCleanup');

  // The raw sql.js Database has the same prepare/bind/step/getAsObject/run/exec
  // API used throughout the codebase, so it can be passed directly.
  dbModule.setDbForBuild(db);

  try {
    console.log('Building template DB...');
    runSchema(db);
    console.log('Running template cleanup (remove transactions / personal data)...');
    runTemplateCleanup(db, { resetSequences: true });
  } finally {
    dbModule.clearBuildDb();
  }

  if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, { recursive: true });
  const buf = Buffer.from(db.export());
  fs.writeFileSync(templatePath, buf);
  db.close();

  console.log('Template DB written:', templatePath);
}

main().catch((e) => {
  console.error('Build failed:', e);
  process.exit(1);
});
