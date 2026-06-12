import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateUserDto } from '../auth/dto/create-user.dto';

/**
 * 用户服务 —— 管理用户的 CRUD 操作
 * 列表查询支持按用户名模糊搜索和分页
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {}

  /** 分页查询用户列表，支持按用户名搜索 */
  async findAll(dto: PaginationDto & { keyword?: string }) {
    const { page, pageSize, keyword } = dto;
    const where: any = {};

    if (keyword) {
      where.username = Like(`%${keyword}%`);
    }

    const [list, total] = await this.userRepo.findAndCount({
      where,
      relations: ['roles'],
      select: [
        'id',
        'username',
        'email',
        'phone',
        'avatar',
        'status',
        'createdAt',
        'updatedAt',
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return { list, total, page, pageSize };
  }

  /** 根据 ID 查询用户详情 */
  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
      select: [
        'id',
        'username',
        'email',
        'phone',
        'avatar',
        'status',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  /** 管理员创建用户 —— 支持 Assign roles */
  async create(dto: CreateUserDto) {
    const exists = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (exists) {
      throw new BadRequestException('用户名已存在');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    let roles: Role[] = [];

    if (dto.roleIds && dto.roleIds.length > 0) {
      roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
    }

    const user = new User();
    user.username = dto.username;
    user.password = hashedPassword;
    (user as any).email = dto.email || null;
    (user as any).phone = dto.phone || null;
    user.roles = roles;

    await this.userRepo.save(user);
    const { password: _pwd1, ...result } = user;
    return result;
  }

  /** 更新用户信息（不含密码） */
  async update(id: number, dto: Partial<User> & { roleIds?: number[] }) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 如果传了 roleIds，更新角色关联
    if (dto.roleIds) {
      const roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
      user.roles = roles;
    }

    Object.assign(user, {
      email: dto.email,
      phone: dto.phone,
      avatar: dto.avatar,
      status: dto.status,
    });

    await this.userRepo.save(user);
    const { password: _pwd2, ...result } = user;
    return result;
  }

  /** 删除用户 */
  async remove(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.userRepo.remove(user);
    return { message: '删除成功' };
  }

  /** 重置密码（管理员操作） */
  async resetPassword(id: number, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(id, { password: hashedPassword });
    return { message: '密码已重置' };
  }
}
