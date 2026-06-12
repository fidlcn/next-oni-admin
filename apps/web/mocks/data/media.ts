let nextId = 4;

export const mockMedia = [
  {
    id: 1,
    filename: 'hero-banner.jpg',
    originalName: 'hero-banner.jpg',
    mimeType: 'image/jpeg',
    size: 102400,
    url: '/uploads/hero-banner.jpg',
    uploaderId: 1,
    createdAt: '2025-03-01T10:00:00.000Z',
    updatedAt: '2025-03-01T10:00:00.000Z',
  },
  {
    id: 2,
    filename: 'logo.png',
    originalName: 'logo.png',
    mimeType: 'image/png',
    size: 20480,
    url: '/uploads/logo.png',
    uploaderId: 1,
    createdAt: '2025-03-05T14:00:00.000Z',
    updatedAt: '2025-03-05T14:00:00.000Z',
  },
  {
    id: 3,
    filename: 'guide.pdf',
    originalName: 'user-guide.pdf',
    mimeType: 'application/pdf',
    size: 512000,
    url: '/uploads/guide.pdf',
    uploaderId: 2,
    createdAt: '2025-04-01T09:00:00.000Z',
    updatedAt: '2025-04-01T09:00:00.000Z',
  },
];

export function getNextMediaId() {
  return nextId++;
}
