import { Settings, PipelineStatusState } from './types';

const SETTINGS_KEY = 'settings';
const STATUS_KEY = 'pipelineStatus';

const DEFAULT_SETTINGS: Partial<Settings> = {
  region: 'us-east-1',
  refreshIntervalMs: 60000,
};

export async function getSettings(): Promise<Partial<Settings>> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getPipelineStatus(): Promise<PipelineStatusState | null> {
  const result = await chrome.storage.local.get(STATUS_KEY);
  return result[STATUS_KEY] || null;
}

export async function savePipelineStatus(status: PipelineStatusState): Promise<void> {
  await chrome.storage.local.set({ [STATUS_KEY]: status });
}

