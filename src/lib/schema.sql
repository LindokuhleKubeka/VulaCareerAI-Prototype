CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS jobs (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  company       TEXT NOT NULL,
  location      TEXT NOT NULL,
  type          TEXT,
  description   TEXT NOT NULL,
  requirements  TEXT[],
  nice_to_have  TEXT[],
  education     TEXT,
  experience    TEXT,
  salary_range  TEXT,
  source        TEXT,
  embedding     vector(1024),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jobs_embedding_idx
  ON jobs USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 10);

CREATE TABLE IF NOT EXISTS eval_logs (
  id              SERIAL PRIMARY KEY,
  request_id      TEXT NOT NULL,
  endpoint        TEXT NOT NULL,
  cv_snippet      TEXT,
  job_ids_matched TEXT[],
  llm_response    TEXT,
  judge_score     JSONB,
  input_tokens    INT,
  output_tokens   INT,
  latency_ms      INT,
  model           TEXT DEFAULT 'claude-sonnet-4-20250514',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS eval_logs_created_idx ON eval_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS eval_logs_endpoint_idx ON eval_logs (endpoint);
