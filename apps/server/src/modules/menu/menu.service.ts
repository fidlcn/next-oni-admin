import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Menu } from '../../entities/menu.entity';
import { User } from '../../entities/user.entity';

/**
 * 菜单服务 —— 构建前端动态菜单树
 * 根据用户角色过滤菜单，只返回该用户有权看到的菜单项
 */
@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private menuRepo: Repository<Menu>,
  ) {}

  /** 获取所有菜单（管理用，平铺列表） */
  async findAll() {
    return this.menuRepo.find({ order: { sort: 'ASC' } });
  }

  /**
   * 根据用户权限构建菜单树 —— 前端侧边栏的数据源
   * 只返回用户有权限的菜单，无权限的菜单直接不返回
   */
  async getMenuTreeForUser(user: User) {
    // 获取用户所有权限编码
    const permissionCodes = new Set<string>();
    if (user.roles) {
      user.roles.forEach((role) => {
        if (role.permissions) {
          role.permissions.forEach((perm) => {
            permissionCodes.add(perm.code);
          });
        }
      });
    }

    // admin 角色看所有菜单
    const isAdmin = user.roles?.some((r) => r.name === 'admin');

    const allMenus = await this.menuRepo.find({
      where: { status: 1 },
      order: { sort: 'ASC' },
    });

    // 过滤：admin 全部可见，其他角色按权限过滤
    const visibleMenus = isAdmin
      ? allMenus
      : allMenus.filter(
          (menu) =>
            !menu.permissionCode || permissionCodes.has(menu.permissionCode),
        );

    return this.buildTree(visibleMenus);
  }

  /** 将平铺菜单列表构建成树形结构 */
  private buildTree(menus: Menu[]): Menu[] {
    const map = new Map<number, Menu>();
    const roots: Menu[] = [];

    // 第一遍：建立 id → menu 映射
    menus.forEach((menu) => {
      map.set(menu.id, { ...menu, children: [] });
    });

    // 第二遍：把子节点挂到父节点下
    menus.forEach((menu) => {
      const node = map.get(menu.id)!;
      if (menu.parentId && map.has(menu.parentId)) {
        map.get(menu.parentId)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /** 管理端 CRUD */
  async create(dto: Partial<Menu>) {
    const menu = this.menuRepo.create(dto);
    return this.menuRepo.save(menu);
  }

  async update(id: number, dto: Partial<Menu>) {
    const menu = await this.menuRepo.findOne({ where: { id } });
    if (!menu) throw new NotFoundException('菜单不存在');
    Object.assign(menu, dto);
    return this.menuRepo.save(menu);
  }

  async remove(id: number) {
    const menu = await this.menuRepo.findOne({ where: { id } });
    if (!menu) throw new NotFoundException('菜单不存在');
    await this.menuRepo.remove(menu);
    return { message: '删除成功' };
  }
}
