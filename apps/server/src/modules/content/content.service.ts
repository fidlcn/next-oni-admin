import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';

import { Content } from '../../entities/content.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * 内容服务 —— CMS 核心模块，管理文章/页面的增删改查
 * 支持草稿/发布状态切换，列表支持分页和搜索
 */
@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private contentRepo: Repository<Content>,
  ) {}

  /** 分页查询内容列表 */
  async findAll(
    dto: PaginationDto & {
      keyword?: string;
      status?: number;
      categoryId?: number;
    },
  ) {
    const { page, pageSize, keyword, status, categoryId } = dto;
    const where: any = {};

    if (keyword) where.title = Like(`%${keyword}%`);
    if (status !== undefined) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    const [list, total] = await this.contentRepo.findAndCount({
      where,
      relations: ['author', 'category'],
      select: {
        author: { id: true, username: true },
        category: { id: true, name: true },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return { list, total, page, pageSize };
  }

  async findOne(id: number) {
    const content = await this.contentRepo.findOne({
      where: { id },
      relations: ['author', 'category'],
    });
    if (!content) throw new NotFoundException('内容不存在');
    return content;
  }

  /** 创建内容 —— 默认为草稿状态 */
  async create(dto: Partial<Content>, authorId: number) {
    const content = new Content();
    Object.assign(content, {
      title: dto.title,
      content: dto.content,
      categoryId: dto.categoryId,
      authorId,
      cover: dto.cover,
      status: dto.status ?? 0, // 默认草稿
      publishedAt: dto.status === 1 ? new Date() : null,
    });

    return this.contentRepo.save(content);
  }

  /** 更新内容 —— 草稿发布时自动填充 publishedAt */
  async update(id: number, dto: Partial<Content>) {
    const content = await this.findOne(id);

    Object.assign(content, {
      title: dto.title,
      content: dto.content,
      categoryId: dto.categoryId,
      cover: dto.cover,
    });

    // 首次发布：从草稿变为已发布时填充发布时间
    if (dto.status === 1 && content.status !== 1) {
      content.publishedAt = new Date();
    }
    if (dto.status !== undefined) content.status = dto.status;

    return this.contentRepo.save(content);
  }

  /** 批量更新状态（批量发布/撤回） */
  async batchUpdateStatus(ids: number[], status: number) {
    await this.contentRepo.update({ id: In(ids) } as any, {
      status,
      publishedAt: status === 1 ? new Date() : (null as any),
    });
    return { message: '更新成功' };
  }

  async remove(id: number) {
    const content = await this.findOne(id);
    await this.contentRepo.remove(content);
    return { message: '删除成功' };
  }

  /** 批量删除 */
  async batchRemove(ids: number[]) {
    await this.contentRepo.delete(ids);
    return { message: '删除成功' };
  }
}
