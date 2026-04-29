const MONEY_PATTERN = /^\d+(\.\d)?$/;

function roundMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 10) / 10;
}

/** المجموع النهائي المطلوب للدفع (كاش/بنكي) يُحسب دائماً ceil */
function ceilMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.ceil(numeric * 10) / 10;
}

function parseMoney(value, { allowNull = false } = {}) {
  if (value === null || value === undefined || value === '') {
    if (allowNull) {
      return { ok: true, value: null };
    }
    return { ok: false, error: 'القيمة مطلوبة.' };
  }

  const raw = typeof value === 'number' ? value.toString() : String(value).trim();
  if (!MONEY_PATTERN.test(raw)) {
    return { ok: false, error: 'القيمة يجب أن تكون رقمًا صحيحًا أو بمنزلة عشرية واحدة فقط.' };
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return { ok: false, error: 'القيمة غير صالحة.' };
  }

  return { ok: true, value: numeric };
}

module.exports = {
  parseMoney,
  roundMoney,
  ceilMoney,
  MONEY_PATTERN,
};
