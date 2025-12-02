import { Settings, PipelineStatusState } from './types';
import { SETTINGS_KEY, STATUS_KEY, DEFAULT_SETTINGS } from './constants';
import { encrypt, decrypt } from './utils/crypto';

export async function getSettings(): Promise<Partial<Settings>> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const storedSettings = result[SETTINGS_KEY] || {};
  
  // Decrypt the secret access key if it exists (handles both encrypted and plain text)
  if (storedSettings.secretAccessKey) {
    storedSettings.secretAccessKey = await decrypt(storedSettings.secretAccessKey);
  }
  
  return { ...DEFAULT_SETTINGS, ...storedSettings };
}

export async function saveSettings(settings: Settings): Promise<void> {
  // Create a copy of settings to avoid modifying the original
  const settingsToStore = { ...settings };
  
  // Encrypt the secret access key before storing
  if (settingsToStore.secretAccessKey) {
    settingsToStore.secretAccessKey = await encrypt(settingsToStore.secretAccessKey);
  }
  
  await chrome.storage.local.set({ [SETTINGS_KEY]: settingsToStore });
}

export async function getPipelineStatus(): Promise<PipelineStatusState | null> {
  const result = await chrome.storage.local.get(STATUS_KEY);
  return result[STATUS_KEY] || null;
}

export async function savePipelineStatus(status: PipelineStatusState): Promise<void> {
  await chrome.storage.local.set({ [STATUS_KEY]: status });
}
