/**
 * Renders a single employee card HTML string.
 * @param {object} emp - employee object with employee_id, name, phone, status
 * @returns {string} HTML string
 */
export function renderEmployeeCard(emp) {
  const statusClass = emp.status === 'active' ? 'active' : 'inactive';
  const statusText = emp.status === 'active' ? '🟢 نشط' : '🔴 غير نشط';
  return `
    <div class="employee-card" data-id="${emp.employee_id}">
      <div class="employee-card-header">
        <div class="employee-card-avatar" aria-hidden="true">👤</div>
        <div class="employee-card-info">
          <h4 class="employee-card-name">${emp.name}</h4>
          <div class="employee-card-phone">📱 ${emp.phone || '—'}</div>
          <span class="employee-card-status ${statusClass}">${statusText}</span>
        </div>
      </div>
      <div class="employee-card-actions">
        <button type="button" class="btn-salary-action" data-action="salary" data-id="${emp.employee_id}">تسليم مرتب شهري</button>
        <button type="button" class="btn-withdrawal-action" data-action="withdrawal" data-id="${emp.employee_id}">سحب سلفة</button>
        <button type="button" class="btn-details-action" data-action="details" data-id="${emp.employee_id}">تفاصيل مالية</button>
        <button type="button" class="btn-edit-action" data-action="edit" data-id="${emp.employee_id}">تعديل</button>
      </div>
    </div>
  `;
}
