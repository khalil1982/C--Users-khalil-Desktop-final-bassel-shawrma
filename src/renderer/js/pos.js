(function () {
  const orderHeader = document.getElementById('orderHeader');
  const orderStatusBadge = document.getElementById('orderStatusBadge');
  const menuGrid = document.getElementById('menuGrid');
  const orderItems = document.getElementById('orderItems');
  const subtotalEl = document.getElementById('subtotal');
  const discountEl = document.getElementById('discountAmount');
  const finalTotalEl = document.getElementById('finalTotal');
  const newOrderBtn = document.getElementById('newOrderBtn');
  const btnMarkReceived = document.getElementById('btnMarkReceived');
  const btnApplyDiscount = document.getElementById('btnApplyDiscount');
  const btnRemoveDiscount = document.getElementById('btnRemoveDiscount');
  const btnCancelOrder = document.getElementById('btnCancelOrder');
  const menuSearch = document.getElementById('menuSearch');
  const activityList = document.getElementById('activityList');
  const errorArea = document.getElementById('errorArea');
  const userBadge = document.getElementById('userBadge');
  const btnLogout = document.getElementById('btnLogout');
  const logoutModal = document.getElementById('logoutModal');
  const logoutCancel = document.getElementById('logoutCancel');
  const logoutConfirm = document.getElementById('logoutConfirm');
  const discountModal = document.getElementById('discountModal');
  const discountError = document.getElementById('discountError');
  const discountCancel = document.getElementById('discountCancel');
  const cancelModal = document.getElementById('cancelModal');
  const cancelReason = document.getElementById('cancelReason');
  const cancelError = document.getElementById('cancelError');
  const cancelDismiss = document.getElementById('cancelDismiss');
  const cancelConfirm = document.getElementById('cancelConfirm');
  const receiveModal = document.getElementById('receiveModal');
  const receiveCancel = document.getElementById('receiveCancel');
  const receiveConfirm = document.getElementById('receiveConfirm');
  const receiveError = document.getElementById('receiveError');
  const receiptOrderNumber = document.getElementById('receiptOrderNumber');
  const receiptTotal = document.getElementById('receiptTotal');
  const receiptDiscount = document.getElementById('receiptDiscount');
  const receiveCustomerName = document.getElementById('receiveCustomerName');
  const activityModal = document.getElementById('activityModal');
  const activityClose = document.getElementById('activityClose');
  const activityOrderNumber = document.getElementById('activityOrderNumber');
  const activityTotal = document.getElementById('activityTotal');
  const activityReceived = document.getElementById('activityReceived');
  const activityPayment = document.getElementById('activityPayment');
  const activityItems = document.getElementById('activityItems');
  const navItems = document.querySelectorAll('.nav-item');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const tablesBtn = document.getElementById('tablesBtn');
  const tablesModal = document.getElementById('tablesModal');
  const tablesModalClose = document.getElementById('tablesModalClose');
  const tablesView = document.getElementById('tablesView');
  const tablesGrid = document.getElementById('tablesGrid');
  const tablesOrderView = document.getElementById('tablesOrderView');
  const tablesBackBtn = document.getElementById('tablesBackBtn');
  const tablesSelectedLabel = document.getElementById('tablesSelectedLabel');
  const tablesMenuGrid = document.getElementById('tablesMenuGrid');
  const tablesMenuSearch = document.getElementById('tablesMenuSearch');
  const tablesOrderItems = document.getElementById('tablesOrderItems');
  const tablesOrderHeader = document.getElementById('tablesOrderHeader');
  const tablesOrderStatusBadge = document.getElementById('tablesOrderStatusBadge');
  const tablesFinalTotal = document.getElementById('tablesFinalTotal');
  const tablesBtnDelivered = document.getElementById('tablesBtnDelivered');
  const tablesBtnDiscount = document.getElementById('tablesBtnDiscount');
  const tablesBtnRemoveDiscount = document.getElementById('tablesBtnRemoveDiscount');
  const tablesBtnBilling = document.getElementById('tablesBtnBilling');
  const tablesBtnCancel = document.getElementById('tablesBtnCancel');
  const tablesSubtotal = document.getElementById('tablesSubtotal');
  const tablesDiscountAmount = document.getElementById('tablesDiscountAmount');
  const tablesBillingModal = document.getElementById('tablesBillingModal');
  const tablesBillingCancel = document.getElementById('tablesBillingCancel');
  const tablesBillingConfirm = document.getElementById('tablesBillingConfirm');
  const tablesBillingCustomerName = document.getElementById('tablesBillingCustomerName');
  const tablesModalError = document.getElementById('tablesModalError');
  const activityListTables = document.getElementById('activityListTables');
  const debtPaymentModal = document.getElementById('debtPaymentModal');
  const debtPaymentName = document.getElementById('debtPaymentName');
  const debtPaymentPhone = document.getElementById('debtPaymentPhone');
  const debtPaymentNationalId = document.getElementById('debtPaymentNationalId');
  const debtPaymentAmount = document.getElementById('debtPaymentAmount');
  const debtPaymentError = document.getElementById('debtPaymentError');
  const debtPaymentMaxHint = document.getElementById('debtPaymentMaxHint');
  const debtPaymentCancel = document.getElementById('debtPaymentCancel');
  const debtPaymentConfirm = document.getElementById('debtPaymentConfirm');

  let session = null;
  let currentOrder = null;
  let menuItems = [];
  let activeCategory = 'all';
  let tablesMenuItems = [];
  let tablesActiveCategory = 'all';
  let currentTableOrder = null;
  let currentTableId = null;
  let tableOrders = {}; // Map table_id to order_id (cache for active orders)
  let discountTargetOrderId = null;
  const tableTimers = {}; // table_id -> { startedAt, elapsedMs, running }
  let tableTimerInterval = null;
  let pendingDebtOrder = null;
  let pendingStatusUpdateOrderId = null; // Track order ID for which status update was attempted

  function showError(msg) {
    errorArea.innerHTML = msg ? `<p class="toast toast-error">${msg}</p>` : '';
  }

  function clearError() {
    errorArea.innerHTML = '';
  }

  function formatCurrency(amount) {
    const numeric = Number(amount || 0);
    if (!Number.isFinite(numeric)) return '₪0';
    const fixed = numeric.toFixed(1);
    return `₪${fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed}`;
  }

  /** المجموع النهائي المطلوب للدفع (كاش/بنكي) دائماً ceil */
  function ceilTotal(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.ceil(n * 10) / 10;
  }

  function getPaymentLabel(method) {
    const map = { cash: 'نقداً', bank_app: 'تطبيق بنكي', debt: 'دين' };
    return map[method] || '—';
  }

  /** تنسيق التاريخ للفاتورة: DD-MM-YYYY */
  function formatReceiptDate(d) {
    if (!d) d = new Date();
    const date = d instanceof Date ? d : new Date(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /** تنسيق الوقت للفاتورة: HH:MM AM/PM */
  function formatReceiptTime(d) {
    if (!d) d = new Date();
    const date = d instanceof Date ? d : new Date(d);
    const h = date.getHours();
    const m = date.getMinutes();
    const am = h < 12;
    const h12 = h % 12 || 12;
    const mm = String(m).padStart(2, '0');
    return `${h12}:${mm} ${am ? 'AM' : 'PM'}`;
  }

  function escapeHtmlReceipt(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /** بناء HTML الفاتورة الحرارية. customerName اختياري - يظهر على الفاتورة فقط إن وُجد. */
  function buildReceiptHtml(order, paymentMethod, cashierName, customerName) {
    const receiptNum = String(order.order_number || 0).padStart(6, '0');
    const orderDate = order.created_at ? formatReceiptDate(order.created_at) : formatReceiptDate(new Date());
    const orderTime = order.created_at ? formatReceiptTime(order.created_at) : formatReceiptTime(new Date());
    const paymentLabel = paymentMethod === 'debt' ? 'دين' : paymentMethod === 'bank_app' ? 'بنكي' : paymentMethod === 'cash' ? 'نقدي' : paymentMethod || '—';
    const subtotal = Number(order.subtotal) || 0;
    const discountAmount = Number(order.discount_amount) || 0;
    const discountPercent = subtotal > 0 ? String(Math.ceil((discountAmount / subtotal) * 100)) : '0';
    const total = Number(order.total) || 0;
    const fmt = (v) => String(Math.ceil(Number(v) || 0));
    const customerNameTrimmed = (typeof customerName === 'string' && customerName.trim()) ? customerName.trim() : '';

    const cashierDisplay = (typeof cashierName === 'string' && cashierName.trim()) ? cashierName.trim() : '—';

    return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة ${receiptNum}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; margin: 0; padding: 0; }
    html { height: auto; min-height: 0; overflow-x: hidden; direction: rtl; }
    body { font-family: 'Courier New', Consolas, monospace, Tahoma, Arial; font-size: 12px; line-height: 1.25; color: #000; height: auto; min-height: 0; overflow-x: hidden; direction: rtl; overflow-wrap: break-word; word-break: break-word; }
    .receipt { width: 240px; max-width: 240px; margin: 0 auto; padding: 6px 10px; box-sizing: border-box; direction: rtl; overflow-wrap: break-word; word-break: break-word; }
    .header { margin-bottom: 4px; }
    .header-title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 3px; line-height: 1.2; }
    .header-meta { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 4px; font-size: 11px; line-height: 1.3; }
    .meta-datetime { text-align: right; flex: 0 0 auto; min-width: 0; }
    .meta-invoice { text-align: center; flex: 0 0 auto; min-width: 0; font-size: 11px; }
    .meta-invoice .invoice-num { font-size: 18px; font-weight: bold; }
    .meta-cashier { text-align: left; flex: 0 0 auto; min-width: 0; }
    .sep { border-top: 1px solid #000; margin: 3px 0; }
    .sep-double { border-top: 2px double #000; margin: 3px 0; }
    .items-head { display: flex; flex-direction: row; font-size: 12px; font-weight: bold; padding: 2px 0; border-bottom: 1px solid #000; }
    .items-head .col-name { flex: 2; text-align: right; min-width: 0; }
    .items-head .col-qty { flex: 0 0 40px; text-align: center; white-space: nowrap; }
    .items-head .col-price { flex: 0 0 52px; text-align: center; }
    .items-head .col-total { flex: 0 0 52px; text-align: left; }
    .item-row { display: flex; flex-direction: row; font-size: 14px; font-weight: bold; padding: 2px 0; border-bottom: 1px dotted #999; }
    .item-row .col-name { flex: 2; text-align: right; min-width: 0; overflow-wrap: break-word; word-break: break-word; }
    .item-row .col-qty { flex: 0 0 40px; text-align: center; white-space: nowrap; }
    .item-row .col-price { flex: 0 0 52px; text-align: center; }
    .item-row .col-total { flex: 0 0 52px; text-align: left; }
    .summary { text-align: right; font-size: 12px; font-weight: normal; margin: 3px 0; line-height: 1.35; }
    .summary-line { margin: 1px 0; }
    .summary-line.customer-name-line { font-size: 14px; font-weight: bold; margin: 2px 0; }
    .final-total { text-align: center; font-size: 15px; font-weight: bold; margin: 4px 0; line-height: 1.2; }
    .footer { text-align: center; font-size: 10px; margin-top: 4px; line-height: 1.3; }
    .footer-thanks { margin-bottom: 2px; }
    .dev-footer { font-size: 9px; margin-top: 3px; margin-bottom: 0; padding-bottom: 0; display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 6px; }
    .dev-footer span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    @media print {
      @page { margin: 0; size: 70mm auto; }
      html, body { width: 100%; margin: 0; padding: 0; overflow: hidden; height: auto; min-height: 0; }
      .receipt { width: 240px; max-width: 240px; margin: 0 auto; padding: 6px 10px; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <header class="header">
      <div class="header-title">شاورما باسل</div>
      <div class="header-meta">
        <div class="meta-datetime">التاريخ: ${orderDate}<br>الوقت: ${orderTime}</div>
        <div class="meta-invoice">رقم الفاتورة: <span class="invoice-num">${receiptNum}</span></div>
        <div class="meta-cashier">الكاشير: ${escapeHtmlReceipt(cashierDisplay)}</div>
      </div>
    </header>
    <div class="sep-double"></div>
    <div class="items-head">
      <span class="col-name">الصنف</span>
      <span class="col-qty">عدد</span>
      <span class="col-price">السعر</span>
      <span class="col-total">الإجمالي</span>
    </div>
    ${order.items && order.items.length ? order.items.map((item) => {
      const qty = Number(item.quantity) || 0;
      const up = Number(item.unit_price) || 0;
      const st = Number(item.subtotal) || 0;
      const name = (item.item_name || '').trim() || '—';
      return `<div class="item-row"><span class="col-name">${escapeHtmlReceipt(name)}</span><span class="col-qty">${qty}</span><span class="col-price">${fmt(up)}</span><span class="col-total">${fmt(st)}</span></div>`;
    }).join('') : ''}
    <div class="sep-double"></div>
    <div class="summary">
      <div class="summary-line">المجموع الفرعي: ${fmt(subtotal)}</div>
      <div class="summary-line">طريقة الدفع: ${paymentLabel}</div>
      <div class="summary-line">خصم ${discountPercent}%</div>
      ${customerNameTrimmed ? `<div class="summary-line customer-name-line">اسم الزبون: ${escapeHtmlReceipt(customerNameTrimmed)}</div>` : ''}
    </div>
    <div class="final-total">الإجمالي النهائي: ${fmt(total)} ₪</div>
    <div class="footer">
      <div class="footer-thanks">شكراً لزيارتكم شاورما باسل</div>
      <div>هاتف: 212547-0592</div>
    </div>
    <div class="sep"></div>
    <div class="dev-footer">
      <span>مبرمج النظام: خليل الحلبي</span>
      <span>0599243972</span>
    </div>
  </div>
</body>
</html>`;
  }

  /** طباعة فورية على الطابعة الرئيسية (نقدي / بنكي / دين). customerName اختياري للظهور على الفاتورة. */
  function printThermalReceipt(order, paymentMethod, cashierName, customerName) {
    if (!order) return Promise.resolve();
    const method = paymentMethod === 'cash' || paymentMethod === 'bank_app' || paymentMethod === 'debt' ? paymentMethod : 'cash';
    const html = buildReceiptHtml(order, method, cashierName, customerName);
    if (typeof window.api?.app?.printReceipt === 'function') {
      return window.api.app.printReceipt(html);
    }
    return new Promise((resolve) => {
      const win = window.open('', '_blank');
      if (!win) { resolve(); return; }
      win.document.write(html);
      win.document.close();
      let printed = false;
      const doPrint = () => {
        if (printed) return;
        printed = true;
        win.focus();
        win.print();
        setTimeout(() => { try { win.close(); } catch (_e) { /* ignore */ } resolve(); }, 400);
      };
      if (win.document.readyState === 'complete') doPrint();
      else win.onload = doPrint;
      setTimeout(doPrint, 600);
    });
  }

  function renderReceivedStatus(order) {
    const isReceived = !!order.order_is_received;
    orderStatusBadge.textContent = isReceived ? 'تم الاستلام' : 'غير مستلم';
    orderStatusBadge.classList.toggle('received', isReceived);
    orderStatusBadge.classList.toggle('pending', !isReceived);
    const hasItems = Array.isArray(order.items) && order.items.length > 0;
    btnMarkReceived.disabled = isReceived || !hasItems;
    btnCancelOrder.disabled = isReceived;
    btnApplyDiscount.disabled = isReceived || !hasItems;
  }

  async function loadMenuItems() {
    const result = await window.api.menu.getAll(activeCategory === 'all' ? null : activeCategory, true);
    if (!result.ok) {
      showError(result.error || 'فشل تحميل الأصناف.');
      return;
    }
    menuItems = result.items || [];
    renderMenuItems();
  }

  const CATEGORY_ICONS = {
    shawarma: '🌯',
    drinks: '🥤',
    extras: '🍟',
    default: '🍽️'
  };

  function getCategoryIcon(category) {
    const key = category && String(category).toLowerCase();
    return CATEGORY_ICONS[key] || CATEGORY_ICONS.default;
  }

  /** أيقونة الصنف من icon_path إن وُجد، وإلا حسب الفئة */
  function getItemIcon(item) {
    const icon = item && (item.icon_path || '').trim();
    if (icon) return icon;
    return getCategoryIcon(item?.category);
  }

  function renderItemIcon(item) {
    const icon = getItemIcon(item);
    return `<span class="category-icon" aria-hidden="true">${icon}</span>`;
  }

  function renderMenuItems() {
    const searchValue = menuSearch.value.trim().toLowerCase();
    const filtered = menuItems.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = !searchValue || item.name.toLowerCase().includes(searchValue);
      return matchesCategory && matchesSearch;
    });

    if (!filtered.length) {
      menuGrid.innerHTML = '<p class="placeholder-msg">لا توجد أصناف مطابقة.</p>';
      return;
    }

    menuGrid.innerHTML = filtered
      .map((item) => {
        const iconHtml = renderItemIcon(item);
        return `
          <div class="menu-card" data-id="${item.menu_item_id || item.item_id}">
            <div class="menu-card-icon category-icon-wrap">${iconHtml}</div>
            <div class="menu-card-name">${item.name}</div>
            <div class="menu-card-price">${formatCurrency(item.current_price || item.price)}</div>
          </div>
        `;
      })
      .join('');

    // Attach event listeners
    menuGrid.querySelectorAll('.menu-card').forEach((card) => {
      const menuItemId = card.dataset.id;
      if (!menuItemId) return;
      
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addItemToOrder(menuItemId);
      });
      card.style.cursor = 'pointer';
      card.style.pointerEvents = 'auto';
    });
  }

  async function createOrder() {
    const result = await window.api.order.create({});
    if (!result.ok) {
      showError(result.error || 'فشل إنشاء الطلب.');
      return;
    }
    currentOrder = result.order;
    // Ensure items array exists
    if (!currentOrder.items) {
      currentOrder.items = [];
    }
    orderHeader.textContent = `طلب #${currentOrder.order_number}`;
    
    // Immediately set button states for new empty order
    btnMarkReceived.disabled = true;
    btnApplyDiscount.disabled = true;
    btnCancelOrder.disabled = false;
    btnRemoveDiscount.disabled = true;
    
    // Update status badge
    orderStatusBadge.textContent = 'غير مستلم';
    orderStatusBadge.classList.remove('received');
    orderStatusBadge.classList.add('pending');
    
    await renderOrder();
  }

  async function addItemToOrder(menuItemId) {
    if (!currentOrder) {
      await createOrder();
      if (!currentOrder) {
        showError('يرجى إنشاء طلب أولاً.');
        return;
      }
    }
    const result = await window.api.order.addItem(currentOrder.order_id, menuItemId, 1);
    if (!result.ok) {
      showError(result.error || 'فشل إضافة العنصر.');
      return;
    }
    await renderOrder();
    flashAggregatedRow(menuItemId, orderItems);
    await loadRecentActivity();
  }

  async function removeItem(orderItemId) {
    if (!currentOrder) return;
    const result = await window.api.order.removeItem(orderItemId);
    if (!result.ok) {
      showError(result.error || 'فشل حذف العنصر.');
      return;
    }
    await renderOrder();
    await loadRecentActivity();
  }

  async function renderOrder() {
    const result = await window.api.order.getWithItems(currentOrder.order_id);
    if (!result.ok || !result.order) return;
    currentOrder = result.order;
    renderReceivedStatus(currentOrder);

    const hasItems = currentOrder.items && currentOrder.items.length > 0;
    if (!hasItems) {
      orderItems.innerHTML = '<p class="placeholder-msg">لا توجد عناصر.</p>';
    } else {
      orderItems.innerHTML = currentOrder.items
        .map((item) => {
          const highlightClass = item.quantity > 1 ? 'is-aggregated' : '';
          const iconHtml = renderItemIcon(item);
          const showDecrement = item.quantity > 1;
          return `
          <div class="order-item ${highlightClass}" data-menu-id="${item.menu_item_id}">
            <span class="order-item-icon category-icon-wrap">${iconHtml}</span>
            <span class="order-item-name">${item.item_name}</span>
            ${showDecrement ? `<button type="button" class="order-item-decrement" data-id="${item.order_item_id}" data-quantity="${item.quantity}" aria-label="إنقاص واحد"><span class="order-item-decrement-icon" aria-hidden="true"></span></button>` : ''}
            <span class="order-item-qty">×${item.quantity}</span>
            <span class="order-item-subtotal">${formatCurrency(item.subtotal)}</span>
            <button type="button" class="order-item-remove" data-id="${item.order_item_id}" aria-label="حذف">🗑️</button>
          </div>
        `;
        })
        .join('');
      orderItems.querySelectorAll('.order-item-decrement').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const qty = parseInt(btn.dataset.quantity, 10) || 0;
          const result = await window.api.order.updateItemQuantity(btn.dataset.id, qty - 1);
          if (result.ok) await renderOrder();
          else showError(result.error);
        });
      });
      orderItems.querySelectorAll('.order-item-remove').forEach((btn) => {
        btn.addEventListener('click', () => removeItem(btn.dataset.id));
      });
    }

    subtotalEl.textContent = formatCurrency(currentOrder.subtotal);
    discountEl.textContent = formatCurrency(currentOrder.discount_amount);
    finalTotalEl.textContent = formatCurrency(currentOrder.total);

    btnRemoveDiscount.disabled = !currentOrder.discount_amount;
  }

  function openDiscountModal(targetOrderId) {
    discountError.textContent = '';

    // Fix: If called by event listener directly, targetOrderId is an Event object.
    // We only want it if it's a valid ID string.
    const cleanOrderId = (typeof targetOrderId === 'string') ? targetOrderId : null;

    discountTargetOrderId =
      cleanOrderId ||
      (currentOrder && currentOrder.order_id) ||
      (currentTableOrder && currentTableOrder.order_id) ||
      null;

    discountModal.classList.remove('hidden');
  }

  function closeDiscountModal() {
    discountModal.classList.add('hidden');
  }

  async function applyDiscount(value) {
    discountError.textContent = '';
    if (!value || value <= 0) {
      discountError.textContent = 'يرجى اختيار قيمة صحيحة.';
      return;
    }
    if (!discountTargetOrderId) {
      discountError.textContent = 'لا يوجد طلب لتطبيق الخصم عليه.';
      return;
    }
    const result = await window.api.order.applyDiscount(
      discountTargetOrderId,
      'percent',
      value
    );
    if (!result.ok) {
      discountError.textContent = result.error || 'فشل تطبيق الخصم.';
      return;
    }
    closeDiscountModal();
    if (currentOrder && discountTargetOrderId === currentOrder.order_id) {
      await renderOrder();
      await loadRecentActivity();
    }
    if (currentTableOrder && discountTargetOrderId === currentTableOrder.order_id) {
      await renderTablesOrder();
    }
  }

  async function removeDiscount(targetOrderId) {
    // Fix: If called by event listener directly, targetOrderId is an Event object.
    const cleanOrderId = (typeof targetOrderId === 'string') ? targetOrderId : null;

    const orderId =
      cleanOrderId ||
      (currentOrder && currentOrder.order_id) ||
      (currentTableOrder && currentTableOrder.order_id);
    if (!orderId) return;
    const result = await window.api.order.removeDiscount(orderId);
    if (!result.ok) {
      showError(result.error || 'فشل إزالة الخصم.');
      return;
    }
    if (currentOrder && orderId === currentOrder.order_id) {
      await renderOrder();
      await loadRecentActivity();
    }
    if (currentTableOrder && orderId === currentTableOrder.order_id) {
      await renderTablesOrder();
    }
  }

  function openCancelModal() {
    cancelError.textContent = '';
    cancelReason.value = '';
    cancelModal.classList.remove('hidden');
  }

  function closeCancelModal() {
    cancelModal.classList.add('hidden');
  }

  async function confirmCancel() {
    cancelError.textContent = '';
    const result = await window.api.order.cancel(currentOrder.order_id, cancelReason.value.trim());
    if (!result.ok) {
      cancelError.textContent = result.error || 'فشل الإلغاء.';
      return;
    }
    closeCancelModal();
    
    // After cancel: reset UI state immediately
    currentOrder = null;
    
    // Immediately disable buttons
    btnMarkReceived.disabled = true;
    btnApplyDiscount.disabled = true;
    btnCancelOrder.disabled = true;
    btnRemoveDiscount.disabled = true;
    
    // Clear order display
    orderItems.innerHTML = '<p class="placeholder-msg">لا توجد عناصر.</p>';
    subtotalEl.textContent = formatCurrency(0);
    discountEl.textContent = formatCurrency(0);
    finalTotalEl.textContent = formatCurrency(0);
    orderStatusBadge.textContent = 'غير مستلم';
    orderStatusBadge.classList.remove('received');
    orderStatusBadge.classList.add('pending');
    
    await loadRecentActivity();
    await createOrder();
  }

  function openReceiveModal() {
    receiveError.textContent = '';
    receiptOrderNumber.textContent = currentOrder?.order_number || '—';
    receiptTotal.textContent = formatCurrency(currentOrder?.total);
    receiptDiscount.textContent = formatCurrency(currentOrder?.discount_amount);
    if (receiveCustomerName) receiveCustomerName.value = '';
    receiveModal.classList.remove('hidden');
  }

  function closeReceiveModal() {
    receiveModal.classList.add('hidden');
    receiveError.textContent = '';
    if (receiveCustomerName) receiveCustomerName.value = '';
    document.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
      input.checked = false;
    });
  }

  async function openDebtPaymentModal(order, isTables, options) {
    if (!order) return;
    const total = ceilTotal(Number(order.total || 0) || (order.items || []).reduce((s, i) => s + Number(i.subtotal || 0), 0));
    const orderAlreadyClosed = options && options.orderAlreadyClosed === true;
    pendingDebtOrder = { order, amount: total, isTables, orderAlreadyClosed };
    const maxShekels = typeof window.api?.app?.getMaxDebtShekels === 'function' ? await window.api.app.getMaxDebtShekels() : 3000;
    if (debtPaymentAmount) {
      debtPaymentAmount.value = String(total.toFixed(1));
      debtPaymentAmount.removeAttribute('readonly');
      debtPaymentAmount.setAttribute('max', String(maxShekels));
    }
    if (debtPaymentName) debtPaymentName.value = order.customer_name || '';
    if (debtPaymentPhone) debtPaymentPhone.value = order.customer_phone || '';
    if (debtPaymentNationalId) debtPaymentNationalId.value = '';
    if (debtPaymentError) debtPaymentError.textContent = '';
    if (debtPaymentMaxHint) debtPaymentMaxHint.textContent = `حد الدين الأقصى ${maxShekels} شيكل أو أقل.`;
    [debtPaymentName, debtPaymentPhone, debtPaymentNationalId, debtPaymentAmount].forEach((el) => {
      if (el) { el.disabled = false; el.readOnly = false; }
    });
    if (debtPaymentModal) {
      debtPaymentModal.classList.remove('hidden');
      debtPaymentModal.classList.add('modal-overlay--top');
      requestAnimationFrame(() => {
        const firstInput = debtPaymentName || debtPaymentModal.querySelector('input:not([type="hidden"]), button');
        if (firstInput) { firstInput.focus(); firstInput.select && firstInput.select(); }
      });
    }
  }

  function closeDebtPaymentModal() {
    pendingDebtOrder = null;
    if (debtPaymentModal) debtPaymentModal.classList.add('hidden');
  }

  async function confirmDebtPayment() {
    if (!pendingDebtOrder) return;
    const name = (debtPaymentName && debtPaymentName.value || '').trim();
    const phone = (debtPaymentPhone && debtPaymentPhone.value || '').trim();
    const nationalId = (debtPaymentNationalId && debtPaymentNationalId.value || '').trim();

    if (debtPaymentError) debtPaymentError.textContent = '';
    if (!name) {
      if (debtPaymentError) debtPaymentError.textContent = 'اسم الزبون مطلوب.';
      return;
    }
    if (!phone) {
      if (debtPaymentError) debtPaymentError.textContent = 'رقم الهاتف مطلوب.';
      return;
    }
    const amount = Number(debtPaymentAmount && debtPaymentAmount.value) || pendingDebtOrder.amount;
    if (!amount || amount <= 0) {
      if (debtPaymentError) debtPaymentError.textContent = 'قيمة الدين غير صالحة.';
      return;
    }
    const maxShekels = await window.api.app.getMaxDebtShekels();
    if (typeof maxShekels === 'number' && amount > maxShekels) {
      if (debtPaymentError) debtPaymentError.textContent = `تجاوز حد الدين. الحد الأقصى ${maxShekels} شيكل.`;
      return;
    }

    const debtResult = await window.api.customer.createDebtForOrder(
      name, phone, nationalId || null, amount, pendingDebtOrder.order.order_id
    );
    if (!debtResult.ok) {
      if (debtPaymentError) debtPaymentError.textContent = debtResult.error || 'فشل إضافة الدين.';
      return;
    }

    const orderAlreadyClosed = pendingDebtOrder.orderAlreadyClosed === true;
    if (!orderAlreadyClosed) {
      const markResult = await window.api.order.markReceived(
        pendingDebtOrder.order.order_id,
        'debt'
      );
      if (!markResult.ok) {
        if (debtPaymentError) debtPaymentError.textContent = markResult.error || 'فشل تأكيد الاستلام.';
        return;
      }
    }

    const wasTables = pendingDebtOrder.isTables;
    closeDebtPaymentModal();
    if (wasTables) {
      closeTablesBillingModal();
      if (currentTableId) {
        await window.api.table.updateStatus(currentTableId, 'available');
        delete tableOrders[currentTableId];
        resetTableTimer(currentTableId);
      }
      currentTableOrder = null;
      currentTableId = null;
      if (tablesBtnDelivered) tablesBtnDelivered.disabled = true;
      if (tablesBtnBilling) tablesBtnBilling.disabled = true;
      if (tablesOrderItems) tablesOrderItems.innerHTML = '<p class="placeholder-msg">لا توجد عناصر.</p>';
      if (tablesFinalTotal) tablesFinalTotal.textContent = formatCurrency(0);
      if (tablesOrderStatusBadge) {
        tablesOrderStatusBadge.textContent = 'غير مستلم';
        tablesOrderStatusBadge.classList.remove('received');
        tablesOrderStatusBadge.classList.add('pending');
      }
      await loadRecentActivity();
      await loadTables();
      showTablesView();
      if (tablesModalError) tablesModalError.textContent = '';
    } else {
      closeReceiveModal();
      currentOrder = null;
      btnMarkReceived.disabled = true;
      btnApplyDiscount.disabled = true;
      btnCancelOrder.disabled = true;
      btnRemoveDiscount.disabled = true;
      orderItems.innerHTML = '<p class="placeholder-msg">لا توجد عناصر.</p>';
      subtotalEl.textContent = formatCurrency(0);
      discountEl.textContent = formatCurrency(0);
      finalTotalEl.textContent = formatCurrency(0);
      orderStatusBadge.textContent = 'غير مستلم';
      orderStatusBadge.classList.remove('received');
      orderStatusBadge.classList.add('pending');
      await loadRecentActivity();
      await createOrder();
    }
  }

  async function confirmReceived() {
    receiveError.textContent = '';
    const selected = document.querySelector('input[name="paymentMethod"]:checked');
    if (!selected) {
      receiveError.textContent = 'يرجى اختيار طريقة الدفع.';
      return;
    }
    if (!currentOrder || !currentOrder.items || currentOrder.items.length === 0) {
      receiveError.textContent = 'لا يمكن تأكيد الاستلام بدون عناصر.';
      return;
    }
    const customerName = (receiveCustomerName && receiveCustomerName.value ? receiveCustomerName.value : '').trim();
    if (selected.value === 'debt') {
      const result = await window.api.order.markReceived(currentOrder.order_id, 'debt');
      if (!result.ok) {
        receiveError.textContent = result.error || 'فشل تأكيد الاستلام.';
        return;
      }
      const res = await window.api.order.getWithItems(currentOrder.order_id);
      if (!res.ok || !res.order) {
        receiveError.textContent = 'تعذر تحميل تفاصيل الطلب.';
        return;
      }
      closeReceiveModal();
      currentOrder = null;
      btnMarkReceived.disabled = true;
      btnApplyDiscount.disabled = true;
      btnCancelOrder.disabled = true;
      btnRemoveDiscount.disabled = true;
      orderItems.innerHTML = '<p class="placeholder-msg">لا توجد عناصر.</p>';
      subtotalEl.textContent = formatCurrency(0);
      discountEl.textContent = formatCurrency(0);
      finalTotalEl.textContent = formatCurrency(0);
      orderStatusBadge.textContent = 'غير مستلم';
      orderStatusBadge.classList.remove('received');
      orderStatusBadge.classList.add('pending');
      await printThermalReceipt(res.order, 'debt', session?.user?.username, customerName);
      await openDebtPaymentModal(res.order, false, { orderAlreadyClosed: true });
      return;
    }
    const result = await window.api.order.markReceived(currentOrder.order_id, selected.value);
    if (!result.ok) {
      receiveError.textContent = result.error || 'فشل تأكيد الاستلام.';
      return;
    }
    printThermalReceipt(currentOrder, selected.value, session?.user?.username, customerName);
    closeReceiveModal();
    
    // After successful payment: reset UI state immediately
    currentOrder = null;
    
    // Immediately disable buttons before creating new order
    btnMarkReceived.disabled = true;
    btnApplyDiscount.disabled = true;
    btnCancelOrder.disabled = true;
    btnRemoveDiscount.disabled = true;
    
    // Clear order display
    orderItems.innerHTML = '<p class="placeholder-msg">لا توجد عناصر.</p>';
    subtotalEl.textContent = formatCurrency(0);
    discountEl.textContent = formatCurrency(0);
    finalTotalEl.textContent = formatCurrency(0);
    orderStatusBadge.textContent = 'غير مستلم';
    orderStatusBadge.classList.remove('received');
    orderStatusBadge.classList.add('pending');
    
    await loadRecentActivity();
    await createOrder();
  }

  function attachActivityListeners(container) {
    if (!container) return;
    container.querySelectorAll('.activity-item').forEach((item) => {
      item.addEventListener('click', () => openActivityModal(item.dataset.id));
    });
  }

  async function loadRecentActivity() {
    const result = await window.api.audit.getRecentOrderEvents(4);
    const placeholderErr = '<p class="placeholder-msg">تعذر تحميل النشاط.</p>';
    const placeholderEmpty = '<p class="placeholder-msg">لا توجد نشاطات بعد.</p>';

    if (!result.ok) {
      if (activityList) activityList.innerHTML = placeholderErr;
      if (activityListTables) activityListTables.innerHTML = placeholderErr;
      return;
    }
    const events = result.events || [];
    if (!events.length) {
      if (activityList) activityList.innerHTML = placeholderEmpty;
      if (activityListTables) activityListTables.innerHTML = placeholderEmpty;
      return;
    }

    const html = events
      .map((event) => {
        const isTable = !!event.table_id;
        const payment = getPaymentLabel(event.payment_method);
        const timestamp = event.timestamp ? new Date(event.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : '';
        const saleDesc = isTable
          ? `بيع طاولة ${event.table_id} — طلب #${event.order_number || '—'} — ${formatCurrency(event.total)} — ${payment} — ${timestamp}`
          : `بيع طلب #${event.order_number || '—'} — ${formatCurrency(event.total)} — ${payment} — ${timestamp}`;
        return `
          <button type="button" class="activity-item" data-id="${event.entity_id}">
            <span class="activity-sale-desc">${saleDesc}</span>
          </button>
        `;
      })
      .join('');

    if (activityList) {
      activityList.innerHTML = html;
      attachActivityListeners(activityList);
    }
    if (activityListTables) {
      activityListTables.innerHTML = html;
      attachActivityListeners(activityListTables);
    }
  }

  async function openActivityModal(orderId) {
    const result = await window.api.order.getWithItems(orderId);
    if (!result.ok || !result.order) {
      showError('تعذر تحميل تفاصيل الطلب.');
      return;
    }
    const order = result.order;
    activityOrderNumber.textContent = order.order_number || '—';
    activityTotal.textContent = formatCurrency(order.total);
    activityReceived.textContent = order.order_is_received ? 'تم الاستلام' : 'غير مستلم';
    activityPayment.textContent = order.order_is_received ? getPaymentLabel(order.payment_method) : '—';

    if (!order.items || !order.items.length) {
      activityItems.innerHTML = '<p class="placeholder-msg">لا توجد عناصر.</p>';
    } else {
      activityItems.innerHTML = order.items
        .map((item) => `<div class="activity-item-row">${item.item_name} ×${item.quantity}</div>`)
        .join('');
    }

    activityModal.classList.remove('hidden');
  }

  function closeActivityModal() {
    activityModal.classList.add('hidden');
  }

  function showLogoutModal() {
    logoutModal.classList.remove('hidden');
    logoutConfirm.focus();
  }

  function hideLogoutModal() {
    logoutModal.classList.add('hidden');
  }

  async function doLogout() {
    hideLogoutModal();
    const sid = session?.sessionId;
    if (sid) {
      await window.api.auth.logout(sid);
    }
    await window.api.app.clearCurrentSession();
    await window.api.app.navigate('login');
  }

  function navigateTo(target) {
    const map = {
      dashboard: 'main',
      menu: 'menu',
      orders: 'pos',
      customers: 'customers',
      finance: 'finance',
      employees: 'employees',
      reports: 'reports',
      settings: 'settings',
      contact: 'contact'
    };
    if (target === 'settings' && window.SettingsGate) {
      window.SettingsGate.show();
      return;
    }
    window.api.app.navigate(map[target] || 'main');
  }

  async function init() {
    session = await window.api.auth.getCurrentSession();
    if (!session || !session.user || !session.sessionId) {
      await window.api.app.navigate('login');
      return;
    }
    userBadge.textContent = `👤 ${session.user.username}`;
    await loadMenuItems();
    await createOrder();
    await loadRecentActivity();
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      renderMenuItems();
    });
  });

  navItems.forEach((item) => {
    item.addEventListener('click', () => navigateTo(item.dataset.target));
  });

  menuSearch.addEventListener('input', renderMenuItems);
  newOrderBtn.addEventListener('click', createOrder);
  btnMarkReceived.addEventListener('click', openReceiveModal);
  btnApplyDiscount.addEventListener('click', () => openDiscountModal());
  btnRemoveDiscount.addEventListener('click', () => removeDiscount());
  btnCancelOrder.addEventListener('click', openCancelModal);
  discountCancel.addEventListener('click', closeDiscountModal);
  
  // Discount buttons listeners
  document.querySelectorAll('.btn-discount-select').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseFloat(btn.dataset.value);
      applyDiscount(val);
    });
  });
  cancelDismiss.addEventListener('click', closeCancelModal);
  cancelConfirm.addEventListener('click', confirmCancel);
  receiveCancel.addEventListener('click', closeReceiveModal);
  receiveConfirm.addEventListener('click', confirmReceived);
  activityClose.addEventListener('click', closeActivityModal);
  btnLogout.addEventListener('click', showLogoutModal);
  logoutCancel.addEventListener('click', hideLogoutModal);
  logoutConfirm.addEventListener('click', doLogout);

  // Tables Modal Functions
  async function loadTables() {
    if (!tablesGrid) return;
    const result = await window.api.table.getAll();
    if (!result.ok) {
      tablesGrid.innerHTML = '<p class="placeholder-msg">تعذر تحميل الطاولات.</p>';
      return;
    }
    const tables = result.tables || [];
    if (!tables.length) {
      tablesGrid.innerHTML = '<p class="placeholder-msg">لا توجد طاولات مفعّلة.</p>';
      return;
    }

    const cardsHtml = await Promise.all(
      tables.map(async (t) => {
        let statusLabel = 'غير نشطة';
        let statusClass = 'table-status-empty';
        let cardStateClass = 'table-card-inactive';

        const activeResult = await window.api.order.getActiveByTable(t.table_id);
        const activeOrder = activeResult.ok ? activeResult.order : null;
        if (activeOrder) {
          if (activeOrder.status === 'delivered' && !activeOrder.order_is_received) {
            statusLabel = 'بانتظار الدفع';
            statusClass = 'table-status-delivered';
            cardStateClass = 'table-card-delivered';
            // Stop timer when delivered
            stopTableTimer(t.table_id);
          } else if (!activeOrder.order_is_received) {
            statusLabel = 'طلبات نشطة';
            statusClass = 'table-status-active';
            cardStateClass = 'table-card-active';
            ensureTableTimerRunning(t.table_id, activeOrder);
          } else {
            // Paid: reset any previous timer
            resetTableTimer(t.table_id);
          }
          tableOrders[t.table_id] = activeOrder.order_id;
        } else {
          // Idle: clear any state
          resetTableTimer(t.table_id);
          delete tableOrders[t.table_id];
        }

        const showTimer = !!(activeOrder && !activeOrder.order_is_received && activeOrder.status !== 'delivered');
        const timerLabel = showTimer ? getTableTimerLabel(t.table_id) : '';

        return `
          <button type="button" class="table-card ${cardStateClass}" data-table-id="${t.table_id}">
            <div class="table-card-icon"></div>
            <div class="table-card-number">طاولة ${t.table_number}</div>
            ${showTimer ? `<div class="table-card-timer" data-table-id="${t.table_id}">${timerLabel}</div>` : ''}
            <div class="table-card-status ${statusClass}">${statusLabel}</div>
          </button>
        `;
      })
    );

    tablesGrid.innerHTML = cardsHtml.join('');

    tablesGrid.querySelectorAll('.table-card').forEach((card) => {
      card.addEventListener('click', () => {
        const tableId = parseInt(card.dataset.tableId, 10);
        if (!tableId) return;
        openTableForOrdering(tableId);
      });
    });

    startTableTimersLoop();
  }

  /**
   * Auto-update order status to 'pending' when user leaves order screen
   * Only updates if order has items and status is draft/null
   */
  async function autoUpdateOrderStatusOnExit() {
    if (!currentTableOrder || !currentTableOrder.order_id) {
      return;
    }

    const orderId = currentTableOrder.order_id;

    // Prevent duplicate updates
    if (pendingStatusUpdateOrderId === orderId) {
      return;
    }

    // Check conditions: order must have items and not be received/paid
    const hasItems = currentTableOrder.items && currentTableOrder.items.length > 0;
    const isReceived = !!currentTableOrder.order_is_received;
    const status = currentTableOrder.status;

    // Only update if:
    // - Order has items
    // - Order is not received/paid
    // - Status is null/draft (not 'delivered' or already 'pending')
    if (hasItems && !isReceived && status !== 'delivered' && status !== 'pending') {
      pendingStatusUpdateOrderId = orderId;
      
      try {
        const result = await window.api.order.updateStatusToPending(orderId);
        if (result.ok && result.updated) {
          console.log(`Order ${orderId} status auto-updated to pending`);
        }
      } catch (error) {
        console.error('Failed to auto-update order status:', error);
      } finally {
        // Reset flag after a delay to allow for retry if needed
        setTimeout(() => {
          if (pendingStatusUpdateOrderId === orderId) {
            pendingStatusUpdateOrderId = null;
          }
        }, 1000);
      }
    }
  }

  async function showTablesView() {
    // Auto-update order status before leaving
    await autoUpdateOrderStatusOnExit();
    
    // Update table status to 'occupied' if order exists and is not delivered/received
    if (currentTableOrder && currentTableOrder.order_id && currentTableId) {
      const hasItems = currentTableOrder.items && currentTableOrder.items.length > 0;
      const isReceived = !!currentTableOrder.order_is_received;
      const isDelivered = currentTableOrder.status === 'delivered';
      
      // Only update table status if order has items and is not received/delivered
      if (hasItems && !isReceived && !isDelivered) {
        try {
          await window.api.table.updateStatus(currentTableId, 'occupied');
        } catch (error) {
          console.error('Failed to update table status:', error);
        }
      }
    }
    
    if (tablesView) tablesView.classList.remove('hidden');
    if (tablesOrderView) {
      tablesOrderView.classList.add('hidden');
      tablesOrderView.setAttribute('aria-hidden', 'true');
    }
    currentTableOrder = null;
    currentTableId = null;
    // Do not clear timers here to preserve elapsed time until payment/reset
    
    // Reload tables to show updated status
    await loadTables();
  }

  function showTableOrderView() {
    if (tablesView) tablesView.classList.add('hidden');
    if (tablesOrderView) {
      tablesOrderView.classList.remove('hidden');
      tablesOrderView.removeAttribute('aria-hidden');
    }
  }

  async function openTableForOrdering(tableId) {
    currentTableId = tableId;
    if (tablesSelectedLabel) {
      tablesSelectedLabel.textContent = `طاولة #${tableId}`;
    }
    showTableOrderView();
    await loadTablesMenuItems();
    await switchTable(tableId);
  }

  async function openTablesModal() {
    await loadTables();
    await loadRecentActivity();
    showTablesView();
    tablesModal.classList.remove('hidden');
  }

  async function closeTablesModal() {
    // Auto-update order status before closing modal
    await autoUpdateOrderStatusOnExit();
    
    // Update table status to 'occupied' if order exists and is not delivered/received
    if (currentTableOrder && currentTableOrder.order_id && currentTableId) {
      const hasItems = currentTableOrder.items && currentTableOrder.items.length > 0;
      const isReceived = !!currentTableOrder.order_is_received;
      const isDelivered = currentTableOrder.status === 'delivered';
      
      // Only update table status if order has items and is not received/delivered
      if (hasItems && !isReceived && !isDelivered) {
        try {
          await window.api.table.updateStatus(currentTableId, 'occupied');
        } catch (error) {
          console.error('Failed to update table status:', error);
        }
      }
    }
    
    tablesModal.classList.add('hidden');
    currentTableOrder = null;
    currentTableId = null;
    pendingStatusUpdateOrderId = null; // Reset flag when modal closes
    stopTableTimersLoop();
  }

  async function loadTablesMenuItems() {
    const result = await window.api.menu.getAll(tablesActiveCategory === 'all' ? null : tablesActiveCategory, true);
    if (!result.ok) {
      tablesModalError.textContent = result.error || 'فشل تحميل الأصناف.';
      return;
    }
    tablesMenuItems = result.items || [];
    renderTablesMenuItems();
  }

  function renderTablesMenuItems() {
    const searchValue = tablesMenuSearch?.value.trim().toLowerCase() || '';
    const filtered = tablesMenuItems.filter((item) => {
      const matchesCategory = tablesActiveCategory === 'all' || item.category === tablesActiveCategory;
      const matchesSearch = !searchValue || item.name.toLowerCase().includes(searchValue);
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      tablesMenuGrid.innerHTML = '<p class="placeholder-msg">لا توجد أصناف.</p>';
      return;
    }

    tablesMenuGrid.innerHTML = filtered
      .map((item) => {
        const itemId = item.menu_item_id || item.item_id;
        const iconHtml = renderItemIcon(item);
        return `
          <div class="menu-card" data-id="${itemId}">
            <div class="menu-card-icon category-icon-wrap">${iconHtml}</div>
            <div class="menu-card-name">${item.name}</div>
            <div class="menu-card-price">${formatCurrency(item.current_price || item.price)}</div>
          </div>
        `;
      })
      .join('');

    tablesMenuGrid.querySelectorAll('.menu-card').forEach((card) => {
      card.addEventListener('click', () => {
        const menuItemId = card.dataset.id;
        addItemToTableOrder(menuItemId);
      });
      card.style.cursor = 'pointer';
      card.style.pointerEvents = 'auto';
    });
  }

  async function switchTable(tableId) {
    // Reset status update flag when switching tables
    pendingStatusUpdateOrderId = null;
    
    currentTableId = parseInt(tableId);
    if (!currentTableId) {
      currentTableOrder = null;
      renderTablesOrder();
      return;
    }

    // Check if there's an existing order for this table via backend
    const activeResult = await window.api.order.getActiveByTable(currentTableId);
    if (activeResult.ok && activeResult.order) {
      currentTableOrder = activeResult.order;
      tableOrders[currentTableId] = currentTableOrder.order_id;
      await renderTablesOrder();
      return;
    }

    // Create new order for this table
    await createTableOrder();
  }

  async function createTableOrder() {
    if (!currentTableId) return;
    const result = await window.api.order.create({ tableId: currentTableId });
    if (!result.ok) {
      tablesModalError.textContent = result.error || 'فشل إنشاء الطلب.';
      return;
    }
    currentTableOrder = result.order;
    // Ensure items array exists
    if (!currentTableOrder.items) {
      currentTableOrder.items = [];
    }
    tableOrders[currentTableId] = currentTableOrder.order_id;
    await window.api.table.updateStatus(currentTableId, 'occupied');
    
    // Immediately disable buttons for new empty table order
    if (tablesBtnDelivered) {
      tablesBtnDelivered.disabled = true;
      tablesBtnDelivered.classList.add('btn-disabled');
    }
    if (tablesBtnDiscount) {
      tablesBtnDiscount.disabled = true;
      tablesBtnDiscount.classList.add('btn-disabled');
    }
    if (tablesBtnRemoveDiscount) {
      tablesBtnRemoveDiscount.disabled = true;
      tablesBtnRemoveDiscount.classList.add('btn-disabled');
    }
    if (tablesBtnBilling) {
      tablesBtnBilling.disabled = true;
      tablesBtnBilling.classList.add('btn-disabled');
    }
    
    await renderTablesOrder();
  }

  async function addItemToTableOrder(menuItemId) {
    if (!currentTableId) {
      tablesModalError.textContent = 'يرجى اختيار طاولة أولاً.';
      return;
    }
    if (!currentTableOrder) {
      await createTableOrder();
      if (!currentTableOrder) return;
    }
    const result = await window.api.order.addItem(currentTableOrder.order_id, menuItemId, 1);
    if (!result.ok) {
      tablesModalError.textContent = result.error || 'فشل إضافة العنصر.';
      return;
    }
    await renderTablesOrder();
    flashAggregatedRow(menuItemId, tablesOrderItems);
    tablesModalError.textContent = '';
  }

  async function renderTablesOrder() {
    if (!tablesOrderItems || !tablesOrderHeader || !tablesOrderStatusBadge) return;
    
    if (!currentTableOrder) {
      tablesOrderItems.innerHTML = '<p class="placeholder-msg">لا توجد عناصر.</p>';
      tablesOrderHeader.textContent = 'طلب جديد - طاولة';
      tablesOrderStatusBadge.textContent = 'غير مستلم';
      tablesOrderStatusBadge.classList.remove('received');
      tablesOrderStatusBadge.classList.add('pending');
      if (tablesSubtotal) tablesSubtotal.textContent = formatCurrency(0);
      if (tablesDiscountAmount) tablesDiscountAmount.textContent = formatCurrency(0);
      if (tablesFinalTotal) tablesFinalTotal.textContent = formatCurrency(0);
      // Force disable buttons when no order
      if (tablesBtnDelivered) {
        tablesBtnDelivered.disabled = true;
        tablesBtnDelivered.classList.add('btn-disabled');
      }
      if (tablesBtnDiscount) {
        tablesBtnDiscount.disabled = true;
        tablesBtnDiscount.classList.add('btn-disabled');
      }
      if (tablesBtnRemoveDiscount) {
        tablesBtnRemoveDiscount.disabled = true;
        tablesBtnRemoveDiscount.classList.add('btn-disabled');
      }
      if (tablesBtnBilling) {
        tablesBtnBilling.disabled = true;
        tablesBtnBilling.classList.add('btn-disabled');
      }
      return;
    }

    const result = await window.api.order.getWithItems(currentTableOrder.order_id);
    if (!result.ok || !result.order) {
      return;
    }
    currentTableOrder = result.order;

    const tableResult = await window.api.table.get(currentTableId);
    const table = (tableResult?.ok && tableResult?.table) ? tableResult.table : {};
    tablesOrderHeader.textContent = `طلب #${currentTableOrder.order_number} - طاولة ${table?.table_number || currentTableId}`;
    
    const isReceived = !!currentTableOrder.order_is_received;
    const isDeliveredOnly = !isReceived && currentTableOrder.status === 'delivered';
    if (isReceived) {
      tablesOrderStatusBadge.textContent = 'تم الاستلام';
      tablesOrderStatusBadge.classList.add('received');
      tablesOrderStatusBadge.classList.remove('pending');
    } else if (isDeliveredOnly) {
      tablesOrderStatusBadge.textContent = 'تم التسليم (بانتظار الدفع)';
      tablesOrderStatusBadge.classList.remove('received');
      tablesOrderStatusBadge.classList.add('pending');
    } else {
      tablesOrderStatusBadge.textContent = 'غير مستلم';
      tablesOrderStatusBadge.classList.remove('received');
      tablesOrderStatusBadge.classList.add('pending');
    }

    const hasItems = currentTableOrder.items && currentTableOrder.items.length > 0;
    if (!hasItems) {
      tablesOrderItems.innerHTML = '<p class="placeholder-msg">لا توجد عناصر.</p>';
    } else {
      tablesOrderItems.innerHTML = currentTableOrder.items
        .map((item) => {
          const highlightClass = item.quantity > 1 ? 'is-aggregated' : '';
          const iconHtml = renderItemIcon(item);
          const showDecrement = item.quantity > 1;
          return `
            <div class="order-item ${highlightClass}" data-menu-id="${item.menu_item_id}">
              <span class="order-item-icon category-icon-wrap">${iconHtml}</span>
              <span class="order-item-name">${item.item_name}</span>
              ${showDecrement ? `<button type="button" class="order-item-decrement" data-id="${item.order_item_id}" data-quantity="${item.quantity}" aria-label="إنقاص واحد"><span class="order-item-decrement-icon" aria-hidden="true"></span></button>` : ''}
              <span class="order-item-qty">×${item.quantity}</span>
              <span class="order-item-subtotal">${formatCurrency(item.subtotal)}</span>
              <button type="button" class="order-item-remove" data-id="${item.order_item_id}" aria-label="حذف">🗑️</button>
            </div>
          `;
        })
        .join('');

      tablesOrderItems.querySelectorAll('.order-item-decrement').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const qty = parseInt(btn.dataset.quantity, 10) || 0;
          const result = await window.api.order.updateItemQuantity(btn.dataset.id, qty - 1);
          if (result.ok) await renderTablesOrder();
          else if (tablesModalError) tablesModalError.textContent = result.error || '';
        });
      });
      tablesOrderItems.querySelectorAll('.order-item-remove').forEach((btn) => {
        btn.addEventListener('click', async () => {
          await window.api.order.removeItem(btn.dataset.id);
          await renderTablesOrder();
        });
      });
    }

    // Use existing order totals; fall back to sum of items if needed
    let subtotal = Number(currentTableOrder.subtotal || 0);
    let discountAmount = Number(currentTableOrder.discount_amount || 0);
    let total = Number(currentTableOrder.total || 0);
    if ((!subtotal || subtotal <= 0) && hasItems) {
      subtotal = currentTableOrder.items.reduce(
        (sum, item) => sum + Number(item.subtotal || 0),
        0
      );
    }
    if ((!total || total <= 0) && hasItems) {
      total = ceilTotal(subtotal - discountAmount);
    } else if (total > 0) {
      total = ceilTotal(total);
    }

    if (tablesSubtotal) tablesSubtotal.textContent = formatCurrency(subtotal);
    if (tablesDiscountAmount) tablesDiscountAmount.textContent = formatCurrency(discountAmount);
    if (tablesFinalTotal) tablesFinalTotal.textContent = formatCurrency(total);

    // Button state rules
    if (tablesBtnDelivered) {
      tablesBtnDelivered.disabled = !hasItems || isReceived || isDeliveredOnly;
      tablesBtnDelivered.classList.toggle('btn-disabled', tablesBtnDelivered.disabled);
    }
    if (tablesBtnDiscount) {
      const discountDisabled = !hasItems || !isDeliveredOnly || isReceived;
      tablesBtnDiscount.disabled = discountDisabled;
      tablesBtnDiscount.classList.toggle('btn-disabled', discountDisabled);
    }
    if (tablesBtnRemoveDiscount) {
      const removeDisabled = !hasItems || !isDeliveredOnly || isReceived || !discountAmount;
      tablesBtnRemoveDiscount.disabled = removeDisabled;
      tablesBtnRemoveDiscount.classList.toggle('btn-disabled', removeDisabled);
    }
    if (tablesBtnBilling) {
      const billingDisabled = !hasItems || !isDeliveredOnly || isReceived;
      tablesBtnBilling.disabled = billingDisabled;
      tablesBtnBilling.classList.toggle('btn-disabled', billingDisabled);
    }
  }

  async function markTableOrderDelivered() {
    if (!currentTableOrder) return;
    if (!currentTableOrder.items || currentTableOrder.items.length === 0) {
      tablesModalError.textContent = 'لا يمكن تأكيد التسليم بدون عناصر.';
      return;
    }
    tablesModalError.textContent = '';
    tablesBtnDelivered.disabled = true;
    tablesBtnDelivered.classList.add('btn-disabled');
    tablesBtnBilling.disabled = false;
    tablesBtnBilling.classList.remove('btn-disabled');

    const result = await window.api.order.markDelivered(currentTableOrder.order_id);
    if (result.ok) {
      // Reset status update flag since order is now delivered
      if (pendingStatusUpdateOrderId === currentTableOrder.order_id) {
        pendingStatusUpdateOrderId = null;
      }
      await renderTablesOrder();
      stopTableTimer(currentTableId);
      await loadTables();
    } else {
      tablesModalError.textContent = result.error || 'فشل تأكيد التسليم.';
      await renderTablesOrder();
    }
  }

  async function openTablesBillingModal() {
    if (!currentTableOrder) {
      if (tablesModalError) tablesModalError.textContent = 'لا يوجد طلب للمحاسبة.';
      return;
    }
    if (!currentTableOrder.items || currentTableOrder.items.length === 0) {
      if (tablesModalError) tablesModalError.textContent = 'لا يمكن المحاسبة بدون عناصر.';
      return;
    }
    const result = await window.api.order.getWithItems(currentTableOrder.order_id);
    if (result.ok && result.order) {
      const orderNumberEl = document.getElementById('tablesBillingOrderNumber');
      const totalEl = document.getElementById('tablesBillingTotal');
      const discountElModal = document.getElementById('tablesBillingDiscount');
      if (orderNumberEl) orderNumberEl.textContent = `#${result.order.order_number}`;
      if (totalEl) {
        const total = Number(result.order.total || 0);
        const fallback = result.order.items
          ? result.order.items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
          : 0;
        totalEl.textContent = formatCurrency(ceilTotal(total || fallback));
      }
      if (discountElModal) {
        discountElModal.textContent = formatCurrency(result.order.discount_amount || 0);
      }
      if (tablesBillingCustomerName) tablesBillingCustomerName.value = '';
      if (tablesBillingModal) tablesBillingModal.classList.remove('hidden');
    }
  }

  function closeTablesBillingModal() {
    tablesBillingModal.classList.add('hidden');
    if (tablesBillingCustomerName) tablesBillingCustomerName.value = '';
  }

  async function confirmTablesBilling() {
    const selected = document.querySelector('input[name="tablesPaymentMethod"]:checked');
    if (!selected) {
      document.getElementById('tablesBillingError').textContent = 'يرجى اختيار طريقة الدفع.';
      return;
    }
    const customerName = (tablesBillingCustomerName && tablesBillingCustomerName.value ? tablesBillingCustomerName.value : '').trim();
    if (selected.value === 'debt') {
      const result = await window.api.order.markReceived(currentTableOrder.order_id, 'debt');
      if (!result.ok) {
        document.getElementById('tablesBillingError').textContent = result.error || 'فشل المحاسبة.';
        return;
      }
      // Reset status update flag since order is now received
      if (pendingStatusUpdateOrderId === currentTableOrder.order_id) {
        pendingStatusUpdateOrderId = null;
      }
      const res = await window.api.order.getWithItems(currentTableOrder.order_id);
      if (!res.ok || !res.order) {
        document.getElementById('tablesBillingError').textContent = 'تعذر تحميل تفاصيل الطلب.';
        return;
      }
      const previousTableId = currentTableId;
      closeTablesBillingModal();
      await window.api.table.updateStatus(previousTableId, 'available');
      delete tableOrders[previousTableId];
      resetTableTimer(previousTableId);
      currentTableOrder = null;
      currentTableId = null;
      if (tablesBtnDelivered) tablesBtnDelivered.disabled = true;
      if (tablesBtnBilling) tablesBtnBilling.disabled = true;
      if (tablesOrderItems) tablesOrderItems.innerHTML = '<p class="placeholder-msg">لا توجد عناصر.</p>';
      if (tablesFinalTotal) tablesFinalTotal.textContent = formatCurrency(0);
      if (tablesOrderStatusBadge) {
        tablesOrderStatusBadge.textContent = 'غير مستلم';
        tablesOrderStatusBadge.classList.remove('received');
        tablesOrderStatusBadge.classList.add('pending');
      }
      await loadTables();
      showTablesView();
      document.getElementById('tablesBillingError').textContent = '';
      await printThermalReceipt(res.order, 'debt', session?.user?.username, customerName);
      await openDebtPaymentModal(res.order, true, { orderAlreadyClosed: true });
      return;
    }
    const previousTableId = currentTableId;
    const result = await window.api.order.markReceived(currentTableOrder.order_id, selected.value);
    if (!result.ok) {
      document.getElementById('tablesBillingError').textContent = result.error || 'فشل المحاسبة.';
      return;
    }
    // Reset status update flag since order is now received
    if (pendingStatusUpdateOrderId === currentTableOrder.order_id) {
      pendingStatusUpdateOrderId = null;
    }
    printThermalReceipt(currentTableOrder, selected.value, session?.user?.username, customerName);
    closeTablesBillingModal();
    await window.api.table.updateStatus(previousTableId, 'available');
    delete tableOrders[previousTableId];
    resetTableTimer(previousTableId);
    
    // Reset state completely
    currentTableOrder = null;
    currentTableId = null;
    
    // Immediately disable buttons and clear UI
    if (tablesBtnDelivered) tablesBtnDelivered.disabled = true;
    if (tablesBtnBilling) tablesBtnBilling.disabled = true;
    if (tablesOrderItems) tablesOrderItems.innerHTML = '<p class="placeholder-msg">لا توجد عناصر.</p>';
    if (tablesFinalTotal) tablesFinalTotal.textContent = formatCurrency(0);
    if (tablesOrderStatusBadge) {
      tablesOrderStatusBadge.textContent = 'غير مستلم';
      tablesOrderStatusBadge.classList.remove('received');
      tablesOrderStatusBadge.classList.add('pending');
    }
    
    await loadRecentActivity();
    await loadTables();
    showTablesView();
    tablesModalError.textContent = '';
  }

  async function cancelTableOrder() {
    if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;
    
    const previousTableId = currentTableId;
    
    // If we have an active order, cancel it
    if (currentTableOrder && currentTableOrder.order_id) {
      // Reset status update flag since order is being cancelled
      if (pendingStatusUpdateOrderId === currentTableOrder.order_id) {
        pendingStatusUpdateOrderId = null;
      }
      const result = await window.api.order.cancel(currentTableOrder.order_id, 'إلغاء من الطاولات');
      if (!result.ok) {
        tablesModalError.textContent = result.error || 'فشل إلغاء الطلب.';
        return;
      }
    }
    
    // Update table status to available
    if (previousTableId) {
      await window.api.table.updateStatus(previousTableId, 'available');
      delete tableOrders[previousTableId];
      resetTableTimer(previousTableId);
    }
    
    // Reset state completely
    currentTableOrder = null;
    currentTableId = null;
    
    // Immediately disable buttons and clear UI
    if (tablesBtnDelivered) {
      tablesBtnDelivered.disabled = true;
      tablesBtnDelivered.classList.add('btn-disabled');
    }
    if (tablesBtnDiscount) {
      tablesBtnDiscount.disabled = true;
      tablesBtnDiscount.classList.add('btn-disabled');
    }
    if (tablesBtnRemoveDiscount) {
      tablesBtnRemoveDiscount.disabled = true;
      tablesBtnRemoveDiscount.classList.add('btn-disabled');
    }
    if (tablesBtnBilling) {
      tablesBtnBilling.disabled = true;
      tablesBtnBilling.classList.add('btn-disabled');
    }
    if (tablesOrderItems) tablesOrderItems.innerHTML = '<p class="placeholder-msg">لا توجد عناصر.</p>';
    if (tablesSubtotal) tablesSubtotal.textContent = formatCurrency(0);
    if (tablesDiscountAmount) tablesDiscountAmount.textContent = formatCurrency(0);
    if (tablesFinalTotal) tablesFinalTotal.textContent = formatCurrency(0);
    if (tablesOrderStatusBadge) {
      tablesOrderStatusBadge.textContent = 'غير مستلم';
      tablesOrderStatusBadge.classList.remove('received');
      tablesOrderStatusBadge.classList.add('pending');
    }
    
    // Reload tables and go back to tables view
    await loadTables();
    showTablesView();
    tablesModalError.textContent = '';
  }

  // Tables Modal Event Listeners
  if (tablesBtn) tablesBtn.addEventListener('click', openTablesModal);
  if (tablesModalClose) tablesModalClose.addEventListener('click', closeTablesModal);
  if (tablesBackBtn) tablesBackBtn.addEventListener('click', showTablesView);
  if (tablesMenuSearch) tablesMenuSearch.addEventListener('input', renderTablesMenuItems);
  if (tablesBtnDelivered) tablesBtnDelivered.addEventListener('click', markTableOrderDelivered);
  if (tablesBtnDiscount) tablesBtnDiscount.addEventListener('click', () => openDiscountModal(currentTableOrder?.order_id));
  if (tablesBtnRemoveDiscount) tablesBtnRemoveDiscount.addEventListener('click', () => removeDiscount(currentTableOrder?.order_id));
  if (tablesBtnBilling) tablesBtnBilling.addEventListener('click', openTablesBillingModal);
  if (tablesBtnCancel) tablesBtnCancel.addEventListener('click', cancelTableOrder);
  if (tablesBillingCancel) tablesBillingCancel.addEventListener('click', closeTablesBillingModal);
  if (tablesBillingConfirm) tablesBillingConfirm.addEventListener('click', confirmTablesBilling);
  if (debtPaymentCancel) debtPaymentCancel.addEventListener('click', closeDebtPaymentModal);
  if (debtPaymentConfirm) debtPaymentConfirm.addEventListener('click', confirmDebtPayment);
  if (debtPaymentModal) {
    debtPaymentModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDebtPaymentModal();
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.key === 'Enter' && !e.target.matches('textarea') && e.target.closest('.modal-dialog')) {
        e.preventDefault();
        if (e.target.id === 'debtPaymentCancel') closeDebtPaymentModal();
        else confirmDebtPayment();
      }
    });
  }

  function flashAggregatedRow(menuItemId, container) {
    if (!container || !menuItemId) return;
    const row = container.querySelector(`.order-item[data-menu-id="${menuItemId}"]`);
    if (!row) return;
    row.classList.add('pulse');
    setTimeout(() => {
      row.classList.remove('pulse');
    }, 350);
  }

  function ensureTableTimerRunning(tableId, order) {
    if (!tableId || !order) return;
    const hasItems = Array.isArray(order.items) && order.items.length > 0;
    const isReceived = !!order.order_is_received;
    const isDeliveredOnly = !isReceived && order.status === 'delivered';
    if (!hasItems || isReceived || isDeliveredOnly) return;
    if (!tableTimers[tableId]) {
      tableTimers[tableId] = {
        startedAt: Date.now(),
        elapsedMs: 0,
        running: true,
      };
    } else if (!tableTimers[tableId].running) {
      // Resume timer if previously stopped but not paid yet
      tableTimers[tableId].startedAt = Date.now() - tableTimers[tableId].elapsedMs;
      tableTimers[tableId].running = true;
    }
  }

  function stopTableTimer(tableId) {
    const timer = tableTimers[tableId];
    if (!timer) return;
    if (timer.running) {
      timer.elapsedMs = Date.now() - timer.startedAt;
      timer.running = false;
    }
  }

  function resetTableTimer(tableId) {
    const timer = tableTimers[tableId];
    if (!timer) return;
    delete tableTimers[tableId];
    updateTableCardTimerDisplay(tableId, 0);
  }

  function getTableTimerLabel(tableId) {
    const timer = tableTimers[tableId];
    let elapsed = 0;
    if (timer) {
      elapsed = timer.running ? Date.now() - timer.startedAt : timer.elapsedMs || 0;
    }
    const totalSeconds = Math.max(0, Math.floor(elapsed / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function updateTableCardTimerDisplay(tableId, forcedMs) {
    if (!tablesGrid) return;
    const timerEl = tablesGrid.querySelector(`.table-card-timer[data-table-id="${tableId}"]`);
    if (!timerEl) return;
    if (typeof forcedMs === 'number') {
      const totalSeconds = Math.max(0, Math.floor(forcedMs / 1000));
      const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      timerEl.textContent = `${minutes}:${seconds}`;
    } else {
      timerEl.textContent = getTableTimerLabel(tableId);
    }
  }

  function startTableTimersLoop() {
    if (tableTimerInterval || !tablesGrid) return;
    tableTimerInterval = setInterval(() => {
      Object.keys(tableTimers).forEach((tableId) => {
        const idNum = parseInt(tableId, 10);
        const timer = tableTimers[idNum];
        if (!timer) return;
        updateTableCardTimerDisplay(idNum);
      });
    }, 1000);
  }

  function stopTableTimersLoop() {
    if (tableTimerInterval) {
      clearInterval(tableTimerInterval);
      tableTimerInterval = null;
    }
  }

  // Tables modal category filters
  if (tablesModal) {
    tablesModal.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        tablesModal.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        tablesActiveCategory = btn.dataset.category;
        renderTablesMenuItems();
      });
    });
  }

  init();
})();
