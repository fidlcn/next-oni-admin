import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';

import { User } from '../../entities/user.entity';
import { Content } from '../../entities/content.entity';
import { Role } from '../../entities/role.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 仪表盘控制器 —— 返回管理后台首页的统计数据
 * 查询各表的计数，给前端 Dashboard 展示
 */
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Content)
    private contentRepo: Repository<Content>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {}

  @Get('stats')
  async getStats() {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const [userCount, contentCount, roleCount, todayNewContents] =
      await Promise.all([
        this.userRepo.count(),
        this.contentRepo.count(),
        this.roleRepo.count(),
        this.contentRepo.count({
          where: { createdAt: MoreThanOrEqual(todayStart) },
        }),
      ]);

    return {
      userCount,
      contentCount,
      roleCount,
      todayNewContents,
    };
  }
}
