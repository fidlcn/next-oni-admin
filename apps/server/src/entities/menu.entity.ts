import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 菜单表 —— 前端动态路由和侧边栏的数据源
 * type 区分三种节点：directory=目录 menu=页面 link=外链
 * parentId 构成树形层级，前端递归渲染侧边栏
 */
@Entity('menus')
export class Menu extends BaseEntity {
  @Column({ length: 50, comment: '菜单名称' })
  name: string;

  @Column({ length: 200, nullable: true, comment: '路由路径，如 /system/user' })
  path: string;

  @Column({
    length: 50,
    nullable: true,
    comment: '图标名称（对应 Ant Design icon）',
  })
  icon: string;

  @Column({
    name: 'parent_id',
    nullable: true,
    comment: '父菜单 ID，null 表示顶级菜单',
  })
  parentId: number;

  @Column({ default: 0, comment: '排序权重' })
  sort: number;

  @Column({
    type: 'tinyint',
    default: 1,
    comment: '类型：0=目录 1=菜单页面 2=外链',
  })
  type: number;

  @Column({ type: 'tinyint', default: 1, comment: '状态：1=显示 0=隐藏' })
  status: number;

  @Column({
    name: 'permission_code',
    length: 100,
    nullable: true,
    comment: '关联权限编码，控制菜单是否对该用户可见',
  })
  permissionCode: string;

  @ManyToOne(() => Menu, (menu) => menu.children)
  parent: Menu;

  @OneToMany(() => Menu, (menu) => menu.parent)
  children: Menu[];
}
