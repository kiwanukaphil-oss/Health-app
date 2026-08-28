import { FoundationScreen } from '@/components/foundation-screen';

/** Reserves the preferences destination for the work-routine and privacy controls planned next. */
export default function YouScreen() {
  return (
    <FoundationScreen
      eyebrow="YOU"
      title="Support that follows your rhythm"
      description="Work hours, accessibility, privacy, and optional connections will be managed here."
      foundationNote="Preference storage is prepared locally; controls arrive with onboarding."
    />
  );
}
