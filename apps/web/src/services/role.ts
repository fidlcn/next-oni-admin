import request from './request';

/**
 * 角色管理 API
 */

export function getRoles() {
  return request.get('/roles');
}

export function getRole(id: number) {
  return request.get(`/roles/${id}`);
}

export function createRole(data: any) {
  return request.post('/roles', data);
}

export function updateRole(id: number, data: any) {
  return request.put(`/roles/${id}`, data);
}

export function deleteRole(id: number) {
  return request.delete(`/roles/${id}`);
}
