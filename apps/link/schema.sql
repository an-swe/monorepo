-- URL Shortener Database Schema

CREATE TABLE IF NOT EXISTS urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  short_code TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER
);

-- Index for fast lookups by short_code
CREATE INDEX IF NOT EXISTS idx_short_code ON urls(short_code);

-- Index for finding expired URLs (optional, for cleanup)
CREATE INDEX IF NOT EXISTS idx_expires_at ON urls(expires_at);
