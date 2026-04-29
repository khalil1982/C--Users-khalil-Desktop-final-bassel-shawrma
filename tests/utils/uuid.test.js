const { generateUUID, isValidUUID } = require('../../src/utils/uuid');

describe('uuid utils', () => {
  describe('generateUUID', () => {
    it('returns a string', () => {
      expect(typeof generateUUID()).toBe('string');
    });
    it('matches UUID v4 format', () => {
      const uuid = generateUUID();
      expect(isValidUUID(uuid)).toBe(true);
    });
    it('generates different values', () => {
      const a = generateUUID();
      const b = generateUUID();
      expect(a).not.toBe(b);
    });
  });

  describe('isValidUUID', () => {
    it('accepts valid UUID v4', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')).toBe(true);
    });
    it('rejects invalid', () => {
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716-44665544000')).toBe(false);
      expect(isValidUUID('550e8400-e29b-31d4-a716-446655440000')).toBe(false);
    });
  });
});
