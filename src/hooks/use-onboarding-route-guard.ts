import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';

/** Returns users to the onboarding host whenever local profile data is absent or deleted. */
export function useOnboardingRouteGuard(isLoading: boolean, onboardingComplete: boolean) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || onboardingComplete || pathname === '/') return;
    router.replace('/');
  }, [isLoading, onboardingComplete, pathname, router]);
}
