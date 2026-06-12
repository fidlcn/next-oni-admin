import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Category } from './category.entity';

/**
 * 内容表 —— CMS 核心业务表，存储文章/页面等内容
 * status 区分草稿(0)和已发布(1)，支持「先保存草稿再发布」的编辑流程
 * content 字段存储富文本 HTML（后期可扩展为 Markdown）
 */
@Entity('contents')
export class Content extends BaseEntity {
  @Column({ length: 200, comment: '标题' })
  title: string;

  @Column({ type: 'longtext', comment: '内容正文（富文本 HTML）' })
  content: string;

  @Column({
    name: 'category_id',
    nullable: true,
    comment: '所属分类 ID',
  })
  categoryId: number;

  @Column({ name: 'author_id', comment: '作者用户 ID' })
  authorId: number;

  @Column({ length: 500, nullable: true, comment: '封面图 URL' })
  cover: string;

  @Column({
    type: 'tinyint',
    default: 0,
    comment: '状态：0=草稿 1=已发布',
  })
  status: number;

  @Column({
    name: 'published_at',
    type: 'datetime',
    nullable: true,
    comment: '发布时间，首次发布时自动填充',
  })
  publishedAt: Date;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;
}
