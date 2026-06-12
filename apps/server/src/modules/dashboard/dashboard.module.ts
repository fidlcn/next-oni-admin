import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardController } from './dashboard.controller';
import { User } from '../../entities/user.entity';
import { Content } from '../../entities/content.entity';
import { Role } from '../../entities/role.entity';
import { OperationLog } from '../../entities/operation-log.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Content, Role, OperationLog]),
    AuthModule,
  ],
  controllers: [DashboardController],
})
export class DashboardModule {}
