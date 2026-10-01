import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category } from '../../entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

/**
 * 分类服务 —— 管理树形分类结构
 * 用于 CMS 内容的分组（如文章分类、产品分类等）
 */
@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {}

  /** 获取平铺列表 */
  async findAll(type?: string) {
    const where: any = {};
    if (type) where.type = type;
    return this.categoryRepo.find({ where, order: { sort: 'ASC' } });
  }

  /** 获取树形结构 */
  async findTree(type?: string) {
    const list = await this.findAll(type);
    return this.buildTree(list);
  }

  async create(dto: CreateCategoryDto) {
    const category = new Category();
    category.name = dto.name;
    (category as any).parentId = dto.parentId ?? null;
    category.sort = dto.sort ?? 0;
    category.type = dto.type ?? 'default';
    category.status = dto.status ?? 1;
    return this.categoryRepo.save(category);
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('分类不存在');

    if (dto.name !== undefined) category.name = dto.name;
    if (dto.parentId !== undefined) (category as any).parentId = dto.parentId;
    if (dto.sort !== undefined) category.sort = dto.sort;
    if (dto.type !== undefined) category.type = dto.type;
    if (dto.status !== undefined) category.status = dto.status;
    return this.categoryRepo.save(category);
  }

  async remove(id: number) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('分类不存在');
    await this.categoryRepo.remove(category);
    return { message: '删除成功' };
  }

  /** 构建树形结构 */
  private buildTree(categories: Category[]): Category[] {
    const map = new Map<number, Category>();
    const roots: Category[] = [];

    categories.forEach((cat) => map.set(cat.id, { ...cat, children: [] }));
    categories.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
