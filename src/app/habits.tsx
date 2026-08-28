import { FoundationScreen } from '@/components/foundation-screen';

/** Reserves the approved Habits destination until habit management is authorized in Stage 2. */
export default function HabitsScreen() {
  return (
    <FoundationScreen
      eyebrow="HABITS"
      title="Keep the routine small enough to remember"
      description="Active habits, their cues, and easier alternatives will live here."
      foundationNote="The route is ready; habit selection and editing belong to Stage 2."
    />
  );
}
