# Phase 1 – UX Decisions Document
## Shawarma Basel POS – Electron Offline-First

---

## 1. Layout & Structure

| Decision | Rule | Rationale |
|----------|------|-----------|
| **Direction** | Arabic RTL throughout | Primary users read Arabic; consistency and comfort. |
| **Chrome** | Fullscreen only (Kiosk Mode) | No menu bar, no OS window controls. Reduces distraction and accidental closes. |
| **Navigation** | No sidebar | Main content uses full width. Actions in top bar or inline. |
| **Top bar** | Fixed; always visible | Logo, system name, logged-in user, logout. Persistent across main screens. |

---

## 2. Visual Design

| Decision | Rule | Rationale |
|----------|------|-----------|
| **Palette** | Warm colors, clear contrast | Fits restaurant context; readable in varied lighting. |
| **Mode** | Light only (this phase) | No dark mode in Phase 1. Simplifies design and validation. |
| **Imagery** | Icons only; no product photos | Fast loading, clear at small size, consistent look. |
| **Hover / Active** | Simple, clear states | Buttons and tappable areas change visibly on hover and tap. |
| **Alerts** | Clear error and warning styling | Distinct from normal UI; messages in Arabic, close to context. |

---

## 3. Login Experience

| Decision | Rule | Rationale |
|----------|------|-----------|
| **Entry point** | Login screen first | No access to main app without authentication (concept). |
| **Layout** | Logo → system name → username → password → button | Clear hierarchy, minimal cognitive load. |
| **Submit** | Enter key submits login | Faster for keyboard users. |
| **Password** | Masked input | Standard security convention. |
| **Errors** | Single, clear message below form | User knows what went wrong (e.g. wrong credentials, locked). |
| **Lockout (concept)** | Max 3 failed attempts → 5 min lock | Reduces brute force; communicated in UI when locked. |
| **Logging (concept)** | All attempts logged | Audit trail only; no implementation in Phase 1. |

---

## 4. Logout Experience

| Decision | Rule | Rationale |
|----------|------|-----------|
| **Placement** | Fixed in top bar, right side (RTL) | Always visible; same location everywhere. |
| **Content** | Logout icon + current username | Clarifies who is logged in; reduces mistaken logouts. |
| **Confirmation** | Dialog before logout | Prevents accidental logout during rush. |
| **Action** | End session only | App stays open; user returns to Login screen. |
| **No app exit** | Logout ≠ close app | Kiosk stays on; next user can log in immediately. |

---

## 5. Main Interface (Concept)

| Decision | Rule | Rationale |
|----------|------|-----------|
| **Zones** | Categories | Current order | Side summary | Clear separation of tasks. |
| **Categories** | Primary focus (larger area) | Main task is selecting items. |
| **Current order** | Middle | Review and adjust before confirming. |
| **Summary** | Side panel | Totals, maybe actions; always visible. |
| **Top bar** | Same as above | Logo, system name, user, logout on every main screen. |

---

## 6. Touch & Interaction

| Decision | Rule | Rationale |
|----------|------|-----------|
| **Target size** | Min 44px height for main actions | Touch-friendly; fewer mis-taps. |
| **Feedback** | Immediate visual change on tap | User knows the action was registered. |
| **No hover-only actions** | All key actions work with tap | Usable on touch devices. |

---

## 7. Errors & Feedback

| Decision | Rule | Rationale |
|----------|------|-----------|
| **Errors** | In-context, Arabic, concise | User can fix without guessing. |
| **Warnings** | Distinct style from errors | Different severity; different treatment. |
| **Success** | Optional subtle feedback | e.g. brief highlight; no blocking modals for routine actions. |

---

## 8. Out-of-Scope (Phase 1)

- No backend, database, or authentication logic.
- No shifts, orders, tables, reports, or money handling.
- No Phase 2+ features.
- No dark mode.

---

## 9. Design Principles Summary

1. **Speed** – Few taps, Enter to submit, instant feedback.
2. **Clarity** – Clear labels, obvious errors, consistent layout.
3. **Always-visible logout** – Fixed in top bar with confirmation.
4. **RTL Arabic** – Full RTL layout.
5. **Fullscreen Kiosk** – No OS chrome, no sidebar.
6. **Touch-first** – Large targets, tap-friendly, no hover-only critical actions.
7. **Warm, contrasted UI** – Icons only; simple hover/active states.

---

**Document:** Phase 1 – UX Decisions  
**Version:** 1.0  
**Status:** Design only – no implementation.
