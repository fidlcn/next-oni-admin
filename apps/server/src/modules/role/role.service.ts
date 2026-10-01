import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

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

  async create(dto: CreateRoleDto) {
    const exists = await this.roleRepo.findOneBy({ name: dto.name });
    if (exists) {
      throw new BadRequestException('角色名已存在');
    }

    const role = new Role();
    role.name = dto.name;
    (role as any).description = dto.description ?? null;
    role.sort = dto.sort ?? 0;
    role.status = dto.status ?? 1;

    if (dto.permissionIds?.length) {
      role.permissions = await this.permRepo.findBy({
        id: In(dto.permissionIds),
      });
    }

    return this.roleRepo.save(role);
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.findOne(id);

    if (dto.name !== undefined && dto.name !== role.name) {
      const exists = await this.roleRepo.findOneBy({ name: dto.name });
      if (exists && exists.id !== id) {
        throw new BadRequestException('角色名已存在');
      }
      role.name = dto.name;
    }
    if (dto.description !== undefined)
      (role as any).description = dto.description;
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

  /** 删除角色 —— 内置 admin 角色与仍有关联用户的角色不可删 */
  async remove(id: number) {
    const role = await this.findOne(id);

    if (role.name === 'admin') {
      throw new BadRequestException('内置管理员角色不可删除');
    }
    const userCount = await this.roleRepo
      .createQueryBuilder('r')
      .innerJoin('r.users', 'u')
      .where('r.id = :id', { id })
      .getCount();
    if (userCount > 0) {
      throw new BadRequestException(
        `该角色仍绑定 ${userCount} 个用户，请先解除绑定`,
      );
    }

    await this.roleRepo.remove(role);
    return { message: '删除成功' };
  }
}
