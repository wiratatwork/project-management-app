import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // All integration files share one PostgreSQL instance; capping workers
    // avoids connection-pressure flakes (postgres max_connections=100) while
    // keeping the suite fast. minWorkers must accompany maxWorkers.
    minWorkers: 2,
    maxWorkers: 8,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // Only application code counts — not entry points or test infra.
      include: ['src/**/*.js'],
      exclude: ['src/server.js'],
      // Guards against silent regressions: coverage below these thresholds
      // fails the run. Values are measured against the full suite.
      thresholds: {
        statements: 70,
        branches: 55,
        functions: 70,
        lines: 70,
      },
    },
  },
});
