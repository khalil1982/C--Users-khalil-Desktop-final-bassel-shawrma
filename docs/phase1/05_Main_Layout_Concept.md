# Phase 1 – Main Interface Layout (Concept Only)
## Shawarma Basel POS – No Implementation

---

## 1. Main Layout Sketch

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  TOP BAR (fixed)                                                                         │
│  [Logo]  Shawarma Basel POS – نظام إدارة المطعم          👤 اسم المستخدم    [🚪 خروج]   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────┬─────────────────────────────┬───────────────────────┐  │
│  │                             │                             │                       │  │
│  │     CATEGORIES AREA         │     CURRENT ORDER AREA       │   SIDE SUMMARY       │  │
│  │     (أصناف)                 │     (الطلب الحالي)           │   (ملخص)             │  │
│  │                             │                             │                       │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐   │  Item 1        ₪25.00       │   Subtotal   ₪XXX     │  │
│  │  │ A   │ │ B   │ │ C   │   │  Item 2        ₪15.00       │   Tax        ₪X       │  │
│  │  └─────┘ └─────┘ └─────┘   │  ...                        │   ─────────────────   │  │
│  │                             │                             │   Total      ₪XXX     │  │
│  │  [Category tiles / list]    │  [Line items, qty, price]   │                       │  │
│  │  Icons only, no photos      │  [Edit remove buttons]      │   [Confirm] [Clear]   │  │
│  │                             │                             │   (concept only)      │  │
│  │  …                          │  …                          │   …                   │  │
│  │                             │                             │                       │  │
│  └─────────────────────────────┴─────────────────────────────┴───────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Zone Descriptions (Concept Only)

| Zone | Purpose | Notes |
|------|---------|-------|
| **Top bar** | Identity, user, logout | Logo, system name, username, logout. Fixed on all main screens. |
| **Categories** | Browse and select product categories | Icons only. Large touch targets. Primary focus area. |
| **Current order** | Review and edit items before confirming | Line items, qty, price. Add/remove (concept). |
| **Side summary** | Totals and primary actions | Subtotal, tax, total. Confirm / Clear (concept). |

---

## 3. Top Bar Requirements

| Element | Position (RTL) | Description |
|---------|----------------|-------------|
| Restaurant logo | Left | Same as Login; replaceable (concept). |
| System name | Next to logo | “Shawarma Basel POS” / “نظام إدارة المطعم”. |
| Username | Right side | Current logged-in user. |
| Logout | Right edge | Icon + “خروج”; always visible. |

---

## 4. Screen Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION (Kiosk)                          │
│                     Fullscreen, no OS UI                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────────┐
│   LOGIN SCREEN          │     │   MAIN INTERFACE                │
│   (unauthenticated)     │     │   (authenticated)               │
│                         │     │                                 │
│   • Logo                │     │   • Top bar (logo, name, user,  │
│   • System name         │     │     logout)                     │
│   • Username            │     │   • Categories area             │
│   • Password            │     │   • Current order area          │
│   • Login button        │     │   • Side summary                │
│   • Error area          │     │                                 │
└───────────┬─────────────┘     └──────────────┬──────────────────┘
            │                                  │
            │    Login success                 │  Logout (confirm)
            │    ───────────────►              │  ───────────────►
            │                                  │
            └──────────────────────────────────┘
```

---

## 5. Navigation Rules (Concept)

- **Login** → only path to Main Interface.
- **Logout** → from Main Interface, after confirmation, back to Login. App stays open.
- **No sidebar.** All primary content in the three main zones.
- **No multi-level menu.** Top bar + zones only in this phase.

---

## 6. Out of Scope (Phase 1)

- No shifts, orders, tables, payments, or reports.
- No real data or business logic.
- Layout and hierarchy are **conceptual** only.

---

**Deliverables:** Main layout sketch, screen hierarchy diagram  
**Phase:** 1 – Analysis & UI/UX Design only.
