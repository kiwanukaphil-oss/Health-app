import { type ReactNode, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { ProductHeader } from '@/components/ui/product-header';
import { ScreenShell } from '@/components/ui/screen-shell';
import { Radii, Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { useAppData } from '@/state/app-data-context';

type DataSafetyModalProps = {
  visible: boolean;
  onClose: () => void;
};

/** Explains the local data contract and keeps export and irreversible deletion explicitly user-driven. */
export function DataSafetyModal({ visible, onClose }: DataSafetyModalProps) {
  const theme = useTheme();
  const isReducedMotionEnabled = useReducedMotion();
  const { deleteAllLocalData, exportLocalData, notificationPermissionState } = useAppData();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDeletion, setIsConfirmingDeletion] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const exportData = async () => {
    setIsExporting(true);
    setMessage(null);
    try {
      const didOpenExport = await exportLocalData();
      if (!didOpenExport) setMessage('File export is not available on this device or browser.');
    } catch {
      setMessage('Your data export could not be prepared. Nothing was changed.');
    } finally {
      setIsExporting(false);
    }
  };

  const deleteData = async () => {
    setIsDeleting(true);
    setMessage(null);
    try {
      await deleteAllLocalData();
      onClose();
    } catch {
      setMessage('Your data could not be deleted safely. Nothing else was changed.');
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      animationType={isReducedMotionEnabled ? 'none' : 'slide'}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}>
      <ScreenShell>
        <ProductHeader eyebrow="DATA & SAFETY" />
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <ThemedText accessibilityRole="header" type="title">Your data stays yours</ThemedText>
            <ThemedText themeColor="textSecondary">
              Little Gains works without an account, advertising profile, or calendar connection.
            </ThemedText>
          </View>
          <ActionButton label="Close" onPress={onClose} variant="quiet" />
        </View>

        <DataSection title="Stored on this device">
          <ThemedText themeColor="textSecondary">
            Your name, priorities, routine windows, mobility preference, active habits, completed
            actions, reflections, and reminder responses.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Native builds encrypt the local database. Browser-preview data is temporary.
          </ThemedText>
        </DataSection>

        <DataSection title="Not collected">
          <ThemedText themeColor="textSecondary">
            No password, employer access, meeting titles, attendees, notes, precise location,
            medical record, advertising identifier, or cloud analytics profile.
          </ThemedText>
        </DataSection>

        <DataSection title="Permission in use">
          <ThemedText themeColor="textSecondary">
            Notifications: {notificationPermissionState}. Calendar, contacts, location, camera,
            microphone, and health-platform access are not requested.
          </ThemedText>
        </DataSection>

        <View style={[styles.exportCard, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="subtitle">Export a readable copy</ThemedText>
          <ThemedText themeColor="textSecondary">
            The JSON file contains your routine and progress but never the encryption key or
            operating-system notification identifiers. You choose where it goes in the share sheet.
          </ThemedText>
          <ActionButton
            accessibilityHint="Opens the device share sheet with a local JSON file"
            isLoading={isExporting}
            label="Export my data"
            onPress={() => void exportData()}
            variant="secondary"
          />
        </View>

        <View style={[styles.safetyCard, { backgroundColor: theme.surfaceWarm }]}>
          <ThemedText type="subtitle">Movement safety</ThemedText>
          <ThemedText themeColor="textSecondary">
            Use the seated or minimum option whenever needed. Stop for pain, dizziness, chest
            discomfort, or unusual shortness of breath. Little Gains is general wellbeing support,
            not diagnosis, treatment, or medical monitoring.
          </ThemedText>
        </View>

        <View style={[styles.deleteCard, { borderColor: theme.danger }]}>
          <ThemedText type="subtitle" themeColor="danger">Delete all local data</ThemedText>
          <ThemedText themeColor="textSecondary">
            This removes your routine, habits, completions, reflections, and prompt history, cancels
            reminders, and returns the app to onboarding. It cannot be undone.
          </ThemedText>
          {isConfirmingDeletion ? (
            <View accessibilityLiveRegion="assertive" style={styles.confirmationStack}>
              <ThemedText type="smallBold" themeColor="danger">
                Are you sure? Export first if you want to keep a copy.
              </ThemedText>
              <ActionButton
                isLoading={isDeleting}
                label="Delete all data now"
                onPress={() => void deleteData()}
                variant="danger"
              />
              <ActionButton
                disabled={isDeleting}
                label="Keep my data"
                onPress={() => setIsConfirmingDeletion(false)}
                variant="secondary"
              />
            </View>
          ) : (
            <ActionButton
              accessibilityHint="Shows a final confirmation before anything is deleted"
              label="Review deletion"
              onPress={() => setIsConfirmingDeletion(true)}
              variant="secondary"
            />
          )}
        </View>

        {message ? (
          <ThemedText accessibilityLiveRegion="polite" accessibilityRole="alert" themeColor="danger">
            {message}
          </ThemedText>
        ) : null}
      </ScreenShell>
    </Modal>
  );
}

function DataSection({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionCard, { borderColor: theme.border }]}>
      <ThemedText accessibilityRole="header" type="smallBold" themeColor="primaryStrong">
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
  },
  titleCopy: { flex: 1, gap: Spacing.one },
  sectionCard: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.large,
  },
  exportCard: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radii.large,
  },
  safetyCard: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radii.large,
  },
  deleteCard: {
    gap: Spacing.three,
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.large,
  },
  confirmationStack: { gap: Spacing.two },
});
