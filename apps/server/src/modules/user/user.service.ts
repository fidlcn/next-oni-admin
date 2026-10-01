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
import { RefreshToken } from '../../entities/refresh-token.entity';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
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
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  /** 分页查询用户列表，支持按用户名搜索 */
  async findAll(dto: QueryUserDto) {
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

  /** 管理员创建用户 —— 支持分配角色 */
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

  /** 更新用户信息（不含密码；显式字段拷贝，防止 mass-assignment） */
  async update(id: number, dto: UpdateUserDto) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (dto.roleIds) {
      user.roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
    }

    // email/phone/avatar 列可空，实体类型未标 null，沿用 as any 赋值
    if (dto.email !== undefined) (user as any).email = dto.email;
    if (dto.phone !== undefined) (user as any).phone = dto.phone;
    if (dto.avatar !== undefined) (user as any).avatar = dto.avatar;
    if (dto.status !== undefined) user.status = dto.status;

    await this.userRepo.save(user);
    const { password: _pwd2, ...result } = user;
    return result;
  }

  /** 删除用户 —— 禁止自删 / 删除最后一个管理员 */
  async remove(id: number, operatorId?: number) {
    if (operatorId && id === operatorId) {
      throw new BadRequestException('不能删除当前登录的账号');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.roles?.some((r) => r.name === 'admin')) {
      const adminCount = await this.userRepo
        .createQueryBuilder('u')
        .innerJoin('u.roles', 'r')
        .where('r.name = :name', { name: 'admin' })
        .getCount();
      if (adminCount <= 1) {
        throw new BadRequestException('不能删除最后一个管理员账号');
      }
    }

    await this.userRepo.remove(user);
    return { message: '删除成功' };
  }

  /** 重置密码（管理员操作）—— 同时吊销该用户全部会话，防止旧会话残留 */
  async resetPassword(id: number, newPassword: string) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(id, { password: hashedPassword });

    await this.refreshTokenRepo.update(
      { userId: id, revokedAt: null as any },
      { revokedAt: new Date() },
    );
    return { message: '密码已重置' };
  }
}
