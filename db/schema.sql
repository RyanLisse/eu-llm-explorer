CREATE TABLE IF NOT EXISTS model_routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  maker TEXT NOT NULL,
  route TEXT NOT NULL,
  providers_json TEXT NOT NULL DEFAULT '[]',
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  tier TEXT NOT NULL CHECK (tier IN ('A', 'B', 'C')),
  mode TEXT NOT NULL CHECK (mode IN ('reasoning', 'non-reasoning', 'configurable')),
  openness TEXT NOT NULL CHECK (openness IN ('open-weight', 'open-source', 'proprietary')),
  input_price REAL NOT NULL,
  output_price REAL NOT NULL,
  throughput REAL NOT NULL,
  ttft REAL NOT NULL,
  latest INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL,
  sla_pct REAL,
  observed_uptime REAL,
  availability_risk TEXT NOT NULL CHECK (availability_risk IN ('low', 'medium', 'high')),
  reliability_note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_coverage (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('A', 'B', 'C')),
  requirement_fit TEXT NOT NULL CHECK (requirement_fit IN ('sovereign', 'eu-residency', 'rejected')),
  source_type TEXT NOT NULL CHECK (source_type IN ('official', 'report-derived')),
  source TEXT NOT NULL,
  evidence_note TEXT NOT NULL,
  UNIQUE (platform, provider, model)
);

CREATE TABLE IF NOT EXISTS coverage_regions (
  coverage_id TEXT NOT NULL REFERENCES provider_coverage(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  in_region INTEGER NOT NULL DEFAULT 0,
  eu_geo INTEGER NOT NULL DEFAULT 0,
  global INTEGER NOT NULL DEFAULT 0,
  legacy_eol TEXT,
  PRIMARY KEY (coverage_id, code)
);

CREATE TABLE IF NOT EXISTS provider_coverage_summaries (
  platform TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('A', 'B', 'C')),
  requirement_fit TEXT NOT NULL CHECK (requirement_fit IN ('sovereign', 'eu-residency', 'rejected')),
  model_count INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('official', 'report-derived')),
  source TEXT NOT NULL,
  evidence_note TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vendor_scope (
  platform TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('A', 'B', 'C')),
  status TEXT NOT NULL CHECK (status IN ('covered', 'covered-with-conditions', 'excluded', 'monitor')),
  category TEXT NOT NULL CHECK (category IN ('sovereign', 'eu-residency', 'eu-router', 'rejected', 'infrastructure')),
  model_coverage TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('official', 'report-derived')),
  source TEXT NOT NULL,
  evidence_note TEXT NOT NULL
);
