let nextId = 4;

export const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    phone: '13800000001',
    avatar: null,
    status: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    roles: [{ id: 1, name: 'admin', permissions: [{ code: 'all' }] }],
  },
  {
    id: 2,
    username: 'editor',
    email: 'editor@example.com',
    phone: '13800000002',
    avatar: null,
    status: 1,
    createdAt: '2025-02-01T00:00:00.000Z',
    updatedAt: '2025-02-01T00:00:00.000Z',
    roles: [
      { id: 2, name: 'editor', permissions: [{ code: 'content:write' }] },
    ],
  },
  {
    id: 3,
    username: 'viewer',
    email: 'viewer@example.com',
    phone: '13800000003',
    avatar: null,
    status: 1,
    createdAt: '2025-03-01T00:00:00.000Z',
    updatedAt: '2025-03-01T00:00:00.000Z',
    roles: [],
  },
];

export function getNextUserId() {
  return nextId++;
}
