/**
 * Employee API service - delegates to window.api.employee for IPC calls.
 */

const api = typeof window !== 'undefined' && window.api ? window.api.employee : null;

/**
 * @param {{ activeOnly?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, employees?: Array<object>, error?: string }>}
 */
export function getAll(opts = {}) {
  return api ? api.getAll(opts) : Promise.resolve({ ok: false, error: 'API not available' });
}

/**
 * @param {string} employeeId
 * @returns {Promise<{ ok: boolean, employee?: object, error?: string }>}
 */
export function get(employeeId) {
  return api ? api.get(employeeId) : Promise.resolve({ ok: false, error: 'API not available' });
}

/**
 * @param {object} data
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export function create(data) {
  return api ? api.create(data) : Promise.resolve({ ok: false, error: 'API not available' });
}

/**
 * @param {string} employeeId
 * @param {object} data
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export function update(employeeId, data) {
  return api ? api.update(employeeId, data) : Promise.resolve({ ok: false, error: 'API not available' });
}

/**
 * @param {object} data
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export function recordSalary(data) {
  return api ? api.recordSalary(data) : Promise.resolve({ ok: false, error: 'API not available' });
}

/**
 * @param {object} data
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export function recordWithdrawal(data) {
  return api ? api.recordWithdrawal(data) : Promise.resolve({ ok: false, error: 'API not available' });
}

/**
 * @param {object} params
 * @returns {Promise<{ ok: boolean, salaries?: Array<object>, withdrawals?: Array<object>, totalSalary?: number, totalWithdrawals?: number, net?: number, error?: string }>}
 */
export function getFinancialDetails(params) {
  return api ? api.getFinancialDetails(params) : Promise.resolve({ ok: false, error: 'API not available' });
}

/**
 * @param {string} employeeId
 * @param {number} year
 * @param {number} month
 * @returns {Promise<{ ok: boolean, total?: number, count?: number, error?: string }>}
 */
export function getMonthlyWithdrawals(employeeId, year, month) {
  return api
    ? api.getMonthlyWithdrawals(employeeId, year, month)
    : Promise.resolve({ ok: false, error: 'API not available' });
}

/**
 * @param {{ startDate: string, endDate: string }} params
 * @returns {Promise<{ ok: boolean, salaries?: Array<object>, error?: string }>}
 */
export function getSalariesReport(params) {
  return api ? api.getSalariesReport(params) : Promise.resolve({ ok: false, error: 'API not available' });
}
