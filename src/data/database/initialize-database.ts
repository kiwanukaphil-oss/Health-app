import type { SQLiteDatabase } from 'expo-sqlite';

import { getOrCreateDatabaseKey } from '@/data/database/database-key';
import { databaseMigrations } from '@/data/database/migrations';

type UserVersionRow = {
  user_version: number;
};

type DatabaseIntegrityRow = {
  quick_check: string;
};

export function isDatabaseIntegrityHealthy(rows: readonly DatabaseIntegrityRow[]) {
  return rows.length === 1 && rows[0]?.quick_check === 'ok';
}

/** Applies ordered schema changes atomically so interrupted upgrades cannot leave a partial database. */
async function runPendingDatabaseMigrations(database: SQLiteDatabase) {
  const versionRow = await database.getFirstAsync<UserVersionRow>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;
  const pendingMigrations = databaseMigrations.filter(
    (migration) => migration.version > currentVersion,
  );

  for (const migration of pendingMigrations) {
    await database.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await database.execAsync(statement);
      }
      await database.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
  }
}

/** Unlocks SQLCipher before enabling constraints and applying the latest local schema. */
export async function initializeLittleGainsDatabase(database: SQLiteDatabase) {
  const databaseKey = await getOrCreateDatabaseKey();
  await database.execAsync(`PRAGMA key = '${databaseKey}';`);
  await database.execAsync('PRAGMA foreign_keys = ON;');
  await database.execAsync('PRAGMA journal_mode = WAL;');
  await database.execAsync('PRAGMA secure_delete = ON;');
  await runPendingDatabaseMigrations(database);
  const integrityRows = await database.getAllAsync<DatabaseIntegrityRow>('PRAGMA quick_check;');
  if (!isDatabaseIntegrityHealthy(integrityRows)) {
    throw new Error('The encrypted local database did not pass its integrity check.');
  }
}
