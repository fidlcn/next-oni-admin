import { Entity, Column, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Permission } from './permission.entity';

/**
 * 角色表 —— RBAC 权限模型的核心
 * 用户通过 user_roles 关联到角色，角色通过 role_permissions 关联到权限
 * sort 字段控制角色在 UI 中的显示顺序
 */
@Entity('roles')
export class Role extends BaseEntity {
  @Column({ length: 50, unique: true, comment: '角色名称，如 admin / editor' })
  name: string;

  @Column({ length: 200, nullable: true, comment: '角色描述' })
  description: string;

  @Column({ default: 0, comment: '排序权重，越小越靠前' })
  sort: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态：1=启用 0=禁用' })
  status: number;

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @ManyToMany(() => Permission, (perm) => perm.roles, { cascade: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id' },
    inverseJoinColumn: { name: 'permission_id' },
  })
  permissions: Permission[];
}
