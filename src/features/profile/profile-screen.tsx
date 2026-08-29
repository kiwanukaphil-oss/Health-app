import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { ProductHeader } from '@/components/ui/product-header';
import { ScreenShell } from '@/components/ui/screen-shell';
import { Radii, Spacing } from '@/constants/theme';
import { ReminderCenter } from '@/features/reminders/reminder-center';
import { DataSafetyModal } from '@/features/profile/data-safety-modal';
import { ProfileEditor } from '@/features/profile/profile-editor';
import { useTheme } from '@/hooks/use-theme';
import { useAppData } from '@/state/app-data-context';

const weekdayLabels: Readonly<Record<number, string>> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

const priorityLabels = {
  sit_less: 'Sit less',
  move_more: 'Move more',
  mobility: 'Mobility',
  strength: 'Strength',
  energy: 'Energy',
} as const;

const mobilityLabels = {
  standing: 'Standing',
  seated_or_standing: 'Seated or standing',
  seated: 'Seated preferred',
} as const;

/** Makes the app's timing assumptions, privacy posture, and optional calendar boundary explicit. */
export function ProfileScreen() {
  const theme = useTheme();
  const {
    profile,
    reminderPreferences,
    notificationPermissionState,
    nextReminderAt,
  } = useAppData();
  const [reminderCenterVisible, setReminderCenterVisible] = useState(false);
  const [profileEditorVisible, setProfileEditorVisible] = useState(false);
  const [dataSafetyVisible, setDataSafetyVisible] = useState(false);
  const workdayText = profile.workdays.map((day) => weekdayLabels[day]).join(', ');
  const reminderStatus = notificationPermissionState === 'unavailable'
    ? 'Available on mobile'
    : notificationPermissionState === 'denied'
      ? 'Blocked in system settings'
      : reminderPreferences.enabled
        ? 'On'
        : 'Off';

  return (
    <>
      <ScreenShell>
        <ProductHeader eyebrow="YOU" />
        <View style={styles.introduction}>
          <ThemedText type="title">
            {profile.name ? `${profile.name}'s rhythm` : 'Your rhythm'}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            Little Gains works from approximate windows and habits tied to moments you already notice.
          </ThemedText>
        </View>

        <SettingsSection title="Usual workday">
          <SettingRow label="Priorities" value={profile.priorities.map((priority) => priorityLabels[priority]).join(', ')} />
          <SettingRow label="Movement" value={mobilityLabels[profile.mobilityPreference]} />
          <SettingRow label="Days" value={workdayText} />
          <SettingRow label="Working window" value={`${profile.workdayStart} - ${profile.workdayEnd}`} />
          <SettingRow
            label="Lunch window"
            value={`${profile.lunchWindowStart} - ${profile.lunchWindowEnd}`}
          />
          <ActionButton label="Edit my rhythm" onPress={() => setProfileEditorVisible(true)} />
        </SettingsSection>

        <SettingsSection title="Helpful reminders">
          <SettingRow label="Status" value={reminderStatus} />
          <SettingRow label="Support level" value={reminderPreferences.supportLevel} />
          <SettingRow
            label="Next prompt"
            value={nextReminderAt ? new Date(nextReminderAt).toLocaleString() : 'None scheduled'}
          />
          <ThemedText themeColor="textSecondary">
            Meal-related support uses your lunch window, not a guessed meal time. Meeting resets stay manual.
          </ThemedText>
          <ActionButton label="Review reminder support" onPress={() => setReminderCenterVisible(true)} />
        </SettingsSection>

        <SettingsSection title="Calendar boundary">
          <View style={[styles.statusRow, { backgroundColor: theme.backgroundSelected }]}>
            <View style={[styles.statusDot, { backgroundColor: theme.accent }]} />
            <View style={styles.statusCopy}>
              <ThemedText type="smallBold">Calendar not connected</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                No meeting titles, attendees, or notes are being read.
              </ThemedText>
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title="Privacy">
          <SettingRow label="Account" value="Not required" />
          <SettingRow label="Health data" value="Stored on this device" />
          <SettingRow label="Calendar" value="No access" />
          <ThemedText type="small" themeColor="textSecondary">
            Your local database is encrypted on native builds. The browser preview is temporary and resets when refreshed.
          </ThemedText>
          <ActionButton label="Review data & safety" onPress={() => setDataSafetyVisible(true)} />
        </SettingsSection>

        <View style={[styles.safetyCard, { backgroundColor: theme.surfaceWarm }]}>
          <ThemedText type="smallBold">Move within what feels safe</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Stop if an activity causes pain, dizziness, or unusual shortness of breath. Little Gains supports routines;
            it does not replace medical advice.
          </ThemedText>
        </View>
      </ScreenShell>

      {reminderCenterVisible ? (
        <ReminderCenter
          onClose={() => setReminderCenterVisible(false)}
          visible
        />
      ) : null}
      {profileEditorVisible ? (
        <ProfileEditor visible onClose={() => setProfileEditorVisible(false)} />
      ) : null}
      {dataSafetyVisible ? (
        <DataSafetyModal visible onClose={() => setDataSafetyVisible(false)} />
      ) : null}
    </>
  );
}

/** Groups related read-only settings until deliberate editing controls are introduced in a later phase. */
function SettingsSection({ children, title }: { children: ReactNode; title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="primaryStrong">{title.toUpperCase()}</ThemedText>
      <View style={[styles.sectionCard, { borderColor: theme.border }]}>{children}</View>
    </View>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.settingRow}>
      <ThemedText themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold" style={styles.settingValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  introduction: {
    gap: Spacing.one,
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
  },
  section: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  sectionCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.large,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  settingValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radii.medium,
  },
  statusDot: {
    width: 10,
    height: 10,
    marginTop: 5,
    borderRadius: Radii.round,
  },
  statusCopy: {
    flex: 1,
    gap: 2,
  },
  safetyCard: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radii.large,
  },
});
