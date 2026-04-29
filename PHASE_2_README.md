# Phase 2: Technical Foundation & Electron Setup

## Project Status
**Phase 1:** ✅ COMPLETED & LOCKED (UI/UX, Wireframes, Branding)  
**Phase 2:** 🚀 IN PROGRESS (Electron Foundation, Authentication, Database)  
**Phase 3+:** ⏳ PLANNED

---

## Phase 2 Objectives
This phase builds the technical foundation so the Electron application can:
- ✅ Launch correctly with Electron
- ✅ Run in fullscreen kiosk mode
- ✅ Support Arabic RTL
- ✅ Provide secure authentication (login/logout)
- ✅ Use local SQLite database (offline-first)
- ✅ Be ready for Phase 3 (without implementing Phase 3)

---

## Project Structure

```
MY Project/
├── electron/
│   ├── main/                    # Electron main process
│   │   └── index.js
│   └── preload/                 # Preload script (secure IPC bridge)
│       └── index.js
├── backend/
│   ├── services/                # Business logic
│   │   ├── auth.js
│   │   └── ...
│   └── repositories/            # Data access layer
│       ├── users.js
│       ├── sessions.js
│       └── ...
├── database/
│   ├── index.js                 # Database initialization
│   ├── schema.js                # SQLite schema definition
│   ├── migrations/              # Database migrations
│   │   ├── 001_create_users.js
│   │   ├── 002_create_sessions.js
│   │   └── ...
│   └── seeders/                 # Data seeders
│       └── seed_admin.js
├── renderer/                    # UI (React/Vanilla JS)
│   ├── login.html
│   ├── main.html
│   ├── css/
│   ├── js/
│   └── ...
├── src/
│   └── (legacy structure - will be refactored)
├── docs/
│   ├── Phase_*.md               # Phase documentation
│   ├── phase1/                  # Phase 1 design assets (LOCKED)
│   └── ...
├── package.json                 # Dependencies & scripts
└── index.html                   # Entry point
```

---

## Technology Stack (Phase 2)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop Framework** | Electron | Cross-platform desktop app |
| **IPC Security** | contextBridge | Safe main↔renderer communication |
| **Database** | SQLite3 | Local, offline-first persistence |
| **Authentication** | bcrypt | Secure password hashing |
| **Language** | Node.js + Vanilla JS | Backend + Frontend |

---

## Database Schema (Phase 2 Only)

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'Cashier',  -- 'Admin' or 'Cashier'
  is_active BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### Shifts Table (Structure Only)
```sql
CREATE TABLE shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  shift_start TIMESTAMP,
  shift_end TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

---

## Setup Instructions

### Prerequisites
- Node.js 16+
- npm or yarn
- SQLite3 (bundled with better-sqlite3)

### Installation
```bash
cd "c:\Users\khalil\Desktop\MY Project"
npm install
```

### Running Phase 2
```bash
# Start Electron development
npm run dev

# Build for production
npm run build
```

### Default Credentials (Seeded Admin User)
- **Username:** admin
- **Password:** Admin@123456
- **Role:** Admin

---

## Phase 2 Implementation Checklist

### ✅ Completed
- [x] Project structure created
- [ ] Electron main process
- [ ] Preload script with contextBridge
- [ ] Renderer bootstrapping
- [ ] SQLite setup & connection
- [ ] Database migrations
- [ ] Users table
- [ ] Sessions table
- [ ] Login logic wiring
- [ ] Logout logic wiring
- [ ] Phase 2 README (this file)

---

## Strictly Forbidden in Phase 2
❌ Orders, Products, Tables, Sales  
❌ Discounts, Reports, Financial calculations  
❌ UI redesign from Phase 1  
❌ Phase 3/4 logic  
❌ Developer tools in production  

---

## Next Phase
**Phase 3** will implement:
- Products management
- Orders & cart
- Payment processing
- Sales records
- Basic reports

See [Phase_3_Core_Operations.md](./docs/Phase_3_Core_Operations.md) for details.

---

## Notes
- Database is stored locally (offline-first principle)
- All authentication uses bcrypt for security
- IPC is secured via contextBridge (no nodeIntegration)
- App runs fullscreen in production mode
