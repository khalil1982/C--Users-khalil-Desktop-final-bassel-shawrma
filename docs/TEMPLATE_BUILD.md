# Clean / Template Build (EXE Packaging)

**Strategy implemented: OPTION A (Template DB)**

## Overview

- A **template DB** (`assets/db/template.db`) holds schema, migrations, menu items, and purchase categories (expense_categories), with **zero** financial or personal data.
- On **first app launch** (no user DB exists), the app copies `template.db` into the user data directory and uses it. No schema/migrations run in that case.
- If no template exists (e.g. dev without running the build), the app falls back to creating a new DB and running schema + migrations + seeds as before.

## Data Removed in Template (DELETE only; no DROP)

- **Sales & orders:** `orders`, `order_items`, `order_status_history`, `payments`
- **Customers & debts:** `customers`, `debt_transactions`
- **Partners:** `partners`, `withdrawals`
- **Purchases (transactions):** `expenses` (categories kept)
- **Employees:** `employees`, `employee_salaries`, `employee_withdrawals`
- **Audit / financial:** `audit_log`, `app_sessions`, `account_balances`, `menu_item_price_history`

`account_balances` is cleared then re-seeded with `cash` and `bank_app` at 0.

## Data Kept

- **Users** (admin, system), **menu_items**, **expense_categories** (purchase categories), **tables** (restaurant tables), **migrations**.

## Before EXE Packaging

1. Run:
   ```bash
   npm run build:template-db
   ```
2. Ensure `assets/db/template.db` is **included** in your packaging (e.g. `electron-builder` / `electron-packager` extraResources or files so it ships next to the app).

## Verification Checklist

- [x] App launches with no orders
- [x] No debts / customers listed
- [x] No partner names
- [x] No employee names
- [x] No purchases history
- [x] Menu items visible
- [x] Purchase categories (expense categories) selectable
- [x] No runtime errors; EXE build starts clean for every new user when using template

## Safety

- No tables dropped; no migrations changed; no business logic modified.
- Only `DELETE` on the listed tables; schema and seeds (menu, categories) unchanged.
