import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * 响应转换拦截器 —— 将 Controller 返回值统一包装成 { code, message, data } 格式
 * 前端只需判断 code === 0 即可知道请求是否成功
 * 如果 Controller 返回的已经是 ApiResponse 结构则不再二次包装
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data: any) => {
        // 如果已经是我们约定的响应格式，直接返回
        if (data && typeof data === 'object' && 'code' in data) {
          return data;
        }

        return {
          code: 0,
          message: 'ok',
          data,
        };
      }),
    );
  }
}
