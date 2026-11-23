CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  venue TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  body_markdown TEXT NOT NULL,
  body_html TEXT NOT NULL,
  headings TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  timestamp_precision TEXT NOT NULL CHECK (timestamp_precision IN ('exact', 'day')),
  updated_at TEXT,
  is_public INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1))
);

CREATE INDEX posts_by_created_at ON posts (created_at);
