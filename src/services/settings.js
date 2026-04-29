const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DEFAULT_SETTINGS = {
  restaurantName: 'Shawarma Basel POS – نظام إدارة المطعم',
  currencySymbol: '₪',
  showCurrencySymbol: true,
  autoStart: true,
};

function getSettingsPath() {
  const userData = app.getPath('userData');
  const dataDir = path.join(userData, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, 'settings.json');
}

function getSettings() {
  const filePath = getSettingsPath();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function updateSettings(data) {
  const current = getSettings();
  const next = {
    ...current,
    restaurantName: (data?.restaurantName || current.restaurantName).trim(),
    currencySymbol: (data?.currencySymbol || current.currencySymbol).trim() || current.currencySymbol,
    showCurrencySymbol:
      data?.showCurrencySymbol === undefined ? current.showCurrencySymbol : !!data.showCurrencySymbol,
    autoStart: data?.autoStart === undefined ? current.autoStart : !!data.autoStart,
  };
  const filePath = getSettingsPath();
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2));
  return next;
}

module.exports = {
  getSettings,
  updateSettings,
};
