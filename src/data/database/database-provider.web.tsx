import * as SplashScreen from 'expo-splash-screen';
import { type PropsWithChildren, useEffect } from 'react';

/** Keeps the optional browser preview working without bundling the mobile-only encrypted database. */
export function AppDatabaseProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return children;
}
