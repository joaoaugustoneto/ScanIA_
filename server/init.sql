CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'error')),
  merchant TEXT,
  purchase_date DATE,
  total NUMERIC(12, 2) CHECK (total IS NULL OR total > 0),
  category TEXT,
  payment_method TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts (id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10, 3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2),
  total_price NUMERIC(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS receipts_user_created_idx ON receipts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS receipt_items_receipt_idx ON receipt_items (receipt_id);
