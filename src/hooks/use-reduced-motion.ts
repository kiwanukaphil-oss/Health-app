import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Tracks the operating-system motion preference so optional transitions never override user comfort. */
export function useReducedMotion() {
  const [isReducedMotionEnabled, setIsReducedMotionEnabled] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => {
      if (isMounted) setIsReducedMotionEnabled(isEnabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReducedMotionEnabled,
    );
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return isReducedMotionEnabled;
}
