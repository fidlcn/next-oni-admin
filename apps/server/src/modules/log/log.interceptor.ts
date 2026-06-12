import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OperationLog } from '../../entities/operation-log.entity';
import { LOG_KEY } from './log.decorator';

/**
 * 操作日志拦截器 —— 自动记录标记了 @Log 装饰器的写操作
 * 只记录成功操作，异常由 GlobalExceptionFilter 统一处理
 * detail 字段记录请求参数（不记录响应，避免数据量过大）
 */
@Injectable()
export class LogInterceptor implements NestInterceptor<any, any> {
  private readonly logger = new Logger(LogInterceptor.name);

  constructor(
    private reflector: Reflector,
    @InjectRepository(OperationLog)
    private logRepo: Repository<OperationLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logMeta = this.reflector.get(LOG_KEY, context.getHandler());

    // 没有 @Log 装饰器，跳过日志记录
    if (!logMeta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      tap(() => {
        // 异步写入日志，不阻塞请求响应
        this.logRepo
          .save({
            userId: user?.id || 0,
            username: user?.username || 'anonymous',
            action: logMeta.action,
            module: logMeta.module,
            targetId: request.params?.id || '',
            ip: request.ip || request.connection?.remoteAddress,
            userAgent: request.headers?.['user-agent'] || '',
            detail: JSON.stringify(request.body || {}),
          })
          .catch((err) => {
            // 日志写入失败不应影响正常业务
            this.logger.error('写入操作日志失败', err);
          });
      }),
    );
  }
}
