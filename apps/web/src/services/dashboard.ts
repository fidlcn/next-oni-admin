import request from './request';

/** Dashboard 统计 API */
export function getDashboardStats() {
  return request.get('/dashboard/stats');
}
