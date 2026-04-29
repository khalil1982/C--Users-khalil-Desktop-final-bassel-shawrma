/**
 * SVG Icon Library - Lucide Icons
 * Phase C.4: Professional UI Polish
 *
 * Usage:
 *   import { ICONS } from './icons.js';
 *   element.innerHTML = ICONS.eye({ size: 20, color: 'currentColor' });
 */

/**
 * Creates an SVG icon element
 * @param {string} paths - SVG path data
 * @param {object} options - Icon options (size, color, strokeWidth, className)
 * @returns {string} SVG markup
 */
function createIcon(paths, options = {}) {
  const {
    size = 24,
    color = 'currentColor',
    strokeWidth = 2,
    className = '',
    fill = 'none'
  } = options;

  return `<svg
    width="${size}"
    height="${size}"
    viewBox="0 0 24 24"
    fill="${fill}"
    stroke="${color}"
    stroke-width="${strokeWidth}"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="icon ${className}"
    aria-hidden="true"
  >${paths}</svg>`;
}

/**
 * Icon Library - Based on Lucide Icons
 * Each function returns an SVG icon as an HTML string
 */
export const ICONS = {
  // Navigation & Layout
  layoutDashboard: (options) => createIcon(
    `<rect x="3" y="3" width="7" height="9" rx="1"/>
     <rect x="14" y="3" width="7" height="5" rx="1"/>
     <rect x="14" y="12" width="7" height="9" rx="1"/>
     <rect x="3" y="16" width="7" height="5" rx="1"/>`,
    options
  ),

  table2: (options) => createIcon(
    `<path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>`,
    options
  ),

  shoppingCart: (options) => createIcon(
    `<circle cx="8" cy="21" r="1"/>
     <circle cx="19" cy="21" r="1"/>
     <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.56-7.43a1 1 0 0 0-1-1.21h-14.48"/>`,
    options
  ),

  trendingDown: (options) => createIcon(
    `<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
     <polyline points="17 18 23 18 23 12"/>`,
    options
  ),

  users: (options) => createIcon(
    `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
     <circle cx="9" cy="7" r="4"/>
     <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
     <path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
    options
  ),

  // Authentication & User
  eye: (options) => createIcon(
    `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
     <circle cx="12" cy="12" r="3"/>`,
    options
  ),

  eyeOff: (options) => createIcon(
    `<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
     <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
     <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
     <line x1="2" x2="22" y1="2" y2="22"/>`,
    options
  ),

  logOut: (options) => createIcon(
    `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
     <polyline points="16 17 21 12 16 7"/>
     <line x1="21" x2="9" y1="12" y2="12"/>`,
    options
  ),

  user: (options) => createIcon(
    `<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
     <circle cx="12" cy="7" r="4"/>`,
    options
  ),

  // Order Types
  utensils: (options) => createIcon(
    `<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
     <path d="M7 2v20"/>
     <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>`,
    options
  ),

  shoppingBag: (options) => createIcon(
    `<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
     <path d="M3 6h18"/>
     <path d="M16 10a4 4 0 0 1-8 0"/>`,
    options
  ),

  truck: (options) => createIcon(
    `<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
     <path d="M15 18H9"/>
     <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
     <circle cx="17" cy="18" r="2"/>
     <circle cx="7" cy="18" r="2"/>`,
    options
  ),

  bike: (options) => createIcon(
    `<circle cx="18.5" cy="17.5" r="3.5"/>
     <circle cx="5.5" cy="17.5" r="3.5"/>
     <circle cx="15" cy="5" r="1"/>
     <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>`,
    options
  ),

  // Status & Feedback
  checkCircle: (options) => createIcon(
    `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
     <polyline points="22 4 12 14.01 9 11.01"/>`,
    options
  ),

  circle: (options) => createIcon(
    `<circle cx="12" cy="12" r="10"/>`,
    { ...options, fill: options?.fill || 'currentColor', stroke: options?.stroke || 'none' }
  ),

  alertTriangle: (options) => createIcon(
    `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
     <path d="M12 9v4"/>
     <path d="M12 17h.01"/>`,
    options
  ),

  alertCircle: (options) => createIcon(
    `<circle cx="12" cy="12" r="10"/>
     <line x1="12" x2="12" y1="8" y2="12"/>
     <line x1="12" x2="12.01" y1="16" y2="16"/>`,
    options
  ),

  check: (options) => createIcon(
    `<polyline points="20 6 9 17 4 12"/>`,
    options
  ),

  x: (options) => createIcon(
    `<path d="M18 6 6 18"/>
     <path d="m6 6 12 12"/>`,
    options
  ),

  info: (options) => createIcon(
    `<circle cx="12" cy="12" r="10"/>
     <path d="M12 16v-4"/>
     <path d="M12 8h.01"/>`,
    options
  ),

  // Actions
  plus: (options) => createIcon(
    `<path d="M5 12h14"/>
     <path d="M12 5v14"/>`,
    options
  ),

  edit: (options) => createIcon(
    `<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
     <path d="m15 5 4 4"/>`,
    options
  ),

  trash: (options) => createIcon(
    `<path d="M3 6h18"/>
     <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
     <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
     <line x1="10" x2="10" y1="11" y2="17"/>
     <line x1="14" x2="14" y1="11" y2="17"/>`,
    options
  ),

  save: (options) => createIcon(
    `<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
     <polyline points="17 21 17 13 7 13 7 21"/>
     <polyline points="7 3 7 8 15 8"/>`,
    options
  ),

  search: (options) => createIcon(
    `<circle cx="11" cy="11" r="8"/>
     <path d="m21 21-4.3-4.3"/>`,
    options
  ),

  filter: (options) => createIcon(
    `<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>`,
    options
  ),

  moreVertical: (options) => createIcon(
    `<circle cx="12" cy="12" r="1"/>
     <circle cx="12" cy="5" r="1"/>
     <circle cx="12" cy="19" r="1"/>`,
    options
  ),

  // Navigation
  arrowLeft: (options) => createIcon(
    `<path d="m12 19-7-7 7-7"/>
     <path d="M19 12H5"/>`,
    options
  ),

  arrowRight: (options) => createIcon(
    `<path d="M5 12h14"/>
     <path d="m12 5 7 7-7 7"/>`,
    options
  ),

  chevronDown: (options) => createIcon(
    `<path d="m6 9 6 6 6-6"/>`,
    options
  ),

  chevronUp: (options) => createIcon(
    `<path d="m18 15-6-6-6 6"/>`,
    options
  ),

  home: (options) => createIcon(
    `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
     <polyline points="9 22 9 12 15 12 15 22"/>`,
    options
  ),

  // Admin & Settings
  settings: (options) => createIcon(
    `<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
     <circle cx="12" cy="12" r="3"/>`,
    options
  ),

  fileText: (options) => createIcon(
    `<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
     <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
     <path d="M10 9H8"/>
     <path d="M16 13H8"/>
     <path d="M16 17H8"/>`,
    options
  ),

  dollarSign: (options) => createIcon(
    `<line x1="12" x2="12" y1="2" y2="22"/>
     <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
    options
  ),

  clock: (options) => createIcon(
    `<circle cx="12" cy="12" r="10"/>
     <polyline points="12 6 12 12 16 14"/>`,
    options
  ),

  calendar: (options) => createIcon(
    `<path d="M8 2v4"/>
     <path d="M16 2v4"/>
     <rect width="18" height="18" x="3" y="4" rx="2"/>
     <path d="M3 10h18"/>`,
    options
  ),

  download: (options) => createIcon(
    `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
     <polyline points="7 10 12 15 17 10"/>
     <line x1="12" x2="12" y1="15" y2="3"/>`,
    options
  ),

  upload: (options) => createIcon(
    `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
     <polyline points="17 8 12 3 7 8"/>
     <line x1="12" x2="12" y1="3" y2="15"/>`,
    options
  ),

  database: (options) => createIcon(
    `<ellipse cx="12" cy="5" rx="9" ry="3"/>
     <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
     <path d="M3 12A9 3 0 0 0 21 12"/>`,
    options
  ),

  // Products & Categories
  package: (options) => createIcon(
    `<path d="m7.5 4.27 9 5.15"/>
     <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
     <path d="m3.3 7 8.7 5 8.7-5"/>
     <path d="M12 22V12"/>`,
    options
  ),

  grid: (options) => createIcon(
    `<rect width="7" height="7" x="3" y="3" rx="1"/>
     <rect width="7" height="7" x="14" y="3" rx="1"/>
     <rect width="7" height="7" x="14" y="14" rx="1"/>
     <rect width="7" height="7" x="3" y="14" rx="1"/>`,
    options
  ),

  list: (options) => createIcon(
    `<line x1="8" x2="21" y1="6" y2="6"/>
     <line x1="8" x2="21" y1="12" y2="12"/>
     <line x1="8" x2="21" y1="18" y2="18"/>
     <line x1="3" x2="3.01" y1="6" y2="6"/>
     <line x1="3" x2="3.01" y1="12" y2="12"/>
     <line x1="3" x2="3.01" y1="18" y2="18"/>`,
    options
  ),

  // Tables & Layout
  table: (options) => createIcon(
    `<path d="M12 3v18"/>
     <rect width="18" height="18" x="3" y="3" rx="2"/>
     <path d="M3 9h18"/>
     <path d="M3 15h18"/>`,
    options
  ),

  // Printer
  printer: (options) => createIcon(
    `<polyline points="6 9 6 2 18 2 18 9"/>
     <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
     <rect width="12" height="8" x="6" y="14"/>`,
    options
  ),

  // Receipt
  receipt: (options) => createIcon(
    `<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z"/>
     <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
     <path d="M12 17.5v-11"/>`,
    options
  ),
};

// CSS for icons (add to shared.css or main.css)
export const ICON_CSS = `
.icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
}
`;

// Default export
export default ICONS;

// Global exposure for non-module scripts
if (typeof window !== 'undefined') {
  window.ICONS = ICONS;
}
