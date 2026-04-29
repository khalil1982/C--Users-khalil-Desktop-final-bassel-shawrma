# Phase 1 – Login Screen Wireframe
## Shawarma Basel POS

---

## Wireframe (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FULLSCREEN – NO MENU BAR                             │
│                              (Kiosk Mode)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                                                             │
│                          ┌─────────────────────┐                            │
│                          │                     │                            │
│                          │   [Restaurant       │                            │
│                          │      Logo]          │                            │
│                          │                     │                            │
│                          └─────────────────────┘                            │
│                                                                             │
│                                                                             │
│                    Shawarma Basel POS – نظام إدارة المطعم                    │
│                                                                             │
│                                                                             │
│                         ┌─────────────────────────────┐                     │
│                         │  👤  اسم المستخدم           │                     │
│                         │                             │                     │
│                         └─────────────────────────────┘                     │
│                                                                             │
│                         ┌─────────────────────────────┐                     │
│                         │  🔒  كلمة المرور            │                     │
│                         │  ••••••••                   │                     │
│                         └─────────────────────────────┘                     │
│                                                                             │
│                              ┌─────────────────┐                            │
│                              │      دخول       │  ← Primary button          │
│                              └─────────────────┘                            │
│                                                                             │
│                         ┌─────────────────────────────┐                     │
│                         │ ⚠ رسالة خطأ (إن وجدت)      │  ← Error area        │
│                         └─────────────────────────────┘                     │
│                                                                             │
│                                                                             │
│                    (Enter key submits login)                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Element List

| # | Element | Type | Notes |
|---|---------|------|-------|
| 1 | Restaurant logo | Image | Top centre; replaceable (concept). |
| 2 | System name | Text | Arabic + “Shawarma Basel POS”; below logo. |
| 3 | Username field | Input | Placeholder: “اسم المستخدم”; icon optional. |
| 4 | Password field | Input (masked) | Placeholder: “كلمة المرور”; dots when typing. |
| 5 | Login button | Button | Label: “دخول”; primary style. |
| 6 | Error message | Text block | Below button; visible only on failure. |

---

## Conceptual Rules (No Implementation)

- **Max 3 failed attempts** → account locked 5 minutes.
- **All attempts logged** (concept only).
- **Enter key** submits the login form.

---

## Layout Notes

- **RTL:** Form and text follow RTL.
- **Fullscreen:** No OS chrome; entire viewport used.
- **Centred:** Logo, title, form, and button vertically centred.
- **Touch-friendly:** Inputs and button min 44px height.

---

**Deliverable:** Login Screen Wireframe  
**Phase:** 1 – Analysis & UI/UX Design only
