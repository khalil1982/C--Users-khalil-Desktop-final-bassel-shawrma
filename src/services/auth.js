const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const { getDb, persistDatabase, getDbPath } = require('../database');
const { logAudit } = require('./audit');
const { logAuth } = require('../utils/logger');

// Consistent bcrypt rounds across the system
const BCRYPT_ROUNDS = 10;

let currentSession = null;

function setCurrentSession(session) {
  currentSession = session;
}

function getCurrentSession() {
  return currentSession;
}

function clearCurrentSession() {
  currentSession = null;
}

function generateSessionId() {
  return crypto.randomBytes(24).toString('hex');
}

function getUser(db, username) {
  logAuth('QUERYING USER', {
    username: username,
    timestamp: new Date().toISOString()
  });
  
  const stmt = db.prepare(
    'SELECT id, username, password_hash, role, status FROM users WHERE username = ?'
  );
  stmt.bind([username?.trim() || '']);
  const ok = stmt.step();
  const row = ok ? stmt.getAsObject() : null;
  stmt.free();
  
  if (row) {
    logAuth('USER FOUND', {
      userId: row.id,
      username: row.username,
      role: row.role,
      status: row.status,
      passwordHashLength: row.password_hash?.length || 0,
      passwordHashPrefix: row.password_hash?.substring(0, 10),
      timestamp: new Date().toISOString()
    });
  } else {
    logAuth('USER NOT FOUND', {
      username: username,
      timestamp: new Date().toISOString()
    });
  }
  
  return row;
}

function login(username, password) {
  logAuth('LOGIN ATTEMPT START', {
    username: username,
    passwordProvided: !!password,
    passwordLength: password ? password.length : 0,
    timestamp: new Date().toISOString()
  });
  
  try {
    const db = getDb();
    
    // Normalize username
    const normalizedUsername = username?.trim();
    logAuth('USERNAME NORMALIZED', {
      original: username,
      normalized: normalizedUsername,
      timestamp: new Date().toISOString()
    });
    
    const user = getUser(db, normalizedUsername);

    logAuth('USER LOOKUP RESULT', {
      username: normalizedUsername,
      userFound: !!user,
      userId: user?.id,
      userRole: user?.role,
      userStatus: user?.status,
      timestamp: new Date().toISOString()
    });

    if (!user) {
      logAuth('LOGIN FAILED', {
        reason: 'User not found',
        username: normalizedUsername,
        timestamp: new Date().toISOString()
      });
      
      return { ok: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.', remainingAttempts: null, lockedUntil: null };
    }

    if (user.status !== 'active') {
      logAuth('LOGIN FAILED', {
        reason: 'Account inactive',
        userId: user.id,
        status: user.status,
        timestamp: new Date().toISOString()
      });
      
      return { ok: false, error: 'هذا الحساب غير مفعّل.', remainingAttempts: null, lockedUntil: null };
    }

    // Determine password type
    const isBcryptHash = user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2y$');
    
    logAuth('PASSWORD COMPARISON', {
      userId: user.id,
      username: user.username,
      passwordType: isBcryptHash ? 'bcrypt' : 'plain',
      passwordHashPrefix: user.password_hash.substring(0, 10),
      passwordHashLength: user.password_hash.length,
      timestamp: new Date().toISOString()
    });
    
    let valid = false;
    if (isBcryptHash) {
      // Use bcrypt for comparison
      valid = bcrypt.compareSync(password || '', user.password_hash);
      logAuth('BCRYPT COMPARISON RESULT', {
        result: valid,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    } else {
      // Use plain text comparison for backward compatibility
      valid = (password || '') === user.password_hash;
      logAuth('PLAIN TEXT COMPARISON RESULT', {
        result: valid,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    }
    
    if (!valid) {
      logAuth('LOGIN FAILED', {
        reason: 'Password mismatch',
        userId: user.id,
        passwordTypeUsed: isBcryptHash ? 'bcrypt' : 'plain',
        timestamp: new Date().toISOString()
      });
      
      return {
        ok: false,
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        remainingAttempts: null,
        lockedUntil: null,
      };
    }

    logAuth('LOGIN SUCCESSFUL', {
      userId: user.id,
      username: user.username,
      role: user.role,
      timestamp: new Date().toISOString()
    });

    const sessionId = generateSessionId();

    return {
      ok: true,
      user: { userId: user.id, username: user.username, role: user.role },
      sessionId,
    };
  } catch (error) {
    logAuth('LOGIN EXCEPTION', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return {
      ok: false,
      error: 'حدث خطأ في النظام. تحقق من السجلات.',
      remainingAttempts: null,
      lockedUntil: null,
    };
  }
}

function logout(sessionId) {
  if (!sessionId) {
    return { ok: false, error: 'الجلسة غير صالحة أو منتهية.' };
  }
  return { ok: true };
}

function verifyAdminCredentials(username, password) {
  logAuth('ADMIN CREDENTIAL VERIFICATION', {
    username: username,
    passwordProvided: !!password,
    passwordLength: password ? password.length : 0,
    timestamp: new Date().toISOString()
  });
  
  const db = getDb();
  
  // Normalize username
  const normalizedUsername = username?.trim();
  
  const user = getUser(db, normalizedUsername);

  logAuth('ADMIN USER LOOKUP', {
    username: normalizedUsername,
    userFound: !!user,
    userRole: user?.role,
    userStatus: user?.status,
    timestamp: new Date().toISOString()
  });

  if (!user || user.role !== 'manager') {
    logAuth('ADMIN VERIFICATION FAILED', {
      reason: 'User not found or not manager',
      username: normalizedUsername,
      userRole: user ? user.role : 'not found',
      timestamp: new Date().toISOString()
    });
    
    return { ok: false, error: 'بيانات المدير غير صحيحة.' };
  }

  if (user.status !== 'active') {
    logAuth('ADMIN VERIFICATION FAILED', {
      reason: 'Account inactive',
      userId: user.id,
      status: user.status,
      timestamp: new Date().toISOString()
    });
    
    return { ok: false, error: 'هذا الحساب غير مفعّل.' };
  }

  // Determine password type and compare
  const isBcryptHash = user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2y$');
  
  logAuth('ADMIN PASSWORD COMPARISON', {
    userId: user.id,
    passwordType: isBcryptHash ? 'bcrypt' : 'plain',
    timestamp: new Date().toISOString()
  });
  
  let valid = false;
  if (isBcryptHash) {
    valid = bcrypt.compareSync(password || '', user.password_hash);
  } else {
    valid = (password || '') === user.password_hash;
  }
  
  logAuth('ADMIN PASSWORD COMPARISON RESULT', {
    userId: user.id,
    result: valid,
    timestamp: new Date().toISOString()
  });
  
  if (!valid) {
    logAuth('ADMIN VERIFICATION FAILED', {
      reason: 'Password mismatch',
      userId: user.id,
      timestamp: new Date().toISOString()
    });
    
    return { ok: false, error: 'بيانات المدير غير صحيحة.' };
  }
  
  logAuth('ADMIN VERIFICATION SUCCESSFUL', {
    userId: user.id,
    username: user.username,
    timestamp: new Date().toISOString()
  });

  return { ok: true, admin: { userId: user.id, username: user.username } };
}

function getUsers() {
  const db = getDb();
  const stmt = db.prepare('SELECT id, username, role, status FROM users ORDER BY username ASC');
  const users = [];
  while (stmt.step()) {
    users.push(stmt.getAsObject());
  }
  stmt.free();
  return { ok: true, users };
}

function changeUserPassword({ targetUserId, adminPassword, newPassword, adminUserId }) {
  console.log(`[AUTH] ========== PASSWORD CHANGE REQUEST ==========`);
  console.log(`[AUTH] Target user ID: ${targetUserId}`);
  console.log(`[AUTH] Admin user ID: ${adminUserId}`);
  console.log(`[AUTH] New password length: ${newPassword ? newPassword.length : 0}`);
  
  const db = getDb();
  
  if (!targetUserId) {
    console.log(`[AUTH] Password change failed: Target user ID missing`);
    return { ok: false, error: 'المستخدم المستهدف مطلوب.' };
  }
  if (!adminPassword) {
    console.log(`[AUTH] Password change failed: Admin password missing`);
    return { ok: false, error: 'كلمة مرور المدير مطلوبة.' };
  }
  if (!newPassword || newPassword.length < 6) {
    console.log(`[AUTH] Password change failed: New password too short (${newPassword ? newPassword.length : 0} chars)`);
    return { ok: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.' };
  }

  // Verify admin credentials
  console.log(`[AUTH] Verifying admin credentials...`);
  const adminStmt = db.prepare('SELECT id, password_hash, role, status, username FROM users WHERE id = ?');
  adminStmt.bind([adminUserId]);
  const hasAdmin = adminStmt.step();
  const admin = hasAdmin ? adminStmt.getAsObject() : null;
  adminStmt.free();

  if (!admin || admin.role !== 'manager') {
    console.log(`[AUTH] Password change failed: Admin not authorized (role: ${admin ? admin.role : 'not found'})`);
    return { ok: false, error: 'غير مصرح بهذه العملية.' };
  }
  if (admin.status !== 'active') {
    console.log(`[AUTH] Password change failed: Admin account inactive (status: ${admin.status})`);
    return { ok: false, error: 'حساب المدير غير مفعّل.' };
  }
  
  console.log(`[AUTH] Comparing admin password...`);
  const valid = bcrypt.compareSync(adminPassword, admin.password_hash);
  console.log(`[AUTH] Admin password valid: ${valid}`);
  if (!valid) {
    console.log(`[AUTH] Password change failed: Admin password incorrect`);
    return { ok: false, error: 'كلمة مرور المدير غير صحيحة.' };
  }

  // Get target user
  console.log(`[AUTH] Fetching target user...`);
  const targetStmt = db.prepare('SELECT id, username FROM users WHERE id = ?');
  targetStmt.bind([targetUserId]);
  const hasTarget = targetStmt.step();
  const target = hasTarget ? targetStmt.getAsObject() : null;
  targetStmt.free();
  
  if (!target) {
    console.log(`[AUTH] Password change failed: Target user not found`);
    return { ok: false, error: 'المستخدم المستهدف غير موجود.' };
  }
  console.log(`[AUTH] Target user found: ${target.username}`);

  // Get old password hash for logging (before update)
  const oldHashStmt = db.prepare('SELECT password_hash FROM users WHERE id = ?');
  oldHashStmt.bind([targetUserId]);
  oldHashStmt.step();
  const oldHash = oldHashStmt.getAsObject().password_hash;
  oldHashStmt.free();
  console.log(`[AUTH] Old password hash length: ${oldHash ? oldHash.length : 0}`);
  console.log(`[AUTH] Old hash starts with: ${oldHash ? oldHash.substring(0, 10) : 'N/A'}...`);

  // Hash new password
  console.log(`[AUTH] Hashing new password with ${BCRYPT_ROUNDS} rounds...`);
  const hash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  console.log(`[AUTH] New password hash length: ${hash.length}`);
  console.log(`[AUTH] New hash starts with: ${hash.substring(0, 10)}...`);

  // Update database
  console.log(`[AUTH] Updating database...`);
  db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, targetUserId]);
  console.log(`[AUTH] Database UPDATE executed`);

  // Verify the update worked
  console.log(`[AUTH] Verifying update...`);
  const verifyStmt = db.prepare('SELECT password_hash FROM users WHERE id = ?');
  verifyStmt.bind([targetUserId]);
  verifyStmt.step();
  const updatedHash = verifyStmt.getAsObject().password_hash;
  verifyStmt.free();
  
  const updateSuccess = updatedHash === hash;
  console.log(`[AUTH] Update verification: ${updateSuccess ? 'SUCCESS' : 'FAILED'}`);
  console.log(`[AUTH] Stored hash matches new hash: ${updateSuccess}`);
  
  if (!updateSuccess) {
    console.error(`[AUTH] CRITICAL: Password update verification failed!`);
    console.error(`[AUTH] Expected hash: ${hash.substring(0, 20)}...`);
    console.error(`[AUTH] Stored hash: ${updatedHash ? updatedHash.substring(0, 20) : 'NULL'}...`);
    return { ok: false, error: 'فشل تحديث كلمة المرور. تحقق من السجلات.' };
  }

  // Test password comparison with new hash
  console.log(`[AUTH] Testing password comparison with new hash...`);
  const testComparison = bcrypt.compareSync(newPassword, updatedHash);
  console.log(`[AUTH] Password comparison test: ${testComparison ? 'SUCCESS' : 'FAILED'}`);
  
  // Also test if the new password might already be hashed (double-hashing detection)
  const doubleHashTest = bcrypt.compareSync(hash, updatedHash); // Compare the hash against itself
  console.log(`[AUTH] Double-hash test (checking if new password is already hashed): ${doubleHashTest ? 'DETECTED' : 'NOT DETECTED'}`);
  
  if (!testComparison) {
    console.error(`[AUTH] CRITICAL: Password comparison test failed after update!`);
    console.error(`[AUTH] Expected password: ${newPassword}`);
    console.error(`[AUTH] Expected hash: ${hash.substring(0, 20)}...`);
    console.error(`[AUTH] Stored hash: ${updatedHash.substring(0, 20)}...`);
    return { ok: false, error: 'فشل التحقق من كلمة المرور الجديدة. تحقق من السجلات.' };
  }
  
  if (doubleHashTest) {
    console.error(`[AUTH] CRITICAL: Double-hashing detected during password update!`);
    console.error(`[AUTH] The new password appears to already be hashed.`);
    return { ok: false, error: 'تم اكتشاف مشكلة في تشفير كلمة المرور. تحقق من السجلات.' };
  }

  // Persist database to disk (CRITICAL - sql.js keeps DB in memory)
  console.log(`[AUTH] Persisting database to disk...`);
  try {
    const dbPathBefore = getDbPath();
    console.log(`[AUTH] Database path before persistence: ${dbPathBefore}`);
    
    if (!dbPathBefore) {
      console.error(`[AUTH] CRITICAL: Database path is null!`);
      return { ok: false, error: 'فشل حفظ كلمة المرور. مسار قاعدة البيانات غير محدد.' };
    }
    
    persistDatabase();
    
    // Verify persistence succeeded
    const dbPathAfter = getDbPath();
    console.log(`[AUTH] Database path after persistence: ${dbPathAfter}`);
    
    if (dbPathBefore !== dbPathAfter) {
      console.error(`[AUTH] CRITICAL: Database path changed during persistence!`);
      console.error(`[AUTH] Before: ${dbPathBefore}`);
      console.error(`[AUTH] After: ${dbPathAfter}`);
      return { ok: false, error: 'فشل حفظ كلمة المرور. تحقق من السجلات.' };
    }
    
    // Verify file exists and is readable
    if (!fs.existsSync(dbPathAfter)) {
      console.error(`[AUTH] CRITICAL: Database file does not exist after persistence!`);
      return { ok: false, error: 'فشل حفظ كلمة المرور. تحقق من السجلات.' };
    }
    
    const fileStats = fs.statSync(dbPathAfter);
    console.log(`[AUTH] Database file verified: exists=true, size=${fileStats.size} bytes`);
    
    // Verify the password was actually saved by reading it back
    const verifyPasswordStmt = db.prepare('SELECT password_hash FROM users WHERE id = ?');
    verifyPasswordStmt.bind([targetUserId]);
    verifyPasswordStmt.step();
    const savedHash = verifyPasswordStmt.getAsObject().password_hash;
    verifyPasswordStmt.free();
    
    if (savedHash !== hash) {
      console.error(`[AUTH] CRITICAL: Password hash mismatch after persistence!`);
      console.error(`[AUTH] Expected: ${hash.substring(0, 20)}...`);
      console.error(`[AUTH] Saved: ${savedHash ? savedHash.substring(0, 20) : 'NULL'}...`);
      return { ok: false, error: 'فشل التحقق من حفظ كلمة المرور. تحقق من السجلات.' };
    }
    
    console.log(`[AUTH] ✅ Database persisted successfully and password verified`);
  } catch (persistError) {
    console.error(`[AUTH] CRITICAL: Failed to persist database:`, persistError);
    console.error(`[AUTH] Error message: ${persistError.message}`);
    console.error(`[AUTH] Error stack: ${persistError.stack}`);
    return { ok: false, error: 'فشل حفظ كلمة المرور. تحقق من السجلات.' };
  }

  // Log audit
  logAudit({
    userId: adminUserId,
    action: 'USER_PASSWORD_CHANGED',
    entityType: 'user',
    entityId: targetUserId,
    details: { target_username: target.username, admin_username: admin.username }
  });

  console.log(`[AUTH] ✅ Password change completed successfully for user: ${target.username}`);
  console.log(`[AUTH] ================================================`);

  return { ok: true };
}

module.exports = {
  login,
  logout,
  getCurrentSession,
  setCurrentSession,
  clearCurrentSession,
  verifyAdminCredentials,
  getUsers,
  changeUserPassword,
};
