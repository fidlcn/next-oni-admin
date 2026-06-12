import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * 刷新令牌表 —— 实现 7 天「记住登录」功能
 * 每个 Refresh Token 对应一条记录，支持服务端主动吊销（revokedAt 非空即已吊销）
 * Token 轮换策略：每次刷新后旧 Token 被吊销，生成新 Token
 */
@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Column({ name: 'user_id', comment: '关联用户 ID' })
  userId: number;

  @Column({ length: 500, unique: true, comment: 'Token 值（UUID v4）' })
  token: string;

  @Column({
    name: 'expires_at',
    type: 'datetime',
    comment: '过期时间，创建时 +7 天',
  })
  expiresAt: Date;

  @Column({
    name: 'revoked_at',
    type: 'datetime',
    nullable: true,
    comment: '吊销时间，非空表示该 Token 已失效',
  })
  revokedAt: Date;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
