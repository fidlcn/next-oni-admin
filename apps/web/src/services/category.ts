import request from './request';

/** 分类管理 API */
export function getCategories(type?: string) {
  return request.get('/categories', { params: { type } });
}

export function getCategoryTree(type?: string) {
  return request.get('/categories/tree', { params: { type } });
}

export function createCategory(data: any) {
  return request.post('/categories', data);
}

export function updateCategory(id: number, data: any) {
  return request.put(`/categories/${id}`, data);
}

export function deleteCategory(id: number) {
  return request.delete(`/categories/${id}`);
}
