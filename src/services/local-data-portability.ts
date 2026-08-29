import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes an explicit temporary JSON export and opens the operating-system share sheet. */
export async function sharePortableLocalData(serializedData: string) {
  if (!(await Sharing.isAvailableAsync())) return false;
  const exportFile = new File(
    Paths.cache,
    `little-gains-data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  );
  exportFile.create();
  exportFile.write(serializedData);
  await Sharing.shareAsync(exportFile.uri, {
    dialogTitle: 'Export Little Gains data',
    mimeType: 'application/json',
    UTI: 'public.json',
  });
  return true;
}
