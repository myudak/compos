ALTER TABLE operators DROP CONSTRAINT operators_role_check;
ALTER TABLE operators ADD CONSTRAINT operators_role_check
  CHECK (role IN ('OPERATOR', 'ADMIN', 'OWNER'));

ALTER TABLE merchants ADD COLUMN timezone text NOT NULL DEFAULT 'Asia/Jakarta';

CREATE TABLE reporting_applied_transactions (
  merchant_id text NOT NULL REFERENCES merchants(id),
  transaction_id text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, transaction_id),
  FOREIGN KEY (merchant_id, transaction_id) REFERENCES transactions(merchant_id, id)
);

CREATE TABLE merchant_daily_sales (
  merchant_id text NOT NULL REFERENCES merchants(id),
  business_date date NOT NULL,
  gross_sales bigint NOT NULL DEFAULT 0,
  net_sales bigint NOT NULL DEFAULT 0,
  transaction_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, business_date)
);

CREATE TABLE merchant_product_daily_sales (
  merchant_id text NOT NULL,
  product_id text NOT NULL,
  product_name text NOT NULL,
  business_date date NOT NULL,
  quantity bigint NOT NULL DEFAULT 0,
  revenue bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, product_id, business_date),
  FOREIGN KEY (merchant_id, product_id) REFERENCES products(merchant_id, id)
);

CREATE TABLE insight_jobs (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES merchants(id),
  requested_by text REFERENCES operators(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','PROCESSING','COMPLETED','FAILED')),
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  insight_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, period_start, period_end)
);

CREATE TABLE business_insights (
  id text PRIMARY KEY,
  merchant_id text NOT NULL REFERENCES merchants(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  recommendations jsonb NOT NULL,
  source text NOT NULL CHECK (source IN ('EXTERNAL_AI','LOCAL_ANALYTICS')),
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE insight_jobs ADD CONSTRAINT insight_jobs_insight_fk
  FOREIGN KEY (insight_id) REFERENCES business_insights(id);
CREATE INDEX merchant_daily_sales_recent_idx ON merchant_daily_sales (merchant_id, business_date DESC);
CREATE INDEX merchant_product_daily_recent_idx ON merchant_product_daily_sales (merchant_id, business_date DESC);
CREATE INDEX insight_jobs_due_idx ON insight_jobs (next_attempt_at) WHERE status IN ('QUEUED','FAILED');
CREATE INDEX business_insights_recent_idx ON business_insights (merchant_id, generated_at DESC);

UPDATE backend_outbox_events SET event_type = 'INVENTORY_TRANSACTION_SETTLED'
WHERE event_type = 'TRANSACTION_SETTLED';
