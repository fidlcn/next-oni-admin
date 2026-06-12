import request from './request';

/**
 * 用户管理 API —— 管理员使用
 */

export interface CreateUserParams {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  roleIds?: number[];
}

export interface UserListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export function getUsers(params: UserListParams) {
  return request.get('/users', { params });
}

export function getUser(id: number) {
  return request.get(`/users/${id}`);
}

export function createUser(data: CreateUserParams) {
  return request.post('/users', data);
}

export function updateUser(id: number, data: any) {
  return request.put(`/users/${id}`, data);
}

export function deleteUser(id: number) {
  return request.delete(`/users/${id}`);
}

export function resetPassword(id: number, password: string) {
  return request.put(`/users/${id}/reset-password`, { password });
}
