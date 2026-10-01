import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 托管页生成口令表 —— 后台生成、发放给外部使用者
 * - long（长期）：不过期，限制每小时条数（hourlyLimit）
 * - short（短期）：限制总条数（maxUses），用完即失效（状态由用量推导）
 * 同一时间仅允许一个设备占用（activeDeviceId），空闲超时自动释放
 */
@Entity('pagegen_tokens')
@Index(['createdAt'])
export class PagegenToken extends BaseEntity {
  @Column({
    length: 32,
    unique: true,
    comment: '口令本体（随机码，即邀请短链标识）',
  })
  code: string;

  @Column({ length: 100, default: '', comment: '备注名（如：给小王的）' })
  name: string;

  @Column({
    length: 10,
    comment: '类型：long（长期限频）/ short（短期限量）',
  })
  type: 'long' | 'short';

  @Column({
    name: 'hourly_limit',
    type: 'int',
    nullable: true,
    comment: 'long 型：每小时最多生成条数',
  })
  hourlyLimit: number;

  @Column({
    name: 'max_uses',
    type: 'int',
    nullable: true,
    comment: 'short 型：累计最多生成条数',
  })
  maxUses: number;

  @Column({
    length: 16,
    default: 'active',
    comment: '状态：active/disabled（耗尽由用量推导，不落库）',
  })
  status: 'active' | 'disabled';

  @Column({
    name: 'active_device_id',
    length: 64,
    nullable: true,
    comment: '当前占用设备 ID（单设备独占）',
  })
  activeDeviceId: string;

  @Column({
    name: 'device_bound_at',
    type: 'datetime',
    nullable: true,
    comment: '设备绑定时间',
  })
  deviceBoundAt: Date;

  @Column({
    name: 'last_used_at',
    type: 'datetime',
    nullable: true,
    comment: '最近一次提交时间（空闲自动释放依据）',
  })
  lastUsedAt: Date;

  @Column({
    name: 'created_by',
    type: 'int',
    nullable: true,
    comment: '创建管理员用户 ID',
  })
  createdBy: number;
}
