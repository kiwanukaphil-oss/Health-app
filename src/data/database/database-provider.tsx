import * as SplashScreen from 'expo-splash-screen';
import {
  SQLiteProvider,
  type SQLiteDatabase,
  type SQLiteOpenOptions,
} from 'expo-sqlite';
import { type PropsWithChildren, useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { Colors, Radii, Spacing } from '@/constants/theme';
import { initializeLittleGainsDatabase } from '@/data/database/initialize-database';

const DATABASE_NAME = 'little-gains.db';
const DATABASE_OPEN_OPTIONS: SQLiteOpenOptions = { useNewConnection: true };

/** Initializes encrypted persistence and offers an accessible retry instead of leaving a blank startup screen. */
export function AppDatabaseProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const [databaseInstanceKey, setDatabaseInstanceKey] = useState(0);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  const prepareNativeDatabase = useCallback(async (database: SQLiteDatabase) => {
    setInitializationError(null);
    await initializeLittleGainsDatabase(database);
    await SplashScreen.hideAsync();
  }, []);

  const reportDatabaseInitializationError = useCallback((error: Error) => {
    console.error('Little Gains could not initialize its encrypted database.', error);
    setInitializationError(
      'Your encrypted local data could not be opened safely. Your data has not been changed.',
    );
    void SplashScreen.hideAsync();
  }, []);

  if (initializationError) {
    return (
      <View
        accessibilityLiveRegion="assertive"
        style={[styles.errorPage, { backgroundColor: palette.background }]}>
        <Text accessibilityRole="header" style={[styles.errorTitle, { color: palette.text }]}>
          Little Gains needs another try
        </Text>
        <Text style={[styles.errorCopy, { color: palette.textSecondary }]}>
          {initializationError}
        </Text>
        <Pressable
          accessibilityHint="Tries to open the encrypted local database again"
          accessibilityLabel="Retry opening local data"
          accessibilityRole="button"
          onPress={() => {
            setInitializationError(null);
            setDatabaseInstanceKey((currentKey) => currentKey + 1);
          }}
          style={({ pressed }) => [
            styles.retryButton,
            { backgroundColor: palette.primary, opacity: pressed ? 0.75 : 1 },
          ]}>
          <Text style={[styles.retryLabel, { color: palette.onPrimary }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SQLiteProvider
      key={databaseInstanceKey}
      databaseName={DATABASE_NAME}
      onError={reportDatabaseInitializationError}
      onInit={prepareNativeDatabase}
      options={DATABASE_OPEN_OPTIONS}>
      {children}
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  errorPage: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  errorCopy: {
    fontSize: 16,
    lineHeight: 24,
  },
  retryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.medium,
  },
  retryLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
