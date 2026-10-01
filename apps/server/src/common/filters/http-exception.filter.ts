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
 *
 * 框架层非 HttpException 的常见错误也映射到正确语义：
 * - csrf-csrf 的 ForbiddenError → 403（缺 token/不匹配是客户端问题，不是 500）
 * - multer 上传错误（超限 → 413，类型拒绝 → 400）
 * - body-parser 超限 → 413
 * 其余未知异常统一 500，避免暴露内部细节
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
      const err = exception as {
        name?: string;
        message?: string;
        code?: string;
        type?: string;
      };

      if (err?.name === 'ForbiddenError') {
        // csrf-csrf 双提交校验失败
        status = HttpStatus.FORBIDDEN;
        message = '安全验证失败，请刷新页面重试';
      } else if (
        err?.name === 'MulterError' &&
        err?.code === 'LIMIT_FILE_SIZE'
      ) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = '文件大小不能超过 10MB';
      } else if (err?.name === 'MulterError') {
        status = HttpStatus.BAD_REQUEST;
        message = `上传失败：${err.code}`;
      } else if (
        err?.type === 'entity.too.large' ||
        err?.message?.includes('request entity too large')
      ) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = '请求体过大';
      } else {
        // 非HTTP异常记录完整堆栈，方便排查
        this.logger.error(exception);
      }
    }

    response.status(status).json({
      code: status,
      message,
      data: null,
    });
  }
}
