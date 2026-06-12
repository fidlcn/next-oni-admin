import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { User } from '../../entities/user.entity';
import { Content } from '../../entities/content.entity';
import { Role } from '../../entities/role.entity';
import { OperationLog } from '../../entities/operation-log.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 仪表盘控制器 —— 返回管理后台首页的统计数据
 * 查询各表的计数，给前端 Dashboard 展示
 * 后续可扩展为近 7 天趋势图、实时在线等
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
    @InjectRepository(OperationLog)
    private logRepo: Repository<OperationLog>,
  ) {}

  @Get('stats')
  async getStats() {
    const [userCount, contentCount, roleCount, todayVisits] = await Promise.all(
      [
        this.userRepo.count(),
        this.contentRepo.count(),
        this.roleRepo.count(),
        // 今日操作数（近似为访问量）
        this.logRepo.count({
          where: {
            createdAt: Between(
              new Date(new Date().setHours(0, 0, 0, 0)),
              new Date(),
            ),
          },
        }),
      ],
    );

    return {
      userCount,
      contentCount,
      roleCount,
      todayVisits,
    };
  }
}
