import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../../entities/user.entity';

/**
 * JWT 认证策略 —— 从 httpOnly cookie 中提取并验证 Access Token
 * validate 方法的返回值会挂到 req.user 上，供后续 Guard 和 Controller 使用
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) => {
          return request?.cookies?.access_token || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  async validate(payload: { sub: number; username: string }) {
    // 每次请求都从数据库取最新用户信息（含角色和权限）
    // 这样权限变更能立即生效，不需要等 Token 过期
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || user.status !== 1) {
      // 返回 null 会让 passport 视为认证通过（req.user = null），
      // 后续依赖 req.user.id 的接口会 500 —— 必须显式抛 401
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }

    return user;
  }
}
