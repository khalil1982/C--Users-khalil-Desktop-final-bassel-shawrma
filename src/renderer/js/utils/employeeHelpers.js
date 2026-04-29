/**
 * Shared constants and helpers for the employees module.
 */

export const MONTHS = [
  { value: '01', name: 'يناير' },
  { value: '02', name: 'فبراير' },
  { value: '03', name: 'مارس' },
  { value: '04', name: 'أبريل' },
  { value: '05', name: 'مايو' },
  { value: '06', name: 'يونيو' },
  { value: '07', name: 'يوليو' },
  { value: '08', name: 'أغسطس' },
  { value: '09', name: 'سبتمبر' },
  { value: '10', name: 'أكتوبر' },
  { value: '11', name: 'نوفمبر' },
  { value: '12', name: 'ديسمبر' },
];

/**
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return '₪0';
  return `₪${numeric.toFixed(2)}`;
}

/**
 * @param {string} [monthVal] - optional "YYYY-MM"
 * @returns {{ startDate: string, endDate: string }}
 */
export function getDetailsDateRange(monthVal) {
  if (!monthVal) {
    const end = new Date();
    const start = new Date(end.getFullYear() - 1, end.getMonth(), 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }
  const [y, m] = monthVal.split('-');
  const startDate = `${y}-${m}-01`;
  const lastDay = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
  const endDate = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}
