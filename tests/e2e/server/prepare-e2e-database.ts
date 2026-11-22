import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ADMIN_SESSION,
  COMMENT_TEST_PAGE,
  E2E_PERSIST_DIRECTORY,
  SEEDED_PENDING_COMMENT,
  VISITOR_SESSION,
} from '../support/e2e-fixtures.ts';

const DATABASE_NAME = 'zichaoyang-com';
const FIXED_SEED_TIMESTAMP = '2026-11-01T00:00:00.000Z';
const FAR_FUTURE_EXPIRY = '2099-01-01T00:00:00.000Z';

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sessionTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sessionInsert(session: typeof VISITOR_SESSION): string {
  return `INSERT INTO sessions (id_hash, github_user_id, github_login, github_avatar_url, encrypted_access_token, created_at, expires_at)
VALUES (${[
    sqlString(sessionTokenHash(session.token)),
    String(session.githubUserId),
    sqlString(session.githubLogin),
    sqlString(session.avatarUrl),
    'NULL',
    sqlString(FIXED_SEED_TIMESTAMP),
    sqlString(FAR_FUTURE_EXPIRY),
  ].join(', ')});`;
}

function pendingCommentInsert(): string {
  return `INSERT INTO comments (id, page_path, body, author_kind, author_name, github_login, github_avatar_url, status, created_at)
VALUES (${[
    sqlString(SEEDED_PENDING_COMMENT.id),
    sqlString(COMMENT_TEST_PAGE),
    sqlString(SEEDED_PENDING_COMMENT.body),
    sqlString('anonymous'),
    sqlString(SEEDED_PENDING_COMMENT.authorName),
    'NULL',
    'NULL',
    sqlString('pending'),
    sqlString(FIXED_SEED_TIMESTAMP),
  ].join(', ')});`;
}

function runWrangler(args: string[]) {
  execFileSync(
    'npx',
    ['wrangler', ...args, '--local', '--persist-to', E2E_PERSIST_DIRECTORY, '--config', 'wrangler.jsonc'],
    {
      stdio: 'inherit',
      env: { ...process.env, CI: 'true' },
    },
  );
}

rmSync(E2E_PERSIST_DIRECTORY, { recursive: true, force: true });
runWrangler(['d1', 'migrations', 'apply', DATABASE_NAME]);

const seedDirectory = mkdtempSync(join(tmpdir(), 'e2e-seed-'));
const seedFile = join(seedDirectory, 'seed.sql');
writeFileSync(
  seedFile,
  [sessionInsert(VISITOR_SESSION), sessionInsert(ADMIN_SESSION), pendingCommentInsert()].join('\n'),
);
try {
  runWrangler(['d1', 'execute', DATABASE_NAME, '--file', seedFile]);
} finally {
  rmSync(seedDirectory, { recursive: true, force: true });
}
