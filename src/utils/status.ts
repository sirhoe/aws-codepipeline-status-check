import { STATUS_COLORS, DEFAULT_STATUS_COLOR } from '../constants';

export const getStatusColor = (status: string) => {
  return STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;
};


