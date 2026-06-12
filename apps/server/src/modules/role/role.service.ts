import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';

/**
 * 角色服务 —— 管理角色和角色-权限关联
 */
@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private permRepo: Repository<Permission>,
  ) {}

  async findAll() {
    return this.roleRepo.find({
      relations: ['permissions'],
      order: { sort: 'ASC' },
    });
  }

  async findOne(id: number) {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException('角色不存在');
    return role;
  }

  async create(dto: Partial<Role> & { permissionIds?: number[] }) {
    const role = this.roleRepo.create({
      name: dto.name,
      description: dto.description,
      sort: dto.sort || 0,
    });

    if (dto.permissionIds) {
      role.permissions = await this.permRepo.findBy({
        id: In(dto.permissionIds),
      });
    }

    return this.roleRepo.save(role);
  }

  async update(id: number, dto: Partial<Role> & { permissionIds?: number[] }) {
    const role = await this.findOne(id);

    if (dto.name) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.sort !== undefined) role.sort = dto.sort;
    if (dto.status !== undefined) role.status = dto.status;

    // 更新权限关联
    if (dto.permissionIds) {
      role.permissions = await this.permRepo.findBy({
        id: In(dto.permissionIds),
      });
    }

    return this.roleRepo.save(role);
  }

  async remove(id: number) {
    const role = await this.findOne(id);
    await this.roleRepo.remove(role);
    return { message: '删除成功' };
  }
}
