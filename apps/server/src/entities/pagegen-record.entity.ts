import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 托管页生成记录表 —— 每次提交生成一条记录
 * 生成的 HTML 落盘在 apps/server/pages/{pageId}.html（uploads 之外，
 * 仅由 nginx 在主站 /p/ 路径暴露，带 CSP）
 */
@Entity('pagegen_records')
@Index(['ip', 'createdAt'])
@Index(['tokenId', 'createdAt'])
export class PagegenRecord extends BaseEntity {
  @Column({
    name: 'page_id',
    length: 16,
    unique: true,
    comment: '页面 ID（URL 标识）',
  })
  pageId: string;

  @Column({ length: 100, comment: '页面标题' })
  title: string;

  @Column({ type: 'simple-json', comment: '主题标签（预设内 1-3 个）' })
  tags: string[];

  @Column({ length: 32, comment: '风格标识' })
  style: string;

  @Column({ type: 'text', comment: '用户输入的正文（提示词主体）' })
  content: string;

  @Column({
    length: 20,
    default: 'pending',
    comment: '状态：pending/generating/done/failed',
  })
  status: string;

  @Column({ type: 'text', nullable: true, comment: '失败原因（友好文案）' })
  error: string;

  @Column({ length: 64, nullable: true, comment: '提交者 IP' })
  ip: string;

  @Column({ length: 64, nullable: true, comment: '生成使用的模型' })
  model: string;

  @Column({
    name: 'token_id',
    type: 'int',
    nullable: true,
    comment: '使用的口令 ID（null = 管理员 env 口令）',
  })
  tokenId: number;

  @Column({
    name: 'device_id',
    length: 64,
    nullable: true,
    comment: '提交设备 ID（前端 localStorage 持久化）',
  })
  deviceId: string;

  @Column({
    name: 'tokens_in',
    type: 'int',
    default: 0,
    comment: '输入 tokens',
  })
  tokensIn: number;

  @Column({
    name: 'tokens_out',
    type: 'int',
    default: 0,
    comment: '输出 tokens',
  })
  tokensOut: number;

  @Column({
    type: 'int',
    default: 0,
    comment: '浏览数（目录页/结果页点击埋点，近似值）',
  })
  views: number;

  // ===== 提交设备特征（UA 解析，管理端独立列展示）=====

  @Column({
    name: 'device_type',
    length: 16,
    nullable: true,
    comment: '设备类型：mobile/tablet/desktop',
  })
  deviceType: string;

  @Column({
    length: 64,
    nullable: true,
    comment: '浏览器（名称+主版本，如 Chrome 129）',
  })
  browser: string;

  @Column({
    length: 64,
    nullable: true,
    comment: '操作系统（如 iOS 17 / Android 14）',
  })
  os: string;

  @Column({
    name: 'device_model',
    length: 64,
    nullable: true,
    comment: '机型（Android 可精确到型号；iOS 仅 iPhone）',
  })
  deviceModel: string;
}
