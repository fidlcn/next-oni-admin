import { Entity, Column, ManyToOne, ManyToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Role } from './role.entity';

/**
 * 权限表 —— 支持菜单、接口、按钮三种权限粒度
 * parentId 实现树形结构，用于菜单的层级显示
 * code 是权限的唯一标识，如 'user:create' / 'menu:read'
 */
@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ length: 50, comment: '权限显示名称' })
  name: string;

  @Column({ length: 100, unique: true, comment: '权限编码，如 user:create' })
  code: string;

  @Column({
    length: 20,
    comment: '权限类型：menu=菜单可见性 api=接口调用 button=页面按钮',
  })
  type: string;

  @Column({
    name: 'parent_id',
    nullable: true,
    comment: '父权限 ID，用于树形层级',
  })
  parentId: number;

  @Column({ default: 0, comment: '排序权重' })
  sort: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态：1=启用 0=禁用' })
  status: number;

  @ManyToOne(() => Permission, (perm) => perm.children)
  parent: Permission;

  @ManyToMany(() => Permission)
  children: Permission[];

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
