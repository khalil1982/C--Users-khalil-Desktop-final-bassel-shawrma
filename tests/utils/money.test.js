const { parseMoney, roundMoney, ceilMoney, MONEY_PATTERN } = require('../../src/utils/money');

describe('money utils', () => {
  describe('roundMoney', () => {
    it('rounds to one decimal', () => {
      expect(roundMoney(1.24)).toBe(1.2);
      expect(roundMoney(1.25)).toBe(1.3); // Math.round(12.5) === 13 in JS
      expect(roundMoney(1.26)).toBe(1.3);
    });
    it('returns 0 for non-finite', () => {
      expect(roundMoney(NaN)).toBe(0);
      expect(roundMoney(Infinity)).toBe(0);
    });
  });

  describe('ceilMoney', () => {
    it('ceils to one decimal', () => {
      expect(ceilMoney(1.21)).toBe(1.3);
      expect(ceilMoney(1.2)).toBe(1.2);
    });
    it('returns 0 for non-finite', () => {
      expect(ceilMoney(NaN)).toBe(0);
    });
  });

  describe('parseMoney', () => {
    it('accepts valid number string', () => {
      expect(parseMoney('10')).toEqual({ ok: true, value: 10 });
      expect(parseMoney('10.5')).toEqual({ ok: true, value: 10.5 });
    });
    it('accepts number', () => {
      expect(parseMoney(10)).toEqual({ ok: true, value: 10 });
    });
    it('rejects empty when allowNull is false', () => {
      expect(parseMoney('').ok).toBe(false);
      expect(parseMoney(null).ok).toBe(false);
      expect(parseMoney(undefined).ok).toBe(false);
    });
    it('returns null value when allowNull and empty', () => {
      expect(parseMoney('', { allowNull: true })).toEqual({ ok: true, value: null });
      expect(parseMoney(null, { allowNull: true })).toEqual({ ok: true, value: null });
    });
    it('rejects invalid format', () => {
      expect(parseMoney('10.12').ok).toBe(false);
      expect(parseMoney('abc').ok).toBe(false);
    });
  });

  describe('MONEY_PATTERN', () => {
    it('matches one decimal', () => {
      expect(MONEY_PATTERN.test('1')).toBe(true);
      expect(MONEY_PATTERN.test('1.5')).toBe(true);
      expect(MONEY_PATTERN.test('10.1')).toBe(true);
      expect(MONEY_PATTERN.test('1.55')).toBe(false);
    });
  });
});
