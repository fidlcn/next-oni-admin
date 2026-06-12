import request from './request';

/** 内容管理 API */
export function getContents(params: any) {
  return request.get('/contents', { params });
}

export function getContent(id: number) {
  return request.get(`/contents/${id}`);
}

export function createContent(data: any) {
  return request.post('/contents', data);
}

export function updateContent(id: number, data: any) {
  return request.put(`/contents/${id}`, data);
}

export function deleteContent(id: number) {
  return request.delete(`/contents/${id}`);
}

/** 批量更新状态 */
export function batchContentStatus(ids: number[], status: number) {
  return request.put('/contents/batch/status', { ids, status });
}

/** 批量删除 */
export function batchDeleteContents(ids: number[]) {
  return request.delete('/contents/batch', { data: { ids } });
}
