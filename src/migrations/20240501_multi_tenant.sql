-- Comprehensive Migration: Multi-Tenant Data Isolation v2
-- This script ensures all data is isolated by admin_id and fixes unique constraints.

-- 1. Admins Table
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS preferences JSON DEFAULT NULL;

-- 2. Clients Table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS admin_id INT NOT NULL,
  ADD CONSTRAINT fk_clients_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;

-- 3. Trades Table
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS admin_id INT NOT NULL,
  ADD CONSTRAINT fk_trades_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;

-- 4. Capital Summary
ALTER TABLE capital_summary
  ADD COLUMN IF NOT EXISTS admin_id INT NOT NULL FIRST;
ALTER TABLE capital_summary
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (admin_id),
  ADD CONSTRAINT fk_capital_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;

-- 5. Reference Notes
ALTER TABLE reference_notes
  ADD COLUMN IF NOT EXISTS admin_id INT NOT NULL,
  ADD CONSTRAINT fk_notes_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;

-- 6. Watchlist Categories (FIX UNIQUE CONSTRAINT)
ALTER TABLE watchlist_categories
  ADD COLUMN IF NOT EXISTS admin_id INT NOT NULL;
-- Drop old unique index on 'name' and add composite unique index
ALTER TABLE watchlist_categories
  DROP INDEX name,
  ADD UNIQUE KEY unique_category_per_admin (name, admin_id),
  ADD CONSTRAINT fk_watchlistcat_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;

-- 7. Watchlist Symbols (FIX UNIQUE CONSTRAINT)
ALTER TABLE watchlist_symbols
  ADD COLUMN IF NOT EXISTS admin_id INT NOT NULL;
-- Drop old unique index on 'symbol' and add composite unique index
ALTER TABLE watchlist_symbols
  DROP INDEX symbol,
  ADD UNIQUE KEY unique_symbol_per_admin (symbol, admin_id),
  ADD CONSTRAINT fk_watchlistsym_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE;
