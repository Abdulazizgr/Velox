# Velox — Skate Rink & Cafe POS Management System

**Velox** (*Latin: "swift, rapid"*) is a high-performance, mobile-first Point of Sale (POS) and operational management system built for commercial roller/ice skating rinks, concession snack bars, and equipment rental facilities.

---

## ⚡ Key Highlights & Architecture

- **Stack:** Next.js 15 (App Router, Turbopack) • React 19 • TypeScript • Tailwind CSS • MongoDB (Mongoose) • Web Audio API.
- **Form Factor:** **Mobile-First & PWA Ready** (Responsive bottom quick navigation for phones/tablets + fixed sidebar for desktop counter PCs).
- **Offline / Local-First Reliability:** Runs seamlessly on local networks or standalone counter PCs connected to MongoDB.
- **Currency & Market Context:** Ethiopian Birr (ETB) with native support for **Cash**, **Telebirr**, and **Commercial Bank of Ethiopia (CBE)**.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v20+ or v22+)
- `pnpm` (or `npm`)
- MongoDB running locally on port `27017` (or remote MongoDB connection string)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
MONGODB_URI=mongodb://127.0.0.1:27017/velox_db
JWT_SECRET=velox_skate_rink_secret_jwt_2026_super_secure_key_12345
NEXT_PUBLIC_APP_NAME=Velox Skate Rink
```

### 3. Seed the Database
Initialize the Owner account, staff operator, 20 skate shoes, 8 concession products, 50,000 ETB general capital fund, and today's register:
```bash
pnpm seed
```

### 4. Start Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Default Demo Accounts

| Role | Registered Phone | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Rink Owner** | `0911000000` | `admin` | Full access (Staff admin, Capital fund, Reports, Fleet) |
| **Staff Operator** | `0922000000` | `staff` | Counter operations (Rental board, Concession POS, Returns) |

*Note: New staff accounts cannot self-register; they are registered directly by the Owner from the [Staff Management](http://localhost:3000/staff) screen.*

---

## 📦 System Capabilities & Phase Breakdown

### Phase 1: Foundation & Phone-Based Security
- **MongoDB Connection Pooling:** Persistent connection caching across Next.js reloads.
- **Phone Number Authentication:** Normalized Ethiopian phone format (`09...` or `+251...`) with secure `bcryptjs` hashing and stateless JWT cookies.
- **Owner-Only Staff Management:** The Owner registers counter employees with phone numbers and passwords, with instant account activation/deactivation.

### Phase 2: Live Skate Rental & Countdown Timer Board
- **Dual Identifier Architecture:** Standard **Shoe Size** (e.g. 40) + **Unique Asset ID** (e.g. `SK-40-01`).
- **Lace-Up Buffer:** Automatic **+5 minutes grace period** on all rentals (30m booking $\rightarrow$ 35m timer; 60m booking $\rightarrow$ 65m timer).
- **Dynamic Weekend Pricing:** Automatically switches rates based on day of week:
  - *30 Min*: 150 ETB (Mon–Fri) / 200 ETB (Sat–Sun)
  - *60 Min*: 250 ETB (Mon–Fri) / 300 ETB (Sat–Sun)
- **Live Board Sorted by Finish Time:** Skaters exiting earliest appear first. Live color-coded status badges: `Active` (Green), `Due Soon` (Yellow), and `Overdue` (Red).
- **In-Session Shoe Swap:** Seamless equipment exchange if a customer has an uncomfortable fit; timer continues uninterrupted.
- **Session Extensions:** Add +30 or +60 minutes mid-session with automatic price adjustments.
- **Audio Cues:** Web Audio synthesizer chime triggers for Due Soon and Overdue notifications.

### Phase 3: Snacks & Soft Drinks POS (Concession)
- **Dual Billing Channels:**
  - **Add to Skater's Tab:** Search active Shoe ID on the rink and append snacks to their open bill.
  - **Walk-in Spectator Sale:** Instant counter checkout for non-skating visitors.
- **Real-Time Stock Decrement:** Stock is deducted automatically upon checkout, preventing sales of out-of-stock items.
- **Unified Checkout:** Returning shoes on the rental board combines the skate fee + attached snacks into a single payable total.
- **Digital Receipt & Sales Log:** Instant receipt preview and transaction audit trail.

### Phase 4: Two-Tier Financial Accounting
- **Tier 1: General Capital Reserve (CapEx):** Track initial capital, owner top-ups, and CapEx withdrawals (buying shoes, bulk restocks, rink rent).
- **Tier 2: Daily Operating Cash Register (OpEx):** Deducts daily petty expenses (staff lunch, transport, minor supplies) directly from physical cash collections.
- **Multi-Channel Settlement:** Separate bookkeeping for **Cash**, **Telebirr**, and **CBE**.

### Phase 5: End-of-Day (EOD) Register Closing & Reports
- **Opening Cash Float:** Shift opens with a base float (e.g. 500 ETB).
- **Drawer Balancing Formula:**
  $$\text{Expected Cash} = \text{Opening Float} + \text{Cash In} - \text{Daily Petty Out}$$
- **Discrepancy Detection:** Compares physical counted cash against expected cash (detecting balanced, shortage, or surplus).
- **Digital Audit:** Cross-reference Telebirr and CBE bank statements against recorded digital receipts.
- **Printable Shift Reports:** One-click receipt printing (`window.print()`) formatted for POS thermal rolls or A4 paper.
- **Shift History Archive:** Historical record of past daily balances and closed registers.

### Phase 6: PWA & Counter Usability
- **Progressive Web App (PWA):** Installable on Android, iOS, or Chrome desktop with offline fallback service worker (`/sw.js`).
- **Keyboard Shortcuts (Hotkeys):**
  - `F2`: Jump to Rental Board
  - `F3`: Jump to Snacks POS
  - `F4`: Jump to Finances
  - `F7`: Jump to Daily Reports
  - `?`: Toggle hotkey cheat sheet
  - `Esc`: Close any open dialog

---

## 📄 Project Documentation Links

- **[System Requirements Specification (REQUIREMENTS.md)](file:///home/abdulaziz/Documents/Velox/REQUIREMENTS.md)**
- **[Technical Architecture & Plan (ARCHITECTURE_AND_PLAN.md)](file:///home/abdulaziz/Documents/Velox/ARCHITECTURE_AND_PLAN.md)**
