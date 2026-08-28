import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DATABASE_KEY_STORAGE_NAME = 'little-gains.database-key.v1';
const DATABASE_KEY_BYTES = 32;
let databaseKeyInitialization: Promise<string> | null = null;

function convertBytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Reads or creates the device-bound key while one shared promise prevents first-launch key races. */
async function loadOrCreateDatabaseKey() {
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

export function getOrCreateDatabaseKey() {
  databaseKeyInitialization ??= loadOrCreateDatabaseKey();
  return databaseKeyInitialization;
}
