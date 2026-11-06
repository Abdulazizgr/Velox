# Velox — Skate Rink & Cafe Management System

Velox is an internal operations and point-of-sale (POS) management system tailored for commercial skate rinks, equipment rental counters, snack concessions, and daily financial reconciliation.

---

## 📋 Documentation

- **[System Requirements Specification (REQUIREMENTS.md)](file:///home/abdulaziz/Documents/Velox/REQUIREMENTS.md)**: Fully organized, formatted requirements including the rental process, equipment tracking, pricing rules, Ethiopian payment methods (Cash, Telebirr, CBE), and capital/expense accounting.

---

## 🎯 Core Features at a Glance

1. **Skate Rental & Asset Tracking**
   - Dual-identifier system: **Shoe Size** (e.g. 40) + **Unique Shoe ID** (e.g. `SK-40-01`).
   - Automated +5 minute grace period buffer for lace-up (30m becomes 35m; 60m becomes 65m).
   - Weekday vs. Weekend dynamic pricing (150/250 ETB vs 200/300 ETB).
   - In-session shoe swap (comfortable fit change) and in-session extensions.
   - Real-time countdown board with "Due Soon" and "Overdue" alerts sorted by finish time.

2. **Snack & Drink Concession (POS)**
   - Add items to an active skater's open tab or conduct standalone walk-in sales.
   - Real-time inventory deduction and low-stock alerts.

3. **Financial Accounting & Cash Control**
   - Multi-channel settlement: **Cash**, **Telebirr**, and **CBE (Commercial Bank of Ethiopia)**.
   - Two-tier expense tracking:
     - **Daily Petty Expenses:** Paid from daily cash drawer (staff lunch, transport).
     - **Capital Expenses:** Paid from General Capital (buying shoes, bulk restock, rent).
   - End-of-day register closing and cash drawer balancing.

---

## 🚀 Next Steps

We are ready to decide the technical stack, database schema, and phased execution roadmap.
