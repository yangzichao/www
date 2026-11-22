CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  github_user_id INTEGER NOT NULL,
  github_login TEXT NOT NULL,
  github_avatar_url TEXT NOT NULL,
  encrypted_access_token TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
) WITHOUT ROWID;

CREATE INDEX sessions_by_expiry ON sessions (expires_at);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  page_path TEXT NOT NULL,
  body TEXT NOT NULL,
  author_kind TEXT NOT NULL CHECK (author_kind IN ('github', 'anonymous')),
  author_name TEXT NOT NULL,
  github_login TEXT,
  github_avatar_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('published', 'pending')),
  created_at TEXT NOT NULL
) WITHOUT ROWID;

CREATE INDEX comments_by_page ON comments (page_path, status, created_at);
CREATE INDEX comments_by_status ON comments (status, created_at);
