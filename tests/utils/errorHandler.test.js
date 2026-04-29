const {
  getErrorMessage,
  logError,
  setLogDirectory,
  DEFAULT_MESSAGE,
} = require('../../src/utils/errorHandler');

describe('errorHandler', () => {
  describe('getErrorMessage', () => {
    it('returns default for null/undefined', () => {
      expect(getErrorMessage(null)).toBe(DEFAULT_MESSAGE);
      expect(getErrorMessage(undefined)).toBe(DEFAULT_MESSAGE);
    });
    it('returns known Arabic message when matching', () => {
      expect(getErrorMessage('رقم الهاتف مسجل مسبقًا.')).toBe('رقم الهاتف مسجل مسبقًا.');
      expect(getErrorMessage('فشل تحميل العاملين.')).toBe('فشل تحميل العاملين.');
    });
    it('returns string as-is when short', () => {
      expect(getErrorMessage('Custom error')).toBe('Custom error');
    });
    it('extracts from object with error or message', () => {
      expect(getErrorMessage({ error: 'فشل التصدير.' })).toBe('فشل التصدير.');
      expect(getErrorMessage({ message: 'فشل التصدير.' })).toBe('فشل التصدير.');
    });
  });

  describe('logError', () => {
    it('does not throw', () => {
      const orig = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      expect(() => logError('test')).not.toThrow();
      process.env.NODE_ENV = orig;
    });
  });

  describe('setLogDirectory', () => {
    it('accepts path', () => {
      expect(() => setLogDirectory(__dirname)).not.toThrow();
    });
  });
});
