/** Downloads the temporary browser-preview state without uploading it to any service. */
export async function sharePortableLocalData(serializedData: string) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  const dataBlob = new Blob([serializedData], { type: 'application/json' });
  const downloadUrl = URL.createObjectURL(dataBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = 'little-gains-browser-preview-data.json';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);
  return true;
}
