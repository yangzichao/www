function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function recordPageView(database: D1Database, path: string, viewedAt: Date): Promise<number> {
  const [, totalResult] = await database.batch<{ total_views: number }>([
    database
      .prepare(
        `INSERT INTO daily_page_views (day, path, views) VALUES (?1, ?2, 1)
         ON CONFLICT (day, path) DO UPDATE SET views = views + 1`,
      )
      .bind(utcDay(viewedAt), path),
    database.prepare('SELECT SUM(views) AS total_views FROM daily_page_views WHERE path = ?1').bind(path),
  ]);
  return totalResult.results[0]?.total_views ?? 0;
}
