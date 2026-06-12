import request from './request';

/**
 * 菜单管理 API
 */

/** 获取当前用户的动态菜单树 —— 前端路由数据源 */
export function getMenuTree() {
  return request.get('/menus/tree');
}

/** 获取所有菜单（管理用） */
export function getAllMenus() {
  return request.get('/menus');
}

export function createMenu(data: any) {
  return request.post('/menus', data);
}

export function updateMenu(id: number, data: any) {
  return request.put(`/menus/${id}`, data);
}

export function deleteMenu(id: number) {
  return request.delete(`/menus/${id}`);
}
