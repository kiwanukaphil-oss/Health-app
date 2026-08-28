import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DATABASE_KEY_STORAGE_NAME = 'little-gains.database-key.v1';
const DATABASE_KEY_BYTES = 32;

function convertBytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Retrieves the device-bound database key or creates a cryptographically random replacement once. */
export async function getOrCreateDatabaseKey() {
  const existingKey = await SecureStore.getItemAsync(DATABASE_KEY_STORAGE_NAME);
  if (existingKey) {
    return existingKey;
  }

  const randomBytes = await Crypto.getRandomBytesAsync(DATABASE_KEY_BYTES);
  const newDatabaseKey = convertBytesToHex(randomBytes);
  await SecureStore.setItemAsync(DATABASE_KEY_STORAGE_NAME, newDatabaseKey, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return newDatabaseKey;
}
