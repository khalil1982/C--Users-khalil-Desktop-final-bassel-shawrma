/**
 * Sidebar UI Helper
 * Handles icon injection and sidebar consistency across pages.
 */
(function() {
  function initSidebar() {
    const navItems = document.querySelectorAll('.nav-item');
    if (!navItems.length) return;

    const iconMap = {
      'dashboard': 'layoutDashboard',
      'menu': 'table2',
      'orders': 'shoppingCart',
      'customers': 'receipt',
      'finance': 'trendingDown',
      'employees': 'users',
      'reports': 'fileText',
      'settings': 'settings',
      'contact': 'user'
    };

    const labelMap = {
      'customers': 'الديون'
    };

    navItems.forEach(item => {
      const target = item.dataset.target;
      if (!target) return;

      // Update Label if needed (Fix 1: Rename Customers to Debts)
      if (labelMap[target]) {
        item.textContent = labelMap[target];
      }

      // Inject Icon (Fix 2: Always show icons)
      const iconName = iconMap[target];
      if (iconName && window.ICONS && window.ICONS[iconName]) {
        const labelText = item.textContent.trim().replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u, '');
        const iconHtml = window.ICONS[iconName]({ size: 20, className: 'nav-icon' });
        item.innerHTML = `${iconHtml}<span class="nav-label">${labelText}</span>`;
      }
    });

    // Handle Dashboard Cards Icons
    const dashboardIcons = document.querySelectorAll('.dashboard-card .card-icon[data-icon]');
    dashboardIcons.forEach(iconEl => {
      const iconName = iconEl.dataset.icon;
      if (iconName && window.ICONS && window.ICONS[iconName]) {
        iconEl.innerHTML = window.ICONS[iconName]({ size: 32 });
      }
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
  } else {
    initSidebar();
  }
})();
