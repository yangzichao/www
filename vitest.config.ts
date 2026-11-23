import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { respondLikeStaticAssets } from './tests/support/published-pages.ts';
import {
  ALWAYS_PASSING_TURNSTILE_SECRET,
  TEST_GITHUB_CLIENT_SECRET,
  TEST_TOKEN_ENCRYPTION_KEY,
} from './tests/support/test-secrets.ts';

process.env.TZ = 'UTC';

const FIXED_SHUFFLE_SEED = 20261122;
const WORKER_COMPATIBILITY_DATE = '2026-11-17';

const fromRoot = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  resolve: { alias: { '@': fromRoot('./src') } },
  test: {
    sequence: { shuffle: { files: false, tests: true }, seed: FIXED_SHUFFLE_SEED },
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
    allowOnly: false,
    passWithNoTests: false,
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/content.config.ts', 'src/data/**', 'src/scripts/effects/**'],
      reporter: ['text-summary', 'html', 'lcov'],
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 97 },
    },
    projects: [
      {
        extends: true,
        resolve: { alias: { 'astro:content': fromRoot('./tests/support/astro-content-stub.ts') } },
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' },
      },
      {
        extends: true,
        test: {
          name: 'components',
          include: ['tests/components/**/*.test.{ts,tsx}'],
          environment: 'happy-dom',
          environmentOptions: {
            happyDOM: {
              url: 'http://localhost/blog/physics/test-post/',
              settings: {
                disableJavaScriptFileLoading: true,
                disableComputedStyleRendering: true,
              },
            },
          },
          setupFiles: ['tests/components/setup-testing-library.ts'],
        },
      },
      {
        extends: true,
        plugins: [
          cloudflareTest(async () => ({
            miniflare: {
              compatibilityDate: WORKER_COMPATIBILITY_DATE,
              compatibilityFlags: ['global_fetch_strictly_public'],
              d1Databases: ['DB'],
              serviceBindings: { ASSETS: respondLikeStaticAssets },
              bindings: {
                GITHUB_CLIENT_SECRET: TEST_GITHUB_CLIENT_SECRET,
                TOKEN_ENCRYPTION_KEY: TEST_TOKEN_ENCRYPTION_KEY,
                TURNSTILE_SECRET_KEY: ALWAYS_PASSING_TURNSTILE_SECRET,
                TEST_MIGRATIONS: await readD1Migrations(fromRoot('./migrations')),
              },
            },
          })),
        ],
        test: {
          name: 'workers',
          include: ['tests/workers/**/*.test.ts'],
          setupFiles: ['tests/workers/apply-migrations.ts'],
        },
      },
    ],
  },
});
