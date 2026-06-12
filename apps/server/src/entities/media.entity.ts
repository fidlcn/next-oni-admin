import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * 媒体资源表 —— 管理上传的图片、视频、文件
 * type 字段用于前端区分展示图标和预览方式
 * size 存储字节数，方便前端显示文件大小和做配额限制
 */
@Entity('media')
export class Media extends BaseEntity {
  @Column({ length: 200, comment: '文件原始名称' })
  name: string;

  @Column({ length: 500, comment: '文件访问 URL' })
  url: string;

  @Column({
    length: 20,
    comment: '文件类型：image / video / file',
  })
  type: string;

  @Column({ type: 'bigint', comment: '文件大小（字节）' })
  size: number;

  @Column({ name: 'uploader_id', comment: '上传者用户 ID' })
  uploaderId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;
}
