import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * 全局异常过滤器 —— 捕获所有未处理的异常并统一格式化返回
 * 业务层抛出的 HttpException 会被自动转换成 { code, message, data } 结构
 * 非HttpException异常统一返回500，避免暴露内部错误细节
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 处理 class-validator 的验证错误，提取具体字段错误信息
      if (
        typeof exceptionResponse === 'object' &&
        Array.isArray((exceptionResponse as any).message)
      ) {
        message = (exceptionResponse as any).message.join('; ');
      } else {
        message = (exceptionResponse as any).message || exception.message;
      }
    } else {
      // 非HTTP异常记录完整堆栈，方便排查
      this.logger.error(exception);
    }

    response.status(status).json({
      code: status,
      message,
      data: null,
    });
  }
}
