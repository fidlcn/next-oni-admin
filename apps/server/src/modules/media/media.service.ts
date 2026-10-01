import {
  Injectable,
  NotFoundException,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';

import { Media } from '../../entities/media.entity';
import { QueryMediaDto } from './dto/query-media.dto';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 允许上传的扩展名 → 可接受的 MIME 前缀。
 * SVG 一律拒绝：经同源 /uploads 直接服务会形成存储型 XSS，
 * 其余类型也叠加内容嗅探（魔数）校验，防止改扩展名伪装。
 */
const MEDIA_EXTENSION_RULES: Record<string, string[]> = {
  '.jpg': ['image/'],
  '.jpeg': ['image/'],
  '.png': ['image/'],
  '.gif': ['image/'],
  '.webp': ['image/'],
  '.mp4': ['video/'],
  '.webm': ['video/'],
  '.mov': ['video/'],
  '.pdf': ['application/pdf'],
};

export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;

/** fileFilter 用：扩展名在白名单内且 MIME 与类型相符（octet-stream 放行，交给魔数校验） */
export function isAllowedMediaName(
  originalname: string,
  mimetype: string,
): boolean {
  const ext = path.extname(originalname || '').toLowerCase();
  const expected = MEDIA_EXTENSION_RULES[ext];
  if (!expected) return false;
  if (!mimetype || mimetype === 'application/octet-stream') return true;
  return expected.some((prefix) => mimetype.toLowerCase().startsWith(prefix));
}

/** 魔数（文件头）校验：内容与扩展名不符即拒绝 */
function assertMediaSignature(buffer: Buffer, ext: string): void {
  const checks: Record<string, () => boolean> = {
    '.jpg': () => buffer.subarray(0, 3).toString('hex') === 'ffd8ff',
    '.jpeg': () => buffer.subarray(0, 3).toString('hex') === 'ffd8ff',
    '.png': () => buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a',
    '.gif': () => {
      const head = buffer.subarray(0, 6).toString('latin1');
      return head === 'GIF87a' || head === 'GIF89a';
    },
    '.webp': () =>
      buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
      buffer.subarray(8, 12).toString('latin1') === 'WEBP',
    '.mp4': () => buffer.subarray(4, 8).toString('latin1') === 'ftyp',
    '.mov': () => buffer.subarray(4, 8).toString('latin1') === 'ftyp',
    '.webm': () => buffer.subarray(0, 4).toString('hex') === '1a45dfa3',
    '.pdf': () => buffer.subarray(0, 5).toString('latin1') === '%PDF-',
  };
  const check = checks[ext];
  if (check && !check()) {
    throw new BadRequestException('文件内容与扩展名不符，已拒绝上传');
  }
}

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
  ) {
    // 上传目录：项目根目录下的 uploads/
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /** 上传文件：白名单扩展名（fileFilter 已拦一道）+ 魔数校验 + 服务端生成文件名 */
  async upload(file: Express.Multer.File, uploaderId: number) {
    if (file.size > MEDIA_MAX_BYTES) {
      throw new PayloadTooLargeException('文件大小不能超过 10MB');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!MEDIA_EXTENSION_RULES[ext]) {
      throw new BadRequestException(
        '不支持的文件类型（仅限图片/视频/PDF，不允许 SVG）',
      );
    }
    assertMediaSignature(file.buffer, ext);

    // 时间戳+加密随机串防重名；文件名完全由服务端生成，不信任用户输入
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

    fs.writeFileSync(path.join(this.uploadDir, filename), file.buffer);

    const media = new Media();
    media.name = file.originalname.slice(0, 200);
    media.url = `/uploads/${filename}`;
    media.type = this.getFileType(ext);
    media.size = file.size;
    media.uploaderId = uploaderId;

    return this.mediaRepo.save(media);
  }

  /** 分页查询媒体列表 */
  async findAll(dto: QueryMediaDto) {
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

    // 删除物理文件（basename 防目录穿越）
    const filePath = path.join(this.uploadDir, path.basename(media.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.mediaRepo.remove(media);
    return { message: '删除成功' };
  }

  /** 根据扩展名判断文件类型 */
  private getFileType(ext: string): string {
    if (['.mp4', '.webm', '.mov'].includes(ext)) return 'video';
    if (ext === '.pdf') return 'file';
    return 'image';
  }
}
