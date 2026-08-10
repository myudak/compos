CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchants (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operators (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES merchants(id),
  code text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('OPERATOR', 'ADMIN', 'OWNER')),
  pin_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, code)
);

CREATE TABLE IF NOT EXISTS devices (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES merchants(id),
  name text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS products (
  id text NOT NULL,
  merchant_id text NOT NULL REFERENCES merchants(id),
  sku text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  stock_projection integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 5,
  accent text NOT NULL DEFAULT '#06b6d4',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, id),
  UNIQUE (merchant_id, sku)
);

CREATE TABLE IF NOT EXISTS transactions (
  id text NOT NULL,
  merchant_id text NOT NULL REFERENCES merchants(id),
  device_id text NOT NULL REFERENCES devices(id),
  operator_id text NOT NULL REFERENCES operators(id),
  invoice_number text NOT NULL,
  transaction_status text NOT NULL CHECK (transaction_status IN ('CONFIRMED', 'VOIDED')),
  settlement_status text NOT NULL DEFAULT 'SETTLED' CHECK (settlement_status = 'SETTLED'),
  payment_method text NOT NULL CHECK (payment_method IN ('CASH', 'STATIC_QRIS', 'TRANSFER')),
  payment_verification_type text NOT NULL CHECK (payment_verification_type IN ('SYSTEM_VERIFIABLE', 'OPERATOR_ASSERTED')),
  payment_reference text,
  subtotal integer NOT NULL,
  discount integer NOT NULL DEFAULT 0,
  tax integer NOT NULL DEFAULT 0,
  total integer NOT NULL,
  created_at_device timestamptz NOT NULL,
  received_at_backend timestamptz NOT NULL DEFAULT now(),
  payload_hash text NOT NULL,
  PRIMARY KEY (merchant_id, id),
  UNIQUE (merchant_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id bigserial PRIMARY KEY,
  merchant_id text NOT NULL,
  transaction_id text NOT NULL,
  product_id text NOT NULL,
  name_snapshot text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  subtotal integer NOT NULL CHECK (subtotal >= 0),
  FOREIGN KEY (merchant_id, transaction_id) REFERENCES transactions(merchant_id, id),
  FOREIGN KEY (merchant_id, product_id) REFERENCES products(merchant_id, id)
);

CREATE TABLE IF NOT EXISTS transaction_events (
  id bigserial PRIMARY KEY,
  merchant_id text NOT NULL,
  transaction_id text NOT NULL,
  event_type text NOT NULL,
  actor_type text NOT NULL,
  actor_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_timestamp timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (merchant_id, transaction_id) REFERENCES transactions(merchant_id, id)
);

CREATE TABLE IF NOT EXISTS corrections (
  id text PRIMARY KEY,
  merchant_id text NOT NULL,
  transaction_id text NOT NULL,
  admin_id text NOT NULL REFERENCES operators(id),
  reason text NOT NULL,
  adjustment_amount integer NOT NULL,
  evidence_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (merchant_id, transaction_id) REFERENCES transactions(merchant_id, id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id bigserial PRIMARY KEY,
  merchant_id text NOT NULL,
  product_id text NOT NULL,
  transaction_id text NOT NULL,
  quantity_delta integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, product_id, transaction_id),
  FOREIGN KEY (merchant_id, product_id) REFERENCES products(merchant_id, id),
  FOREIGN KEY (merchant_id, transaction_id) REFERENCES transactions(merchant_id, id)
);

CREATE TABLE IF NOT EXISTS inventory_discrepancies (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES merchants(id),
  product_id text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  projected_stock integer NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  resolution text,
  resolved_by text REFERENCES operators(id),
  resolved_at timestamptz,
  FOREIGN KEY (merchant_id, product_id) REFERENCES products(merchant_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_open_discrepancy_per_product
  ON inventory_discrepancies (merchant_id, product_id)
  WHERE status = 'OPEN';

CREATE TABLE IF NOT EXISTS backend_outbox_events (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES merchants(id),
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  processed_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text
);

CREATE INDEX IF NOT EXISTS backend_outbox_pending_idx
  ON backend_outbox_events (created_at)
  WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS transactions_received_idx
  ON transactions (merchant_id, received_at_backend DESC);
