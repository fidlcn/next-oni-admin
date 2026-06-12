import { SetMetadata } from '@nestjs/common';

/**
 * 角色装饰器 —— 标记接口所需的角色
 * 搭配 RolesGuard 使用
 *
 * 用法：@Roles('admin', 'editor')
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
