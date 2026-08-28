import { FoundationScreen } from '@/components/foundation-screen';

/** Holds the Stage 1 Today destination without implementing Stage 2 planning behavior early. */
export default function HomeScreen() {
  return (
    <FoundationScreen
      eyebrow="TODAY"
      title="A small day still moves you forward"
      description="Your minimum healthy day will appear here after onboarding is added in Stage 2."
      foundationNote="Navigation, encrypted local storage, and the calm nature-led design system are ready."
    />
  );
}
