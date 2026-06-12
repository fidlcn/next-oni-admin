import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { Media } from '../../entities/media.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 媒体服务 —— 处理文件上传和管理
 * 本地存储方案：文件保存到 uploads/ 目录，URL 为 /uploads/xxx
 * 2核2G 服务器不上 OSS，本地存储足够用
 */
@Injectable()
export class MediaService {
  private uploadDir: string;

  constructor(
    @InjectRepository(Media)
    private mediaRepo: Repository<Media>,
    private configService: ConfigService,
  ) {
    // 上传目录：项目根目录下的 uploads/
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /** 上传文件 */
  async upload(file: Express.Multer.File, uploaderId: number) {
    // 用时间戳防重名
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    fs.writeFileSync(path.join(this.uploadDir, filename), file.buffer);

    const media = new Media();
    media.name = file.originalname;
    media.url = `/uploads/${filename}`;
    media.type = this.getFileType(ext);
    media.size = file.size;
    media.uploaderId = uploaderId;

    return this.mediaRepo.save(media);
  }

  /** 分页查询媒体列表 */
  async findAll(dto: PaginationDto & { type?: string; keyword?: string }) {
    const { page, pageSize, type, keyword } = dto;
    const where: any = {};
    if (type) where.type = type;
    if (keyword) where.name = Like(`%${keyword}%`);

    const [list, total] = await this.mediaRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return { list, total, page, pageSize };
  }

  async remove(id: number) {
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (!media) throw new NotFoundException('文件不存在');

    // 删除物理文件
    const filePath = path.join(this.uploadDir, path.basename(media.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.mediaRepo.remove(media);
    return { message: '删除成功' };
  }

  /** 根据扩展名判断文件类型 */
  private getFileType(ext: string): string {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const videoExts = ['.mp4', '.avi', '.mov', '.webm'];

    if (imageExts.includes(ext.toLowerCase())) return 'image';
    if (videoExts.includes(ext.toLowerCase())) return 'video';
    return 'file';
  }
}
