import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OperationLog } from '../../entities/operation-log.entity';
import { LogInterceptor } from './log.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([OperationLog])],
  providers: [LogInterceptor],
  exports: [LogInterceptor],
})
export class LogModule {}
