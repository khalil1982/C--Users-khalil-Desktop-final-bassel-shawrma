const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  error: {
    getMessage: (err) =>
      ipcRenderer.invoke('error:getMessage', { message: err?.message, error: err?.error ?? err }),
    report: (message, details) =>
      ipcRenderer.invoke('error:report', {
        message: typeof message === 'string' ? message : (message?.message || 'Unknown'),
        stack: message?.stack,
        context: details?.context,
      }),
  },
  auth: {
    login: (username, password) =>
      ipcRenderer.invoke('auth:login', { username, password }),
    logout: (sessionId) => ipcRenderer.invoke('auth:logout', { sessionId }),
    getCurrentSession: () => ipcRenderer.invoke('auth:getCurrentSession'),
    verifyAdmin: (username, password) =>
      ipcRenderer.invoke('auth:verifyAdmin', { username, password }),
    verifyManagerSecret: (password) =>
      ipcRenderer.invoke('auth:verifyManagerSecret', password),
    getUsers: () => ipcRenderer.invoke('auth:getUsers'),
    changeUserPassword: (targetUserId, adminPassword, newPassword) =>
      ipcRenderer.invoke('auth:changeUserPassword', { targetUserId, adminPassword, newPassword }),
  },
  app: {
    navigate: (page) => ipcRenderer.invoke('app:navigate', { page }),
    setCurrentSession: (session) =>
      ipcRenderer.invoke('app:setCurrentSession', session),
    clearCurrentSession: () => ipcRenderer.invoke('app:clearCurrentSession'),
    cleanForFreshUse: () => ipcRenderer.invoke('app:cleanForFreshUse'),
    printReceipt: (html) => ipcRenderer.invoke('app:printReceipt', { html }),
    getMaxDebtShekels: () => ipcRenderer.invoke('app:getMaxDebtShekels'),
  },
  order: {
    create: (data) => ipcRenderer.invoke('order:create', { data }),
    addItem: (orderId, menuItemId, quantity) =>
      ipcRenderer.invoke('order:addItem', { orderId, menuItemId, quantity }),
    removeItem: (orderItemId) => ipcRenderer.invoke('order:removeItem', { orderItemId }),
    updateItemQuantity: (orderItemId, newQuantity) =>
      ipcRenderer.invoke('order:updateItemQuantity', { orderItemId, newQuantity }),
    getWithItems: (orderId) => ipcRenderer.invoke('order:getWithItems', { orderId }),
    applyDiscount: (orderId, discountType, discountValue) =>
      ipcRenderer.invoke('order:applyDiscount', { orderId, discountType, discountValue }),
    removeDiscount: (orderId) => ipcRenderer.invoke('order:removeDiscount', { orderId }),
    markReceived: (orderId, paymentMethod) =>
      ipcRenderer.invoke('order:markReceived', { orderId, paymentMethod }),
    markDelivered: (orderId) =>
      ipcRenderer.invoke('order:markDelivered', { orderId }),
    getActiveByTable: (tableId) =>
      ipcRenderer.invoke('order:getActiveByTable', { tableId }),
    cancel: (orderId, reason) => ipcRenderer.invoke('order:cancel', { orderId, reason }),
  },
  report: {
    getSummary: (startDate, endDate) =>
      ipcRenderer.invoke('report:summary', { startDate, endDate }),
    getBestSelling: (startDate, endDate, limit) =>
      ipcRenderer.invoke('report:bestSelling', { startDate, endDate, limit }),
    getAppSessions: (startDate, endDate) =>
      ipcRenderer.invoke('report:appSessions', { startDate, endDate }),
    getFinancialSummary: (startDate, endDate) =>
      ipcRenderer.invoke('report:financialSummary', { startDate, endDate }),
    getDebts: (startDate, endDate) => ipcRenderer.invoke('report:debts', { startDate, endDate }),
    getDebtRepayments: (startDate, endDate) =>
      ipcRenderer.invoke('report:debtRepayments', { startDate, endDate }),
    getPurchasesBreakdown: (startDate, endDate) =>
      ipcRenderer.invoke('report:purchasesBreakdown', { startDate, endDate }),
    getTablesBreakdown: (startDate, endDate) =>
      ipcRenderer.invoke('report:tablesBreakdown', { startDate, endDate }),
    exportExcel: (startDate, endDate) =>
      ipcRenderer.invoke('report:exportExcel', { startDate, endDate }),
    exportEmployeeDetailsExcel: (employeeId, startDate, endDate) =>
      ipcRenderer.invoke('report:exportEmployeeDetailsExcel', { employeeId, startDate, endDate }),
  },
  expense: {
    createCategory: (name, nameEn) => ipcRenderer.invoke('expense:createCategory', { name, nameEn }),
    getCategories: () => ipcRenderer.invoke('expense:getCategories'),
    updateCategory: (categoryId, name, nameEn) =>
      ipcRenderer.invoke('expense:updateCategory', { categoryId, name, nameEn }),
    deleteCategory: (categoryId) => ipcRenderer.invoke('expense:deleteCategory', { categoryId }),
    create: (categoryId, amount, description, attachmentPath) =>
      ipcRenderer.invoke('expense:create', { categoryId, amount, description, attachmentPath }),
    getByDate: (businessDate) => ipcRenderer.invoke('expense:getByDate', { businessDate }),
  },
  cashier: {
    getMySummary: (from, to) => ipcRenderer.invoke('cashier:getMySummary', { from, to }),
    getAllSummaries: (from, to) => ipcRenderer.invoke('cashier:getAllSummaries', { from, to }),
  },
  menu: {
    getAll: (category, activeOnly) => ipcRenderer.invoke('menu:getAll', { category, activeOnly }),
    getById: (itemId) => ipcRenderer.invoke('menu:getById', { itemId }),
    create: (data) => ipcRenderer.invoke('menu:create', data),
    updatePrice: (itemId, newPrice, reason) =>
      ipcRenderer.invoke('menu:updatePrice', { itemId, newPrice, reason }),
    update: (itemId, updates) => ipcRenderer.invoke('menu:update', { itemId, updates }),
    toggleStatus: (itemId) => ipcRenderer.invoke('menu:toggleStatus', { itemId }),
    delete: (itemId) => ipcRenderer.invoke('menu:delete', { itemId }),
  },
  customer: {
    create: (data) => ipcRenderer.invoke('customer:create', data),
    createDebtForOrder: (name, phone, nationalId, amount, orderId) =>
      ipcRenderer.invoke('customer:createDebtForOrder', { name, phone, nationalId, amount, orderId }),
    recordDebt: (customerId, transactionType, amount, orderId, notes) =>
      ipcRenderer.invoke('customer:recordDebt', { customerId, transactionType, amount, orderId, notes }),
    createDebtByPhone: (data) => ipcRenderer.invoke('customer:createDebtByPhone', data),
    createDebt: (name, phone, nationalId, amount) =>
      ipcRenderer.invoke('customer:createDebt', { name, phone, nationalId, amount }),
    repayDebt: (customerId, amount, paymentMethod, notes) =>
      ipcRenderer.invoke('customer:repayDebt', { customerId, amount, paymentMethod, notes }),
    getDebtors: () => ipcRenderer.invoke('customer:getDebtors'),
    search: (query) => ipcRenderer.invoke('customer:search', { query }),
    getDetails: (customerId) => ipcRenderer.invoke('customer:getDetails', { customerId }),
  },
  partner: {
    create: (name) => ipcRenderer.invoke('partner:create', { name }),
    getAll: () => ipcRenderer.invoke('partner:getAll'),
  },
  withdrawal: {
    request: (partnerId, amount, notes, businessDate) =>
      ipcRenderer.invoke('withdrawal:request', { partnerId, amount, notes, businessDate }),
    updateStatus: (withdrawalId, status) =>
      ipcRenderer.invoke('withdrawal:updateStatus', { withdrawalId, status }),
    getReport: (startDate, endDate) =>
      ipcRenderer.invoke('withdrawal:getReport', { startDate, endDate }),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (data) => ipcRenderer.invoke('settings:update', data),
  },
  businessDate: {
    getCurrent: () => ipcRenderer.invoke('businessDate:getCurrent'),
  },
  session: {
    logStart: () => ipcRenderer.invoke('session:logStart'),
    logEnd: () => ipcRenderer.invoke('session:logEnd'),
    getByDate: (businessDate) => ipcRenderer.invoke('session:getByDate', { businessDate }),
  },
  audit: {
    getLog: (filters) => ipcRenderer.invoke('audit:getLog', filters),
    getStatistics: (businessDate) => ipcRenderer.invoke('audit:getStatistics', { businessDate }),
    getRecentOrderEvents: (limit) => ipcRenderer.invoke('audit:getRecentOrderEvents', { limit }),
  },
  table: {
    getAll: () => ipcRenderer.invoke('table:getAll'),
    get: (tableId) => ipcRenderer.invoke('table:get', { tableId }),
    updateStatus: (tableId, status) => ipcRenderer.invoke('table:updateStatus', { tableId, status }),
    create: (tableNumber) => ipcRenderer.invoke('table:create', { tableNumber }),
    updateCount: (count) => ipcRenderer.invoke('table:updateCount', { count }),
  },
  employee: {
    create: (data) => ipcRenderer.invoke('employee:create', data),
    update: (employeeId, updates) => ipcRenderer.invoke('employee:update', { employeeId, updates }),
    getAll: (opts) => ipcRenderer.invoke('employee:getAll', opts && typeof opts === 'object' ? opts : { activeOnly: opts }),
    get: (employeeId) => ipcRenderer.invoke('employee:get', { employeeId }),
    recordSalary: (data) => ipcRenderer.invoke('employee:recordSalary', data),
    getSalariesReport: (opts) => ipcRenderer.invoke('employee:getSalariesReport', opts && typeof opts === 'object' ? opts : {}),
    getMonthlyPayroll: (year, month) => ipcRenderer.invoke('employee:getMonthlyPayroll', { year, month }),
    recordWithdrawal: (data) => ipcRenderer.invoke('employee:recordWithdrawal', data),
    getFinancialDetails: (opts) => ipcRenderer.invoke('employee:getFinancialDetails', opts && typeof opts === 'object' ? opts : {}),
    getMonthlyWithdrawals: (employeeId, year, month) => ipcRenderer.invoke('employee:getMonthlyWithdrawals', { employeeId, year, month }),
  },
  backup: {
    exportBackup: () => ipcRenderer.invoke('backup:export'),
    importBackup: () => ipcRenderer.invoke('backup:import'),
  },
});
