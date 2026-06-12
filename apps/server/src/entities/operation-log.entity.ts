import { Entity, Column, CreateDateColumn } from 'typeorm';

/**
 * 操作日志表 —— 记录管理后台的关键操作，用于审计追踪
 * 只记录增删改等写操作，查询不记录（避免日志量爆炸）
 * detail 字段存储 JSON 字符串，记录变更前后的数据差异
 */
@Entity('operation_logs')
export class OperationLog {
  @Column({ primary: true, generated: true, comment: '自增主键' })
  id: number;

  @Column({ name: 'user_id', comment: '操作者用户 ID' })
  userId: number;

  @Column({
    length: 50,
    nullable: true,
    comment: '操作者用户名（冗余，防用户改名后丢失）',
  })
  username: string;

  @Column({ length: 30, comment: '操作类型：create / update / delete / login' })
  action: string;

  @Column({ length: 50, comment: '操作模块：user / role / content 等' })
  module: string;

  @Column({ length: 50, nullable: true, comment: '操作对象 ID' })
  targetId: string;

  @Column({ length: 50, nullable: true, comment: '操作者 IP 地址' })
  ip: string;

  @Column({
    name: 'user_agent',
    length: 500,
    nullable: true,
    comment: '浏览器 User-Agent',
  })
  userAgent: string;

  @Column({ type: 'text', nullable: true, comment: '操作详情（JSON 格式）' })
  detail: string;

  @CreateDateColumn({ name: 'created_at', comment: '操作时间' })
  createdAt: Date;
}
