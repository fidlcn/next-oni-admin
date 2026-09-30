/**
 * 托管页生成（pagegen）常量 —— 唯一权威副本
 * apps/web（HostedPages 页）与 apps/site（/gen、/pages）各有一份展示副本，
 * 增改标签/风格时必须三处同步。
 */

/** 主题标签 —— 内容主题维度（不是页面用途），提交时多选 1-3 个 */
export interface PagegenTagDef {
  value: string;
  label: string;
  desc: string;
  /** 示例提示词，用于表单 placeholder 降低使用门槛 */
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

export const PAGEGEN_TAG_VALUES = PAGEGEN_TAGS.map((t) => t.value);

/** 风格 —— design 是注入提示词的具体设计指令，替代光秃秃的风格词 */
export interface PagegenStyleDef {
  value: string;
  label: string;
  design: string;
}

export const PAGEGEN_STYLES: PagegenStyleDef[] = [
  {
    value: 'minimal',
    label: '简约',
    design:
      '大量留白、单一主色、细字重、克制的分隔线，信息密度低，排版节奏舒缓',
  },
  {
    value: 'business',
    label: '商务',
    design: '深蓝/深灰主色、清晰的标题层级、数据卡片与列表、稳重正式的排版',
  },
  {
    value: 'lively',
    label: '活泼',
    design: '明快渐变背景、大圆角卡片、高饱和点缀色、大号标题，节奏轻快',
  },
  {
    value: 'dark',
    label: '暗色',
    design: '深色背景配高对比浅色文字、亮色点缀、现代感强，注意可读性',
  },
  {
    value: 'elegant',
    label: '优雅',
    design: '衬线标题配无衬线正文、低饱和莫兰迪配色、充足留白、细腻间距',
  },
];

export const PAGEGEN_STYLE_VALUES = PAGEGEN_STYLES.map((s) => s.value);

/** 任务状态机：pending → generating → done / failed */
export const PAGEGEN_STATUS = {
  PENDING: 'pending',
  GENERATING: 'generating',
  DONE: 'done',
  FAILED: 'failed',
} as const;

export type PagegenStatus =
  (typeof PAGEGEN_STATUS)[keyof typeof PAGEGEN_STATUS];

export const PAGEGEN_TITLE_MAX = 100;
export const PAGEGEN_CONTENT_MAX = 2000;
export const PAGEGEN_MAX_TAGS = 3;
/** 落盘 HTML 大小上限（字节） */
export const PAGEGEN_HTML_MAX_BYTES = 128 * 1024;
/** pageId 格式：10 位小写字母数字 */
export const PAGEGEN_PAGE_ID_RE = /^[a-z0-9]{10}$/;
/** 口令连续失败锁定阈值（每 IP 每天） */
export const PAGEGEN_CODE_FAIL_LOCK = 20;

/**
 * 敏感词硬词表 —— 备案域名下的合规兜底，仅收录硬性违规词。
 * 可通过环境变量 PAGEGEN_SENSITIVE_EXTRA（逗号分隔）追加，无需改代码。
 */
export const PAGEGEN_SENSITIVE_WORDS: string[] = [
  '赌博',
  '赌球',
  '博彩',
  '六合彩',
  '开盘',
  '下注返水',
  '色情',
  '裸聊',
  '援交',
  '约炮',
  '毒品',
  '冰毒',
  '大麻',
  '溜冰壶',
  '枪支',
  '弹药',
  '雷管',
  '洗钱',
  '跑分',
  '接码平台',
  '银行卡四件套',
  '买卖账号',
  '代开发票',
  '虚开发票',
  '传销',
  '资金盘',
  '杀猪盘',
];
