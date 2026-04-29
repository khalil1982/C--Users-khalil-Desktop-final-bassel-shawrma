# Phase 1 – Analysis & UI/UX Design
## Shawarma Basel POS – Deliverables Index

**Objective:** Design and structure only. No backend, database, or business logic.

---

## Deliverables Overview

| # | Deliverable | Location |
|---|-------------|----------|
| 1 | **User Analysis Summary** | [01_User_Analysis_Summary.md](./01_User_Analysis_Summary.md) |
| 2 | **UX Decisions Document** | [02_UX_Decisions_Document.md](./02_UX_Decisions_Document.md) |
| 3 | **Login Screen Wireframe** | [wireframes/03_Login_Screen_Wireframe.md](./wireframes/03_Login_Screen_Wireframe.md) |
| 4 | **Logout Button Wireframe + Flow** | [wireframes/04_Logout_Button_Wireframe_and_Flow.md](./wireframes/04_Logout_Button_Wireframe_and_Flow.md) |
| 5 | **Main Layout Concept** | [05_Main_Layout_Concept.md](./05_Main_Layout_Concept.md) |
| 6 | **Branding Guidelines** | [06_Branding_Guidelines.md](./06_Branding_Guidelines.md) |
| 7 | **Login Screen Visual Mockup** | [mockups/login-screen/](./mockups/login-screen/) |

---

## User Analysis

- **Personas:** Admin (owner), Cashier.
- **Workflow:** Login → work (orders, etc.) → logout; Admin also opens/closes shifts.
- **Pain points:** Slow UI, small touch targets, unclear errors, accidental logout.
- **UX priorities:** Speed, clarity, touch-friendly, always-visible logout.

---

## UI/UX Rules (Summary)

- Arabic **RTL** layout.
- **Fullscreen / Kiosk** only; no menu bar, no OS controls.
- **No sidebar** in main interface.
- **Icons only** (no product images).
- **Warm colors**, clear contrast.
- Simple **hover / active** states.
- Clear **error and warning** alerts.
- **Always-visible logout** in top bar.
- **No dark mode** in Phase 1.

---

## Login Screen

- Logo, system name, username, password (masked), login button.
- **Enter** submits login.
- Clear **error message** on failure.
- **Concept:** Max 3 attempts → 5 min lock; all attempts logged.

---

## Logout UX

- **Fixed** in top bar.
- **Username** next to logout icon.
- **Confirmation dialog** before logout.
- Logout **ends session only** (app stays open) → **redirect to Login**.

---

## Main Interface (Concept)

- **Top bar:** Logo, system name, username, logout.
- **Zones:** Categories | Current order | Side summary.
- **Screen hierarchy:** App → Login **or** Main → Logout back to Login.

---

## Branding

- **App icon:** Shawarma-themed, clear at small sizes; used for Electron.
- **Restaurant logo:** Login + Top bar; **replaceable by Admin** (concept only).

---

## Out of Scope (Phase 1)

- No backend, database, or authentication logic.
- No shifts, orders, tables, reports, or money.
- No Phase 2+ features.

---

## Stopping Rule

**Stop after Phase 1.** Do not proceed to Phase 2 until explicitly approved.

---

**Phase 1 Status:** ✅ Complete (Design & UX only)
