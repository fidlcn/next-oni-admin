import request from './request';

/** 媒体管理 API */
export function getMediaList(params: any) {
  return request.get('/media', { params });
}

export function uploadMedia(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // 10MB 文件在慢网络下 15s 全局超时会中断，上传单独放宽到 120s
    timeout: 120000,
  });
}

export function deleteMedia(id: number) {
  return request.delete(`/media/${id}`);
}
