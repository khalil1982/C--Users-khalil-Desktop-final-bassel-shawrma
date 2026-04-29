/**
 * Initial Menu Data Seeder
 * Seeds the database with initial menu items
 *
 * Data from spec:
 * - Shawarma items (11 items)
 * - Drinks (4 items)
 */

const menuService = require('../../services/menu');
const { getDb } = require('../index');

/**
 * Initial menu data (from specification)
 */
const initialMenuData = {
  shawarma: [
    { name: 'بيتا', name_en: 'Pita', price: 15, icon: '🌯', sort: 1 },
    { name: 'عادي', name_en: 'Regular', price: 20, icon: '🥙', sort: 2 },
    { name: 'دبل عادي', name_en: 'Double Regular', price: 25, icon: '🌮', sort: 3 },
    { name: 'دبل دبل', name_en: 'Double Double', price: 30, icon: '🌮🌮', sort: 4 },
    { name: 'دبل لحمة', name_en: 'Double Meat', price: 30, icon: '🥩', sort: 5 },
    { name: 'صاروخ', name_en: 'Rocket', price: 35, icon: '🚀', sort: 6 },
    { name: 'سوري', name_en: 'Syrian', price: 35, icon: '🇸🇾', sort: 7 },
    { name: 'صفيحة', name_en: 'Safiha', price: 45, icon: '🫓', sort: 8 },
    { name: 'أساور جبنة', name_en: 'Cheese Bracelets', price: 45, icon: '🧀', sort: 9 },
    { name: 'ببجي', name_en: 'PUBG', price: 45, icon: '🎮', sort: 10 },
    { name: 'كيلو شاورما', name_en: 'Kilo Shawarma', price: 120, icon: '⚖️', sort: 11 }
  ],
  drinks: [
    { name: 'مشروب غازي صغير', name_en: 'Small Soda', price: null, icon: '🥤', sort: 1 },
    { name: 'مشروب غازي كبير', name_en: 'Large Soda', price: null, icon: '🥤', sort: 2 },
    { name: 'مياه', name_en: 'Water', price: null, icon: '💧', sort: 3 },
    { name: 'عصير', name_en: 'Juice', price: null, icon: '🧃', sort: 4 }
  ]
};

/**
 * Gets or creates system user for seeding
 * @returns {number} System user ID
 */
function getSystemUserId() {
  const db = getDb();

  const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
  stmt.bind(['system']);
  const hasUser = stmt.step();
  const user = hasUser ? stmt.getAsObject() : null;
  stmt.free();

  if (user) {
    return user.id;
  }

  // If no system user, use admin user
  const adminStmt = db.prepare('SELECT id FROM users WHERE username = ?');
  adminStmt.bind(['admin']);
  const hasAdmin = adminStmt.step();
  const admin = hasAdmin ? adminStmt.getAsObject() : null;
  adminStmt.free();

  if (admin) {
    return admin.id;
  }

  throw new Error('No system or admin user found. Cannot seed data.');
}

/**
 * Seeds initial menu items
 * @returns {Object} Result object with counts
 */
function seedInitialMenu() {
  console.log('🌱 Seeding initial menu items...');

  try {
    const systemUserId = getSystemUserId();
    let totalAdded = 0;
    let skipped = 0;

    // Seed Shawarma items
    console.log('  📋 Adding Shawarma items...');
    for (const item of initialMenuData.shawarma) {
      const result = menuService.createMenuItem({
        name: item.name,
        name_en: item.name_en,
        category: 'shawarma',
        price: item.price,
        icon_path: item.icon,
        sort_order: item.sort
      }, systemUserId);

      if (result.ok) {
        const displayPrice = item.price == null ? '—' : `${item.price} ₪`;
        console.log(`    ✅ Added: ${item.name} (${displayPrice})`);
        totalAdded++;
      } else {
        if (result.error.includes('موجود بالفعل')) {
          console.log(`    ⏭️  Skipped (exists): ${item.name}`);
          skipped++;
        } else {
          console.error(`    ❌ Error adding ${item.name}:`, result.error);
        }
      }
    }

    // Seed Drinks
    console.log('  🥤 Adding Drinks...');
    for (const item of initialMenuData.drinks) {
      const result = menuService.createMenuItem({
        name: item.name,
        name_en: item.name_en,
        category: 'drinks',
        price: item.price,
        icon_path: item.icon,
        sort_order: item.sort
      }, systemUserId);

      if (result.ok) {
        const displayPrice = item.price == null ? '—' : `${item.price} ₪`;
        console.log(`    ✅ Added: ${item.name} (${displayPrice})`);
        totalAdded++;
      } else {
        if (result.error.includes('موجود بالفعل')) {
          console.log(`    ⏭️  Skipped (exists): ${item.name}`);
          skipped++;
        } else {
          console.error(`    ❌ Error adding ${item.name}:`, result.error);
        }
      }
    }

    console.log('');
    console.log(`✅ Menu seeding completed!`);
    console.log(`   Added: ${totalAdded} items`);
    console.log(`   Skipped: ${skipped} items (already exist)`);

    return {
      ok: true,
      added: totalAdded,
      skipped: skipped,
      total: totalAdded + skipped
    };

  } catch (error) {
    console.error('❌ Error seeding menu:', error);
    return {
      ok: false,
      error: error.message
    };
  }
}

/**
 * Checks if menu items already exist
 * @returns {boolean} True if menu items exist
 */
function menuItemsExist() {
  const db = getDb();

  const stmt = db.prepare('SELECT COUNT(*) as count FROM menu_items');
  const hasResult = stmt.step();
  const result = hasResult ? stmt.getAsObject() : { count: 0 };
  stmt.free();

  return result.count > 0;
}

module.exports = {
  seedInitialMenu,
  menuItemsExist
};
