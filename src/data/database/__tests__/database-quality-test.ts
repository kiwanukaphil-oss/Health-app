import { describe, expect, it } from '@jest/globals';

import { isDatabaseIntegrityHealthy } from '@/data/database/initialize-database';
import { databaseMigrations } from '@/data/database/migrations';

describe('database quality gates', () => {
  it('keeps migration versions contiguous and statements non-empty', () => {
    expect(databaseMigrations.map((migration) => migration.version)).toEqual([1, 2, 3, 4]);
    for (const migration of databaseMigrations) {
      expect(migration.description.trim()).not.toBe('');
      expect(migration.statements.length).toBeGreaterThan(0);
      expect(migration.statements.every((statement) => statement.trim().endsWith(';'))).toBe(true);
    }
  });

  it('accepts only the single successful SQLite quick-check result', () => {
    expect(isDatabaseIntegrityHealthy([{ quick_check: 'ok' }])).toBe(true);
    expect(isDatabaseIntegrityHealthy([{ quick_check: 'malformed' }])).toBe(false);
    expect(isDatabaseIntegrityHealthy([])).toBe(false);
  });
});
