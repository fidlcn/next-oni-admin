import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Roles } from '../../guards/permissions.guard';
import { RolesGuard } from '../../guards/roles.guard';

/** 类级 @Roles（user/role/menu controller 的用法）—— 曾因只查 handler 而静默失效 */
@Roles('admin')
class DummyController {
  // 方法上不加 @Roles，角色要求应继承类级标记
  handler() {}
  // 方法级 @Roles 覆盖类级
  @Roles('admin', 'editor')
  handlerWithOverride() {}
}

class NoRolesController {
  handler() {}
}

function makeContext(
  handler: (...args: unknown[]) => unknown,
  clazz: new () => unknown,
  user: unknown,
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
    getClass: () => clazz,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('类级 @Roles 对未标记的方法生效（admin 通过）', () => {
    const ctx = makeContext(
      DummyController.prototype.handler,
      DummyController,
      { roles: [{ name: 'admin' }] },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('类级 @Roles 对未标记的方法生效（非 admin 拒绝）', () => {
    const ctx = makeContext(
      DummyController.prototype.handler,
      DummyController,
      { roles: [{ name: 'user' }] },
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('无角色信息的用户拒绝', () => {
    const ctx = makeContext(
      DummyController.prototype.handler,
      DummyController,
      { roles: [] },
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('req.user 缺失时拒绝', () => {
    const ctx = makeContext(
      DummyController.prototype.handler,
      DummyController,
      null,
    );
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('方法级 @Roles 覆盖类级（editor 通过）', () => {
    const ctx = makeContext(
      DummyController.prototype.handlerWithOverride,
      DummyController,
      { roles: [{ name: 'editor' }] },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('没有 @Roles 标记的接口只要登录即可', () => {
    const ctx = makeContext(
      NoRolesController.prototype.handler,
      NoRolesController,
      { roles: [] },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
