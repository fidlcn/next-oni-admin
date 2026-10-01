import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardController } from './dashboard.controller';
import { User } from '../../entities/user.entity';
import { Content } from '../../entities/content.entity';
import { Role } from '../../entities/role.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Content, Role]), AuthModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
