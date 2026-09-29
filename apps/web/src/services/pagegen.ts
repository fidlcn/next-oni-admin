import request from './request';

/** 托管页管理 API（与 server 端 /v1/pagegen 对应） */

export function getHostedPages(params: any) {
  return request.get('/pagegen/list', { params });
}

export function getHostedStats() {
  return request.get('/pagegen/stats');
}

export function deleteHostedPage(id: number) {
  return request.delete(`/pagegen/${id}`);
}

/**
 * 标签/风格/状态的展示副本 —— 与 server 端
 * apps/server/src/modules/pagegen/pagegen.constants.ts 保持同步
 */
export const PAGEGEN_TAG_LABELS: Record<string, string> = {
  code: '编程',
  life: '生活',
  work: '工作',
  study: '学习',
  business: '商业',
  design: '设计',
  travel: '旅行',
  food: '美食',
  health: '健康',
  fun: '娱乐',
  event: '活动',
  people: '人物',
};

export const PAGEGEN_STYLE_LABELS: Record<string, string> = {
  minimal: '简约',
  business: '商务',
  lively: '活泼',
  dark: '暗色',
  elegant: '优雅',
};

export const PAGEGEN_STATUS_META: Record<
  string,
  { label: string; color: string }
> = {
  pending: { label: '排队中', color: 'default' },
  generating: { label: '生成中', color: 'processing' },
  done: { label: '已完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
};
