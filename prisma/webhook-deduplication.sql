-- Add webhook deduplication table to prevent race conditions
-- This replaces the in-memory processedWebhooks Map with persistent storage

-- Create webhook processing log table
CREATE TABLE IF NOT EXISTS processed_webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT UNIQUE NOT NULL,
  request_id TEXT NOT NULL,
  webhook_body TEXT,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_event_id ON processed_webhooks(event_id);
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at ON processed_webhooks(processed_at);

-- Clean up old entries (older than 24 hours) to prevent table growth
DELETE FROM processed_webhooks WHERE processed_at < datetime('now', '-24 hours');
