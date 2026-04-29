# Phase 1 – User Analysis Summary
## Shawarma Basel POS – Electron Offline-First

---

## 1. User Personas

### 1.1 Admin (صاحب المطعم – Restaurant Owner)

| Attribute | Description |
|-----------|-------------|
| **Role** | Owner / manager. Oversees operations, finances, and staff. |
| **Usage** | Opens and closes shifts, approves cash differences, views reports, manages settings. |
| **Frequency** | Daily start/end; periodic check-ins during service. |
| **Tech level** | Variable. Prefers simple, reliable flows over advanced features. |
| **Goals** | Control, accuracy, visibility into sales and cash. |
| **Pain points** | Slow systems, unclear numbers, accidental logouts, complex menus. |

**Persona summary:** *"أحمد" (Ahmad) – Owns the restaurant. Needs to open the shift in the morning, check reports during the day, approve any cash differences, and close the shift at night. Wants everything fast and obvious.*

---

### 1.2 Cashier (الكاشير)

| Attribute | Description |
|-----------|-------------|
| **Role** | Front-line. Takes orders, rings sales, handles payments. |
| **Usage** | Login → work shift → register orders, maybe add expenses → logout. |
| **Frequency** | Full shift; high volume of taps and inputs. |
| **Tech level** | Basic. Relies on clear labels, big targets, minimal steps. |
| **Goals** | Speed, fewer taps, no confusion about what to press. |
| **Pain points** | Small buttons, unclear errors, slow response, accidental actions. |

**Persona summary:** *"سارة" (Sara) – Cashier during rush. Uses the POS constantly. Needs large touch targets, instant feedback, and no extra clicks. Must not lose an order or exit by mistake.*

---

## 2. Daily Workflow (High-Level, Non-Technical)

### 2.1 Morning (Admin)

1. **Open** – Turn on POS, see Login screen.
2. **Login** – Enter credentials, reach main interface.
3. **Open shift** – Start the day’s shift (concept only; no implementation).
4. **Hand over** – Cashier logs in when arriving.

### 2.2 During Service (Cashier)

1. **Login** – Enter credentials.
2. **Take orders** – Select category → items → confirm. Repeat.
3. **Handle payments** – Complete orders (concept only).
4. **Optional** – Log small expenses if allowed (concept only).

### 2.3 End of Day (Admin)

1. **Review** – Check sales, cash, differences (concept only).
2. **Approve** – Confirm any cash variances (concept only).
3. **Close shift** – End the shift (concept only).
4. **Logout** – Confirm logout, return to Login screen.

### 2.4 Logout (Any User)

1. **Tap logout** – Button in top bar.
2. **Confirm** – Dialog: “Are you sure?”
3. **Session ends** – Back to Login. App stays open.

---

## 3. Pain Points in Restaurant POS Usage

| Pain point | Impact | User |
|------------|--------|------|
| **Slow or laggy UI** | Queue backs up, stress, mistakes | Cashier, Admin |
| **Small touch targets** | Wrong taps, retries, frustration | Cashier |
| **Unclear errors** | User stuck, calls for help | Both |
| **Accidental logout** | Lost context, re-login during rush | Cashier |
| **No logout visible** | User leaves station without logging out | Both |
| **Cluttered layout** | Hard to find categories/actions | Cashier |
| **No confirmation for critical actions** | Regret (e.g. logout, close shift) | Both |
| **Poor contrast / tiny text** | Eye strain, errors in bright kitchen | Both |
| **Too many steps for common tasks** | Slower service, longer queues | Cashier |

---

## 4. UX Priorities for Speed and Clarity

### 4.1 Speed

| Priority | Rule |
|----------|------|
| **Minimal taps** | Essential actions in 1–2 taps. |
| **Enter = Submit** | Login and primary actions support Enter key. |
| **No unnecessary dialogs** | Only for destructive or critical actions (e.g. logout). |
| **Instant feedback** | Every tap shows immediate visual change (hover/active). |
| **Large touch targets** | Buttons and key controls ≥ 44px height. |

### 4.2 Clarity

| Priority | Rule |
|----------|------|
| **Clear labels** | Arabic labels; icons support, not replace, text where it matters. |
| **Obvious errors** | Error messages in plain Arabic, near the relevant field. |
| **Consistent layout** | Same structure across screens; top bar always same. |
| **Visible logout** | Logout always in top bar, same position. |
| **Recognition over recall** | Categories and actions visible; minimal hidden menus. |

### 4.3 Environment (Kiosk / Touch)

| Priority | Rule |
|----------|------|
| **Fullscreen, no OS UI** | No menu bar, no window chrome. Kiosk-like. |
| **Touch-first** | All main actions usable by touch. |
| **High contrast** | Warm colors, clear contrast for ambient light. |
| **No product photos** | Icons only; fast to load, clear at small size. |

---

## 5. Summary

- **Admin:** Manages shifts, finances, and settings; needs control and visibility.
- **Cashier:** Handles orders and payments; needs speed and simplicity.
- **Workflow:** Login → work (orders, payments, optional expenses) → logout. Admin adds open/close shift and approvals.
- **Pain points:** Slow UI, small targets, unclear errors, accidental logout, cluttered layout.
- **UX priorities:** Few taps, Enter to submit, instant feedback, large touch targets, clear errors, always-visible logout, RTL Arabic, fullscreen, touch-friendly.

---

**Document:** Phase 1 – User Analysis Summary  
**Version:** 1.0  
**Status:** Design only – no backend or business logic.
