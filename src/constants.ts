import { Settings } from './types';

export const STATUS_COLORS: Record<string, string> = {
  'Succeeded': '#28a745',
  'Failed': '#dc3545',
  'InProgress': '#fd7e14',
  'Stopped': '#6c757d',
  'Cancelled': '#6c757d',
  'Superseded': '#6c757d'
};

export const DEFAULT_STATUS_COLOR = '#6c757d';

export const ALARM_NAME = 'poll_codepipeline';

export const SETTINGS_KEY = 'settings';
export const STATUS_KEY = 'pipelineStatus';

export const DEFAULT_SETTINGS: Partial<Settings> = {
  region: 'ap-southeast-2',
  refreshIntervalMs: 180000,
};

