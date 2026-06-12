let nextId = 3;

export const mockRoles = [
  {
    id: 1,
    name: 'admin',
    description: '超级管理员',
    sort: 0,
    status: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    permissions: [],
  },
  {
    id: 2,
    name: 'editor',
    description: '编辑',
    sort: 1,
    status: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    permissions: [],
  },
];

export function getNextRoleId() {
  return nextId++;
}
