CREATE TABLE thoughts (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  timestamp_precision TEXT NOT NULL CHECK (timestamp_precision IN ('exact', 'month'))
) WITHOUT ROWID;

CREATE INDEX thoughts_by_created_at ON thoughts (created_at);
