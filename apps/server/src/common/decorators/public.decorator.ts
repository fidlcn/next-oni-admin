import { SetMetadata } from '@nestjs/common';

/**
 * @Public() 装饰器 —— 标记接口为公开访问，无需 JWT 认证
 * 用法：在 Controller 方法或类上添加 @Public()
 *
 * 示例：
 *   @Public()
 *   @Get('blog')
 *   getBlogList() { ... }
 *
 * 默认所有接口需要认证，只有标记 @Public() 的接口可以匿名访问
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
