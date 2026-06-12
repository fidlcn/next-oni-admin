import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 所有实体的公共基类，提供自增主键和审计时间字段
 * 避免每个实体重复定义 id / createdAt / updatedAt
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn({ comment: '自增主键' })
  id: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
