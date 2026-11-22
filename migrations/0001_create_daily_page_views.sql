CREATE TABLE daily_page_views (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path)
) WITHOUT ROWID;

CREATE INDEX daily_page_views_by_path ON daily_page_views (path);
