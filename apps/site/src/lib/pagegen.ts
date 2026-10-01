/**
 * 托管页生成（pagegen）前端常量与 API 工具
 * 标签/风格为展示副本 —— 与 server 端
 * apps/server/src/modules/pagegen/pagegen.constants.ts 保持同步
 */

export interface PagegenTagDef {
  value: string;
  label: string;
  desc: string;
  example: string;
}

export const PAGEGEN_TAGS: PagegenTagDef[] = [
  {
    value: 'code',
    label: '编程',
    desc: '代码、技术、开发、AI 工具',
    example:
      '给我的 VSCode 插件做个介绍页：一键格式化、主题切换、支持 20 种语言',
  },
  {
    value: 'life',
    label: '生活',
    desc: '日常、家居、习惯、随笔',
    example: '写一个周末居家露营计划页：装备清单、时间表、注意事项',
  },
  {
    value: 'work',
    label: '工作',
    desc: '职场、效率、团队、招聘',
    example: '做一个团队周报看板页：本周目标、进展、风险与下周计划',
  },
  {
    value: 'study',
    label: '学习',
    desc: '课程、笔记、考试、语言',
    example: '做一份考研英语复习计划页：阶段划分、每日任务、打卡表',
  },
  {
    value: 'business',
    label: '商业',
    desc: '产品、营销、创业、电商',
    example: '为我们的新品咖啡豆做推广页：产地故事、风味描述、限时优惠',
  },
  {
    value: 'design',
    label: '设计',
    desc: '美学、创意、艺术、摄影',
    example: '做一个极简摄影作品集页面：六张作品、标题与一句话说明',
  },
  {
    value: 'travel',
    label: '旅行',
    desc: '攻略、游记、目的地',
    example: '做一份京都三日游攻略页：行程、交通、预算、美食推荐',
  },
  {
    value: 'food',
    label: '美食',
    desc: '食谱、餐厅、探店',
    example: '写一个家常红烧肉食谱页：食材、步骤、小贴士',
  },
  {
    value: 'health',
    label: '健康',
    desc: '运动、养生、医疗科普',
    example: '做一个办公室拉伸指南页：8 个动作、时长、注意事项',
  },
  {
    value: 'fun',
    label: '娱乐',
    desc: '游戏、影视、音乐、爱好',
    example: '为我们的桌游之夜做宣传页：时间地点、游戏列表、报名方式',
  },
  {
    value: 'event',
    label: '活动',
    desc: '邀请函、日程、公告',
    example: '做一份产品发布会邀请函：时间、议程、嘉宾、地点',
  },
  {
    value: 'people',
    label: '人物',
    desc: '个人主页、简历、介绍',
    example: '做一个个人主页：前端工程师、5 年经验、项目与技能栈',
  },
];

export const PAGEGEN_STYLES = [
  { value: 'auto', label: '默认' },
  { value: 'minimal', label: '简约' },
  { value: 'business', label: '商务' },
  { value: 'lively', label: '活泼' },
  { value: 'dark', label: '暗色' },
  { value: 'elegant', label: '优雅' },
] as const;

/**
 * API 基址：生产走 nginx 同源（留空即可）；
 * 本地裸跑 next dev 时可配 NEXT_PUBLIC_API_BASE=http://localhost:3000
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/** 统一处理后端 { code, message, data } 包装 */
export async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.code !== 0) {
    throw new Error(json?.message || `请求失败（${res.status}）`);
  }
  return json.data as T;
}

/** 生成页访问地址（同源相对路径，生产由 nginx /p/ 托管） */
export function pageUrl(pageId: string): string {
  return `${API_BASE}/p/${pageId}.html`;
}

/** 浏览计数埋点（fire-and-forget；GET 以避开匿名访客的 CSRF 拦截） */
export function beaconView(pageId: string): void {
  fetch(`${API_BASE}/v1/pagegen/public/view/${pageId}`).catch(() => {});
}

/**
 * 本设备唯一标识（localStorage 持久化）—— 口令单设备独占的依据。
 * crypto.randomUUID 需安全上下文，非安全环境降级为时间+随机数。
 */
export function getDeviceId(): string {
  const KEY = 'pagegen:device';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** /g 邀请页的口令信息（有效性 + 额度） */
export interface PagegenTokenInfo {
  valid: boolean;
  reason?: 'not_found' | 'disabled' | 'exhausted';
  type?: 'long' | 'short';
  name?: string;
  hourlyLimit?: number;
  maxUses?: number;
  usedTotal?: number;
  hourUsed?: number;
  remainingUses?: number;
  /** 是否被其他设备活跃占用（传了 deviceId 时，绑定本机不算） */
  deviceLocked?: boolean;
  /** 口令当前绑定的就是本机设备 */
  isBoundDevice?: boolean;
}

export function tokenInfo(
  code: string,
  deviceId?: string,
): Promise<PagegenTokenInfo> {
  const qs = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : '';
  return api<PagegenTokenInfo>(
    `/v1/pagegen/token-info/${encodeURIComponent(code)}${qs}`,
  );
}
