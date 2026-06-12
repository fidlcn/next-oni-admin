import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * 角色守卫 —— 基于 RBAC 模型控制接口访问权限
 * 使用方式：
 *   @Roles('admin')          → 只有 admin 角色可访问
 *   @Roles('admin', 'editor') → admin 或 editor 都可访问
 *   不加 @Roles 装饰器则只要求登录即可
 *
 * 必须放在 JwtAuthGuard 之后，依赖 req.user
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 从 @Roles 装饰器获取要求的角色列表
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    // 没有 @Roles 装饰器，说明只要求登录
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      throw new ForbiddenException('权限不足');
    }

    const userRoles = user.roles.map((role: any) => role.name);
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('权限不足');
    }

    return true;
  }
}
