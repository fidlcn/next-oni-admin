let nextId = 5;

export const mockCategories = [
  {
    id: 1,
    name: '技术文章',
    type: 'article',
    description: '技术相关的文章',
    parentId: null,
    sort: 0,
    status: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: '产品动态',
    type: 'article',
    description: '产品相关动态',
    parentId: null,
    sort: 1,
    status: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    name: '前端开发',
    type: 'article',
    description: '前端开发相关',
    parentId: 1,
    sort: 0,
    status: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 4,
    name: '后端开发',
    type: 'article',
    description: '后端开发相关',
    parentId: 1,
    sort: 1,
    status: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

export function getNextCategoryId() {
  return nextId++;
}
