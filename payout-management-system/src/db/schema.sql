-- Payout Management System — Relational Schema
-- Engine used here: SQLite (via Node's built-in node:sqlite module).
-- In production (see README "Trade-offs") this maps 1:1 onto Postgres/MySQL,
-- swapping `datetime('now')` defaults and AUTOINCREMENT for SERIAL/IDENTITY.

PRAGMA foreign_keys = ON;

-- A user who earns commissions and can withdraw a wallet balance.
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  wallet_balance REAL NOT NULL DEFAULT 0,   -- cached, denormalized balance (see README)
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Affiliate brands a sale can belong to.
CREATE TABLE IF NOT EXISTS brands (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- A single affiliate sale/order line.
CREATE TABLE IF NOT EXISTS sales (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            TEXT NOT NULL REFERENCES users(id),
  brand_id           TEXT NOT NULL REFERENCES brands(id),
  earning            REAL NOT NULL CHECK (earning >= 0),
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','approved','rejected')),
  advance_paid       REAL NOT NULL DEFAULT 0,
  -- Non-null once (and only once) an advance payout has been issued for this
  -- sale. This is the single source of truth that makes the advance-payout
  -- job idempotent, no matter how many times it is re-run.
  advance_payout_id  INTEGER REFERENCES payouts(id),
  reconciled_at      TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Every payout-related money movement we ever decided to make: advance
-- payouts, final reconciliation adjustments, and withdrawals. Kept as an
-- immutable, append-only audit trail (status is the only mutable field,
-- and only for WITHDRAWAL rows while they are in flight).
CREATE TABLE IF NOT EXISTS payouts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id),
  sale_id    INTEGER REFERENCES sales(id),
  type       TEXT NOT NULL CHECK (type IN ('ADVANCE','FINAL_ADJUSTMENT','WITHDRAWAL')),
  -- Signed amount in rupees. Advances and withdrawals are positive numbers
  -- that represent money moving OUT to the user; final adjustments can be
  -- positive (approved) or negative (rejected, clawing back the advance).
  amount     REAL NOT NULL,
  status     TEXT NOT NULL DEFAULT 'SUCCESS'
              CHECK (status IN ('PENDING','SUCCESS','FAILED','CANCELLED','REJECTED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Append-only ledger. This is the actual source of truth for a user's
-- balance; users.wallet_balance is a cache that is always updated in the
-- same DB transaction as the ledger row, so the two can never drift.
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL REFERENCES users(id),
  amount        REAL NOT NULL,   -- positive = credit, negative = debit
  reason        TEXT NOT NULL,   -- e.g. ADVANCE_PAYOUT, SALE_APPROVED, SALE_REJECTED_CLAWBACK, WITHDRAWAL_HOLD, WITHDRAWAL_REVERSAL
  ref_type      TEXT,            -- 'sale' | 'payout' | 'withdrawal'
  ref_id        INTEGER,
  balance_after REAL NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A user-initiated withdrawal request. Modeled as its own table (rather
-- than reusing `payouts`) because withdrawals have a distinct lifecycle
-- (PENDING -> SUCCESS/FAILED/CANCELLED/REJECTED) driven by an external
-- payment gateway callback, and because the 24h cooldown rule only reads
-- from this table.
CREATE TABLE IF NOT EXISTS withdrawals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id),
  amount     REAL NOT NULL CHECK (amount > 0),
  status     TEXT NOT NULL DEFAULT 'PENDING'
              CHECK (status IN ('PENDING','SUCCESS','FAILED','CANCELLED','REJECTED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sales_user_status        ON sales(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_advance_payout      ON sales(advance_payout_id);
CREATE INDEX IF NOT EXISTS idx_payouts_user              ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_sale               ON payouts(sale_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status_ts ON withdrawals(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_ts          ON wallet_transactions(user_id, created_at);
