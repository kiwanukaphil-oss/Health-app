import type { SQLiteDatabase } from 'expo-sqlite';

import { getOrCreateDatabaseKey } from '@/data/database/database-key';
import { databaseMigrations } from '@/data/database/migrations';

type UserVersionRow = {
  user_version: number;
};

/** Applies ordered schema changes atomically so interrupted upgrades cannot leave a partial database. */
async function runPendingDatabaseMigrations(database: SQLiteDatabase) {
  const versionRow = await database.getFirstAsync<UserVersionRow>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;
  const pendingMigrations = databaseMigrations.filter(
    (migration) => migration.version > currentVersion,
  );

  for (const migration of pendingMigrations) {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      for (const statement of migration.statements) {
        await transaction.execAsync(statement);
      }
      await transaction.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
  }
}

/** Unlocks SQLCipher before enabling constraints and applying the latest local schema. */
export async function initializeLittleGainsDatabase(database: SQLiteDatabase) {
  const databaseKey = await getOrCreateDatabaseKey();
  await database.execAsync(`PRAGMA key = "x'${databaseKey}'";`);
  await database.execAsync('PRAGMA foreign_keys = ON;');
  await database.execAsync('PRAGMA journal_mode = WAL;');
  await runPendingDatabaseMigrations(database);
}
