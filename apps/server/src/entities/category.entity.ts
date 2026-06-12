import { Entity, Column, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 分类表 —— CMS 内容的树形分类
 * parentId 构建无限层级树，前端可用级联选择器展示
 * type 区分不同业务线的分类（如 article / product）
 */
@Entity('categories')
export class Category extends BaseEntity {
  @Column({ length: 50, comment: '分类名称' })
  name: string;

  @Column({
    name: 'parent_id',
    nullable: true,
    comment: '父分类 ID，null 表示顶级分类',
  })
  parentId: number;

  @Column({ default: 0, comment: '排序权重' })
  sort: number;

  @Column({ length: 30, default: 'default', comment: '分类类型（按业务区分）' })
  type: string;

  @Column({ type: 'tinyint', default: 1, comment: '状态：1=启用 0=禁用' })
  status: number;

  @ManyToOne(() => Category, (cat) => cat.children)
  parent: Category;

  @OneToMany(() => Category, (cat) => cat.parent)
  children: Category[];
}
