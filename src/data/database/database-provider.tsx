import * as SplashScreen from 'expo-splash-screen';
import {
  SQLiteProvider,
  type SQLiteDatabase,
  type SQLiteOpenOptions,
} from 'expo-sqlite';
import { type PropsWithChildren } from 'react';

import { initializeLittleGainsDatabase } from '@/data/database/initialize-database';

const DATABASE_NAME = 'little-gains.db';
const DATABASE_OPEN_OPTIONS: SQLiteOpenOptions = { useNewConnection: true };

async function prepareNativeDatabase(database: SQLiteDatabase) {
  await initializeLittleGainsDatabase(database);
  await SplashScreen.hideAsync();
}

function reportDatabaseInitializationError(error: Error) {
  console.error('Little Gains could not initialize its encrypted database.', error);
  void SplashScreen.hideAsync();
}

/** Initializes encrypted native persistence before any product route can read or write local data. */
export function AppDatabaseProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onError={reportDatabaseInitializationError}
      onInit={prepareNativeDatabase}
      options={DATABASE_OPEN_OPTIONS}>
      {children}
    </SQLiteProvider>
  );
}
