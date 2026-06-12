import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 系统设置表 —— KV 结构存储全局配置
 * group 字段将设置按功能分组（如 site / email / storage）
 * key 在 group 内唯一，前端按 group 加载整组配置
 */
@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn({ comment: '自增主键' })
  id: number;

  @Column({ length: 100, unique: true, comment: '设置键，全局唯一' })
  key: string;

  @Column({ type: 'text', nullable: true, comment: '设置值（字符串或 JSON）' })
  value: string;

  @Column({ length: 30, default: 'default', comment: '设置分组' })
  group: string;

  @Column({ length: 200, nullable: true, comment: '设置说明' })
  description: string;
}
