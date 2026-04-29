# Phase 1 – Logout UX Design
## Wireframe + Confirmation Flow

---

## 1. Logout Button Wireframe (Top Bar)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo]  Shawarma Basel POS        [Categories|Order|Summary content...]     │
│                                                                             │
│  ← RTL                                                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [🖼 Logo]  نظام إدارة المطعم – شاورما بازل     👤 أحمد    [🚪 خروج] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       ↑                ↑                              ↑            ↑        │
│   Restaurant      System name                 Logged-in user   Logout       │
│     logo                                                      (fixed)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Placement (RTL):**

- **Left:** Restaurant logo + system name.
- **Right:** Username (e.g. “أحمد”) + logout icon + “خروج” label.
- **Fixed:** Same position on all main screens.

---

## 2. Logout Confirmation Flow Diagram

```
                    ┌──────────────────┐
                    │  Main Interface  │
                    │  (logged in)     │
                    └────────┬─────────┘
                             │
                     User taps [خروج]
                             │
                             ▼
                    ┌──────────────────┐
                    │  Confirmation    │
                    │  Dialog          │
                    │  "هل أنت متأكد   │
                    │   من الخروج؟"    │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
       [إلغاء]                              [تأكيد الخروج]
              │                             │
              ▼                             ▼
     ┌──────────────────┐          ┌──────────────────┐
     │  Stay on Main    │          │  End session     │
     │  Interface       │          │  (app stays open)│
     │  (no change)     │          └────────┬─────────┘
     └──────────────────┘                   │
                                            ▼
                                   ┌──────────────────┐
                                   │  Login Screen    │
                                   │  (redirect)      │
                                   └──────────────────┘
```

---

## 3. Confirmation Dialog Wireframe

```
┌─────────────────────────────────────────────────────────┐
│                     ⚠ تأكيد الخروج                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│         هل أنت متأكد من الخروج من النظام؟               │
│                                                         │
│         ملاحظة: سيتم إنهاء الجلسة الحالية فقط.          │
│         التطبيق سيبقى مفتوحاً.                          │
│                                                         │
│              ┌─────────────┐    ┌─────────────────┐     │
│              │   إلغاء     │    │  تأكيد الخروج   │     │
│              └─────────────┘    └─────────────────┘     │
│                   (secondary)         (primary)         │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Logout UX Rules Summary

| Rule | Description |
|------|-------------|
| **Position** | Fixed in top bar; always visible. |
| **Content** | Logout icon + “خروج” + current username nearby. |
| **Confirmation** | Modal dialog before logout. |
| **On confirm** | End session only; app does not close. |
| **After logout** | Redirect to Login screen. |

---

**Deliverables:** Logout button wireframe, confirmation flow diagram, dialog wireframe  
**Phase:** 1 – Design only; no implementation.
