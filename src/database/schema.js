const bcrypt = require('bcryptjs');
const { runMigrations } = require('./migrations');
const { seedInitialMenu, menuItemsExist } = require('./seeds/initial-menu');
const { generateUUID } = require('../utils/uuid');

const BCRYPT_ROUNDS = 10;

/**
 * Runs database schema initialization
 * Core tables follow the BRD schema exactly
 *
 * @param {Object} database - sql.js database instance
 */
function runSchema(database) {
  console.log('🔧 Initializing database schema...');

  console.log('  📦 Creating core tables...');
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('manager', 'employee', 'kitchen')),
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    );
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      order_number INTEGER NOT NULL,
      business_date TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      status TEXT,
      order_is_received INTEGER DEFAULT 0,
      subtotal REAL NOT NULL CHECK(subtotal >= 0),
      discount_type TEXT CHECK(discount_type IN ('percent', 'amount')),
      discount_value REAL CHECK(discount_value >= 0),
      discount_amount REAL DEFAULT 0 CHECK(discount_amount >= 0),
      total REAL NOT NULL CHECK(total >= 0),
      payment_method TEXT CHECK(payment_method IN ('cash', 'bank_app')),
      notes TEXT,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  console.log('  ✅ Core tables created');

  seedAdminIfNeeded(database);

  try {
    const migrationResult = runMigrations(database);

    if (migrationResult.ok && migrationResult.applied > 0) {
      console.log('  🌱 Running initial data seeds...');

      if (!menuItemsExist()) {
        seedInitialMenu();
      } else {
        console.log('  ℹ️  Menu items already exist, skipping seed');
      }
    }

  } catch (error) {
    console.error('  ❌ Migration error:', error);
    throw error;
  }

  console.log('✅ Database schema initialized successfully');
}

/**
 * Seeds admin user if it doesn't exist
 * @param {Object} database - sql.js database instance
 */
function seedAdminIfNeeded(database) {
  console.log('  🔍 Checking for admin user...');
  
  let stmt = database.prepare('SELECT id, username, password_hash, role, status FROM users WHERE username = ?');
  stmt.bind(['admin']);
  const adminExists = stmt.step();
  const existingAdmin = adminExists ? stmt.getAsObject() : null;
  stmt.free();

  const correctPassword = 'Admin123Admin';
  const correctHash = bcrypt.hashSync(correctPassword, BCRYPT_ROUNDS);
  
  if (!adminExists) {
    // Check if users table is completely empty
    const userCountStmt = database.prepare('SELECT COUNT(*) as count FROM users');
    userCountStmt.step();
    const userCountResult = userCountStmt.getAsObject();
    const totalUsers = userCountResult.count;
    userCountStmt.free();
    
    console.log(`  ℹ️  Total users in table: ${totalUsers}`);
    
    if (totalUsers === 0) {
      // Recovery admin: create default admin with simple password if no users exist
      console.log('  ⚠️  Users table is empty, creating recovery admin...');
      
      // Create recovery admin with username 'admin' and password '1234'
      const recoveryPassword = '1234';
      const recoveryHash = bcrypt.hashSync(recoveryPassword, BCRYPT_ROUNDS);
      
      database.run(
        'INSERT INTO users (id, username, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [generateUUID(), 'admin', recoveryHash, 'manager', 'active', new Date().toISOString()]
      );
      
      console.log('  ✅ Recovery admin created (username: admin, password: 1234)');
    } else {
      // Create standard admin with default password
      console.log('  ⚠️  Admin user not found, creating default admin...');
      database.run(
        'INSERT INTO users (id, username, password_hash, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [generateUUID(), 'admin', correctHash, 'manager', 'active', new Date().toISOString()]
      );
      console.log('  ✅ Admin user created (username: admin, password: Admin123Admin)');
    }
  } else {
    console.log(`  ✅ Admin user found - ID: ${existingAdmin.id}, Role: ${existingAdmin.role}, Status: ${existingAdmin.status}`);
    
    // Verify admin user has active status
    if (existingAdmin.status !== 'active') {
      console.log('  ⚠️  Admin user is not active, updating status...');
      database.run('UPDATE users SET status = ? WHERE username = ?', ['active', 'admin']);
      console.log('  ✅ Admin user status updated to active');
    }
    
    // Verify admin user has correct password
    // Only reset if it's the default recovery password (1234) to prevent lockout
    const defaultRecoveryPassword = '1234';
    const defaultRecoveryHash = bcrypt.hashSync(defaultRecoveryPassword, BCRYPT_ROUNDS);
    
    // Check if current password is the default recovery password
    const isDefaultRecoveryPassword = bcrypt.compareSync(defaultRecoveryPassword, existingAdmin.password_hash);
    
    if (isDefaultRecoveryPassword) {
      console.log('  ⚠️  Admin user has default recovery password, updating to secure default...');
      database.run('UPDATE users SET password_hash = ? WHERE username = ?', [correctHash, 'admin']);
      console.log('  ✅ Admin user password updated to: Admin123Admin');
    } else {
      console.log('  ✅ Admin user password is custom (not default), keeping as-is');
    }
  }
}

module.exports = { runSchema, seedAdminIfNeeded };