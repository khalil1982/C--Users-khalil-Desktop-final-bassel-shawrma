# Phase 1 – Branding Guidelines
## App Icon, Restaurant Logo, Usage & Placement

---

## 1. App Icon (Electron)

### 1.1 Purpose

- **Electron app icon** (taskbar, window, desktop shortcut).
- Represents the application, not necessarily the restaurant brand.

### 1.2 Requirements

| Rule | Description |
|------|-------------|
| **Theme** | Simple, clear, **shawarma-themed** (e.g. wrap, sandwich, skewer). |
| **Clarity** | Recognisable at **small sizes** (16×16, 32×32, 48×48). |
| **Style** | Flat or lightly dimensional; works on light and warm backgrounds. |
| **Format** | Standard app icon formats (e.g. .ico, .png at multiple resolutions). |

### 1.3 Usage

- Desktop shortcut.
- Taskbar / dock.
- Window title bar.
- Splash or loading (if used later).

### 1.4 Guidelines

- Prefer **single, simple shape** over detailed scenes.
- Avoid small text or tiny details.
- Test at 24×24 and 32×32 to ensure it stays readable.

---

## 2. Restaurant Logo (Brand Logo)

### 2.1 Purpose

- **Brand identity** of the restaurant.
- Shown inside the app (Login, Top bar).
- Separate from the **App Icon**.

### 2.2 Requirements

| Rule | Description |
|------|-------------|
| **Placement** | Login screen (top) and **Top bar** (main interface). |
| **Replaceable** | **Concept:** Admin can change it later via settings. No implementation in Phase 1. |
| **Aspect** | Flexible aspect ratio; ensure it fits allocated space without distortion. |

### 2.3 Placement Rules

| Location | Placement | Size / constraints |
|----------|-----------|---------------------|
| **Login screen** | Centred at top, above system name | Max height ~80–100px; width proportional. |
| **Top bar** | Left side (RTL), before system name | Height aligned with top bar (~40–48px). |

### 2.4 Behaviour (Concept)

- **Default:** Placeholder or generic logo until Admin sets one.
- **Replaceable:** Admin uploads/changes logo in settings (future).
- **Consistency:** Same logo in Login and Top bar when set.

---

## 3. Icon vs Logo – Summary

| Item | Use | Where |
|------|-----|-------|
| **App Icon** | Application identity | OS: desktop, taskbar, window. |
| **Restaurant Logo** | Restaurant brand | In-app: Login, Top bar. |

- Keep **App Icon** and **Restaurant Logo** **distinct** in asset files and usage.
- App Icon = system/UI; Logo = brand inside the app.

---

## 4. Visual Style (Phase 1)

- **Palette:** Warm colors; clear contrast (see UX Decisions).
- **No dark mode** in Phase 1.
- **Icons only** in POS UI (no product images); applies to categories and actions, not to logo/icon branding above.

---

## 5. File Naming (Recommendation)

- **App Icon:** `app-icon.ico`, `app-icon-16.png`, `app-icon-32.png`, etc.
- **Restaurant Logo:** `restaurant-logo.png` (or `restaurant-logo.svg` if used).  
- **Placeholder:** `logo-placeholder.png` for design mockups.

---

## 6. Deliverables Checklist

- [x] **Icon usage guidelines** – App Icon: purpose, sizes, style.
- [x] **Logo placement rules** – Login + Top bar; replaceable (concept).
- [x] **Icon vs Logo** – Separate roles and usage.

---

**Document:** Phase 1 – Branding Guidelines  
**Version:** 1.0  
**Status:** Design only. No implementation of logo replacement or asset pipeline.
