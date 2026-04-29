const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let logFilePath = null;

function initLogger() {
  try {
    const userDataPath = app.getPath('userData');
    logFilePath = path.join(userDataPath, 'auth-debug.log');
    
    // Write header if file doesn't exist or is empty
    if (!fs.existsSync(logFilePath) || fs.statSync(logFilePath).size === 0) {
      fs.writeFileSync(logFilePath, `=== AUTHENTICATION DEBUG LOG STARTED ===\n`);
      fs.appendFileSync(logFilePath, `Log file created at: ${new Date().toISOString()}\n`);
      fs.appendFileSync(logFilePath, `User Data Path: ${userDataPath}\n\n`);
    }
  } catch (error) {
    console.error('Failed to initialize logger:', error);
  }
}

function logAuth(message, data = null) {
  try {
    const timestamp = new Date().toISOString();
    let logEntry = `[${timestamp}] ${message}`;
    
    if (data) {
      // Safely serialize data without exposing sensitive information
      const safeData = sanitizeSensitiveData(data);
      logEntry += `\n  Data: ${JSON.stringify(safeData, null, 2)}`;
    }
    
    logEntry += '\n';
    
    if (logFilePath) {
      fs.appendFileSync(logFilePath, logEntry);
    } else {
      console.log(`[LOGGER] ${logEntry}`);
    }
  } catch (error) {
    console.error('Failed to write to auth log:', error);
  }
}

function sanitizeSensitiveData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sanitized = { ...data };
  
  // Sanitize password fields
  if (sanitized.password) {
    const pwd = sanitized.password;
    sanitized.password = typeof pwd === 'string' 
      ? `LENGTH:${pwd.length}, PREFIX:${pwd.substring(0, 2)}...` 
      : '[PROVIDED]';
  }
  
  if (sanitized.newPassword) {
    const pwd = sanitized.newPassword;
    sanitized.newPassword = typeof pwd === 'string' 
      ? `LENGTH:${pwd.length}, PREFIX:${pwd.substring(0, 2)}...` 
      : '[PROVIDED]';
  }
  
  if (sanitized.adminPassword) {
    const pwd = sanitized.adminPassword;
    sanitized.adminPassword = typeof pwd === 'string' 
      ? `LENGTH:${pwd.length}, PREFIX:${pwd.substring(0, 2)}...` 
      : '[PROVIDED]';
  }
  
  return sanitized;
}

function getLogFilePath() {
  return logFilePath;
}

module.exports = {
  initLogger,
  logAuth,
  getLogFilePath
};