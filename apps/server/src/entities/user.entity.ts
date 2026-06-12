import { Entity, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from './base.entity';
import { RefreshToken } from './refresh-token.entity';
import { Role } from './role.entity';

/**
 * 用户表 —— 系统的核心身份实体
 * password 存储的是 bcryptjs 哈希值，不存明文
 * loginAttempts + lockUntil 用于登录防暴力破解（5 次失败锁定 15 分钟）
 */
@Entity('users')
export class User extends BaseEntity {
  @Column({ length: 50, unique: true, comment: '用户名，唯一' })
  username: string;

  @Column({ length: 255, select: false, comment: '密码（bcrypt 哈希）' })
  password: string;

  @Column({ length: 100, nullable: true, unique: true, comment: '邮箱' })
  email: string;

  @Column({ length: 20, nullable: true, unique: true, comment: '手机号' })
  phone: string;

  @Column({ length: 500, nullable: true, comment: '头像 URL' })
  avatar: string;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '状态：1=启用 0=禁用',
  })
  status: number;

  @Column({
    name: 'login_attempts',
    default: 0,
    comment: '连续登录失败次数，用于防暴力破解',
  })
  loginAttempts: number;

  @Column({
    name: 'lock_until',
    type: 'datetime',
    nullable: true,
    comment: '锁定截止时间，null 表示未锁定',
  })
  lockUntil: Date;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @ManyToMany(() => Role, (role) => role.users, { cascade: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'role_id' },
  })
  roles: Role[];
}
