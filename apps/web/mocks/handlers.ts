import { http, HttpResponse } from 'msw';
import { mockUsers, getNextUserId } from './data/user';
import { mockRoles, getNextRoleId } from './data/role';
import { mockMenus, getNextMenuId } from './data/menu';
import { mockCategories, getNextCategoryId } from './data/category';
import { mockContents, getNextContentId } from './data/content';
import { mockMedia, getNextMediaId } from './data/media';
import { mockDashboardStats } from './data/dashboard';

const BASE = '/v1';

function ok(data: unknown) {
  return HttpResponse.json({ code: 0, message: 'ok', data });
}

function paginate(list: unknown[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return {
    list: list.slice(start, start + pageSize),
    total: list.length,
    page,
    pageSize,
  };
}

export const handlers = [
  // ==================== Auth ====================
  http.post(`${BASE}/auth/login`, async () => {
    const user = mockUsers[0];
    // MSW 无法真正设置 httpOnly cookie，但 mock 模式下前端不依赖 cookie
    return ok({ user });
  }),

  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;
    const newUser = {
      id: getNextUserId(),
      username: body.username,
      email: body.email || null,
      phone: body.phone || null,
      avatar: null,
      status: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      roles: [],
    };
    mockUsers.push(newUser);
    return ok({ user: newUser });
  }),

  http.get(`${BASE}/auth/profile`, () => {
    return ok(mockUsers[0]);
  }),

  http.post(`${BASE}/auth/logout`, () => {
    return ok(null);
  }),

  http.post(`${BASE}/auth/refresh`, () => {
    // Mock: 刷新成功，返回用户信息（实际 Token 由 cookie 管理）
    return ok({ user: mockUsers[0] });
  }),

  // ==================== Users ====================
  http.get(`${BASE}/users`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 10;
    const keyword = url.searchParams.get('keyword') || '';
    const filtered = keyword
      ? mockUsers.filter((u) => u.username.includes(keyword))
      : mockUsers;
    return ok(paginate(filtered, page, pageSize));
  }),

  http.get(`${BASE}/users/:id`, ({ params }) => {
    const user = mockUsers.find((u) => u.id === Number(params.id));
    return user
      ? ok(user)
      : HttpResponse.json(
          { code: 404, message: '用户不存在' },
          { status: 404 },
        );
  }),

  http.post(`${BASE}/users`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const user = {
      id: getNextUserId(),
      username: body.username,
      email: body.email || null,
      phone: body.phone || null,
      avatar: null,
      status: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      roles: [],
    };
    mockUsers.push(user);
    return ok(user);
  }),

  http.put(`${BASE}/users/:id`, async ({ params, request }) => {
    const idx = mockUsers.findIndex((u) => u.id === Number(params.id));
    if (idx === -1)
      return HttpResponse.json(
        { code: 404, message: '用户不存在' },
        { status: 404 },
      );
    const body = (await request.json()) as Record<string, unknown>;
    Object.assign(mockUsers[idx], body, {
      updatedAt: new Date().toISOString(),
    });
    return ok(mockUsers[idx]);
  }),

  http.delete(`${BASE}/users/:id`, ({ params }) => {
    const idx = mockUsers.findIndex((u) => u.id === Number(params.id));
    if (idx !== -1) mockUsers.splice(idx, 1);
    return ok({ message: '删除成功' });
  }),

  http.put(`${BASE}/users/:id/reset-password`, () => {
    return ok({ message: '密码已重置' });
  }),

  // ==================== Roles ====================
  http.get(`${BASE}/roles`, () => {
    return ok(mockRoles);
  }),

  http.get(`${BASE}/roles/:id`, ({ params }) => {
    const role = mockRoles.find((r) => r.id === Number(params.id));
    return role
      ? ok(role)
      : HttpResponse.json(
          { code: 404, message: '角色不存在' },
          { status: 404 },
        );
  }),

  http.post(`${BASE}/roles`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const role = {
      id: getNextRoleId(),
      name: body.name,
      description: body.description || '',
      sort: body.sort || 0,
      status: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: [],
    };
    mockRoles.push(role);
    return ok(role);
  }),

  http.put(`${BASE}/roles/:id`, async ({ params, request }) => {
    const idx = mockRoles.findIndex((r) => r.id === Number(params.id));
    if (idx === -1)
      return HttpResponse.json(
        { code: 404, message: '角色不存在' },
        { status: 404 },
      );
    const body = (await request.json()) as Record<string, unknown>;
    Object.assign(mockRoles[idx], body, {
      updatedAt: new Date().toISOString(),
    });
    return ok(mockRoles[idx]);
  }),

  http.delete(`${BASE}/roles/:id`, ({ params }) => {
    const idx = mockRoles.findIndex((r) => r.id === Number(params.id));
    if (idx !== -1) mockRoles.splice(idx, 1);
    return ok({ message: '删除成功' });
  }),

  // ==================== Menus ====================
  http.get(`${BASE}/menus/tree`, () => {
    return ok(mockMenus);
  }),

  http.get(`${BASE}/menus`, () => {
    return ok(mockMenus);
  }),

  http.post(`${BASE}/menus`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const menu = {
      id: getNextMenuId(),
      name: body.name,
      path: body.path || '',
      icon: body.icon || '',
      type: body.type || 'menu',
      parentId: body.parentId || null,
      sort: body.sort || 0,
      status: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      children: [],
    };
    mockMenus.push(menu);
    return ok(menu);
  }),

  http.put(`${BASE}/menus/:id`, async ({ params, request }) => {
    const idx = mockMenus.findIndex((m) => m.id === Number(params.id));
    if (idx === -1)
      return HttpResponse.json(
        { code: 404, message: '菜单不存在' },
        { status: 404 },
      );
    const body = (await request.json()) as Record<string, unknown>;
    Object.assign(mockMenus[idx], body, {
      updatedAt: new Date().toISOString(),
    });
    return ok(mockMenus[idx]);
  }),

  http.delete(`${BASE}/menus/:id`, ({ params }) => {
    const idx = mockMenus.findIndex((m) => m.id === Number(params.id));
    if (idx !== -1) mockMenus.splice(idx, 1);
    return ok({ message: '删除成功' });
  }),

  // ==================== Categories ====================
  http.get(`${BASE}/categories`, () => {
    return ok(mockCategories);
  }),

  http.get(`${BASE}/categories/tree`, () => {
    const tree: typeof mockCategories = [];
    const map = new Map(
      mockCategories.map((c) => [
        c.id,
        { ...c, children: [] as typeof mockCategories },
      ]),
    );
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        tree.push(node as (typeof mockCategories)[number]);
      }
    }
    return ok(tree);
  }),

  http.post(`${BASE}/categories`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const cat = {
      id: getNextCategoryId(),
      name: body.name,
      type: body.type || 'article',
      description: body.description || '',
      parentId: body.parentId || null,
      sort: body.sort || 0,
      status: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCategories.push(cat);
    return ok(cat);
  }),

  http.put(`${BASE}/categories/:id`, async ({ params, request }) => {
    const idx = mockCategories.findIndex((c) => c.id === Number(params.id));
    if (idx === -1)
      return HttpResponse.json(
        { code: 404, message: '分类不存在' },
        { status: 404 },
      );
    const body = (await request.json()) as Record<string, unknown>;
    Object.assign(mockCategories[idx], body, {
      updatedAt: new Date().toISOString(),
    });
    return ok(mockCategories[idx]);
  }),

  http.delete(`${BASE}/categories/:id`, ({ params }) => {
    const idx = mockCategories.findIndex((c) => c.id === Number(params.id));
    if (idx !== -1) mockCategories.splice(idx, 1);
    return ok({ message: '删除成功' });
  }),

  // ==================== Contents ====================
  http.get(`${BASE}/contents`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 10;
    const keyword = url.searchParams.get('keyword') || '';
    const status = url.searchParams.get('status');
    let filtered = mockContents;
    if (keyword) filtered = filtered.filter((c) => c.title.includes(keyword));
    if (status !== null)
      filtered = filtered.filter((c) => c.status === Number(status));
    return ok(paginate(filtered, page, pageSize));
  }),

  http.get(`${BASE}/contents/:id`, ({ params }) => {
    const item = mockContents.find((c) => c.id === Number(params.id));
    return item
      ? ok(item)
      : HttpResponse.json(
          { code: 404, message: '内容不存在' },
          { status: 404 },
        );
  }),

  http.post(`${BASE}/contents`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const item = {
      id: getNextContentId(),
      title: body.title,
      content: body.content || '',
      categoryId: body.categoryId || null,
      cover: body.cover || null,
      status: body.status ?? 0,
      authorId: 1,
      publishedAt: body.status === 1 ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: { id: 1, username: 'admin' },
      category: body.categoryId
        ? {
            id: body.categoryId,
            name:
              mockCategories.find((c) => c.id === body.categoryId)?.name || '',
          }
        : null,
    };
    mockContents.push(item);
    return ok(item);
  }),

  http.put(`${BASE}/contents/:id`, async ({ params, request }) => {
    const idx = mockContents.findIndex((c) => c.id === Number(params.id));
    if (idx === -1)
      return HttpResponse.json(
        { code: 404, message: '内容不存在' },
        { status: 404 },
      );
    const body = (await request.json()) as Record<string, unknown>;
    if (body.status === 1 && mockContents[idx].status !== 1) {
      (body as Record<string, unknown>).publishedAt = new Date().toISOString();
    }
    Object.assign(mockContents[idx], body, {
      updatedAt: new Date().toISOString(),
    });
    return ok(mockContents[idx]);
  }),

  http.put(`${BASE}/contents/batch/status`, async ({ request }) => {
    const body = (await request.json()) as { ids: number[]; status: number };
    body.ids.forEach((id) => {
      const item = mockContents.find((c) => c.id === id);
      if (item) {
        item.status = body.status;
        if (body.status === 1) item.publishedAt = new Date().toISOString();
      }
    });
    return ok({ message: '更新成功' });
  }),

  http.delete(`${BASE}/contents/batch`, async ({ request }) => {
    const body = (await request.json()) as { ids: number[] };
    body.ids.forEach((id) => {
      const idx = mockContents.findIndex((c) => c.id === id);
      if (idx !== -1) mockContents.splice(idx, 1);
    });
    return ok({ message: '删除成功' });
  }),

  http.delete(`${BASE}/contents/:id`, ({ params }) => {
    const idx = mockContents.findIndex((c) => c.id === Number(params.id));
    if (idx !== -1) mockContents.splice(idx, 1);
    return ok({ message: '删除成功' });
  }),

  // ==================== Media ====================
  http.get(`${BASE}/media`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const pageSize = Number(url.searchParams.get('pageSize')) || 10;
    return ok(paginate(mockMedia, page, pageSize));
  }),

  http.post(`${BASE}/media/upload`, async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const item = {
      id: getNextMediaId(),
      filename: file?.name || 'upload.dat',
      originalName: file?.name || 'upload.dat',
      mimeType: file?.type || 'application/octet-stream',
      size: file?.size || 0,
      url: `/uploads/${file?.name || 'upload.dat'}`,
      uploaderId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockMedia.push(item);
    return ok(item);
  }),

  http.delete(`${BASE}/media/:id`, ({ params }) => {
    const idx = mockMedia.findIndex((m) => m.id === Number(params.id));
    if (idx !== -1) mockMedia.splice(idx, 1);
    return ok({ message: '删除成功' });
  }),

  // ==================== Dashboard ====================
  http.get(`${BASE}/dashboard/stats`, () => {
    return ok({
      ...mockDashboardStats,
      userCount: mockUsers.length,
      contentCount: mockContents.length,
      roleCount: mockRoles.length,
    });
  }),
];
