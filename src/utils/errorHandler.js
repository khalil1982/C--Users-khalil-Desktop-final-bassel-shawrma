/**
 * Unified error handling: user-facing Arabic messages and central logging.
 * Used by main process; renderer can use via IPC (reportError, getErrorMessage).
 */

const fs = require('fs');
const path = require('path');

/** Known error messages (API/service responses) mapped to Arabic */
const MESSAGES = {
  'رقم الهاتف مسجل مسبقًا.': 'رقم الهاتف مسجل مسبقًا.',
  'رقم الهاتف مسجل مسبقاً.': 'رقم الهاتف مسجل مسبقاً.',
  'فشل تحميل العاملين.': 'فشل تحميل العاملين.',
  'فشل تحميل بيانات العامل.': 'فشل تحميل بيانات العامل.',
  'فشل إضافة العامل.': 'فشل إضافة العامل.',
  'فشل تحديث العامل.': 'فشل تحديث العامل.',
  'فشل تسجيل المرتب.': 'فشل تسجيل المرتب.',
  'فشل تسجيل السحب.': 'فشل تسجيل السحب.',
  'فشل تحميل البيانات.': 'فشل تحميل البيانات.',
  'فشل تحميل التقرير.': 'فشل تحميل التقرير.',
  'فشل التصدير.': 'فشل التصدير.',
  'اسم الزبون مطلوب.': 'اسم الزبون مطلوب.',
  'رقم الهاتف مطلوب.': 'رقم الهاتف مطلوب.',
  'تسجيل الدخول غير صحيح.': 'تسجيل الدخول غير صحيح.',
  'خطأ في الاتصال بقاعدة البيانات.': 'خطأ في الاتصال بقاعدة البيانات.',
  'خطأ غير متوقع.': 'حدث خطأ غير متوقع. الرجاء المحاولة لاحقاً.',
};

const DEFAULT_MESSAGE = 'حدث خطأ غير متوقع. الرجاء المحاولة لاحقاً.';

let logFilePath = null;

/**
 * Set log file path (e.g. from app.getPath('userData')). Call from main once.
 * @param {string} dirPath
 */
function setLogDirectory(dirPath) {
  if (dirPath) logFilePath = path.join(dirPath, 'pos-errors.log');
}

/**
 * Get a user-friendly Arabic error message from any error-like value.
 * @param {Error|string|{ error?: string, message?: string }|null} err
 * @returns {string}
 */
function getErrorMessage(err) {
  if (err == null) return DEFAULT_MESSAGE;
  const str = typeof err === 'string' ? err : err?.error || err?.message || String(err);
  const trimmed = (str || '').trim();
  if (MESSAGES[trimmed]) return MESSAGES[trimmed];
  if (trimmed.length > 0 && trimmed.length < 200) return trimmed;
  return DEFAULT_MESSAGE;
}

/**
 * Log error to file (and console in development). Safe to call from main process.
 * @param {string} message
 * @param {{ stack?: string, context?: string }|undefined} details
 */
function logError(message, details = {}) {
  const line = [
    new Date().toISOString(),
    message,
    details.stack ? `\n  ${details.stack}` : '',
    details.context ? ` [${details.context}]` : '',
  ]
    .filter(Boolean)
    .join('') + '\n';

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[POS Error]', line.trim());
  }

  if (logFilePath) {
    try {
      fs.appendFileSync(logFilePath, line, 'utf8');
    } catch (_e) {
      // ignore write errors
    }
  }
}

module.exports = {
  getErrorMessage,
  logError,
  setLogDirectory,
  DEFAULT_MESSAGE,
};
