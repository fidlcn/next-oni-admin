import {
  Controller,
  Post,
  Body,
  Get,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { generateCsrfToken } from '../../main';

/**
 * 认证控制器 —— 处理登录、注册、Token 刷新、登出
 * Access Token 和 Refresh Token 均通过 httpOnly cookie 传递，前端 JS 无法读取（防 XSS）
 * 登录接口额外限流：1 分钟内最多 5 次尝试
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /** Cookie 通用选项 — 生产环境绑定 admin 子域名，防止主站读取 */
  private get cookieDomain() {
    return process.env.COOKIE_DOMAIN || undefined;
  }

  /** 获取 RSA 公钥 —— 前端用于加密登录密码 */
  @Get('public-key')
  getPublicKey() {
    return { publicKey: this.authService.getPublicKey() };
  }

  /** 获取 CSRF Token —— 前端首次加载时调用，初始化 CSRF cookie */
  @Get('csrf-token')
  getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = generateCsrfToken(req, res);
    return { token };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ medium: { limit: 5, ttl: 60000 } }) // 登录接口单独限流：1分钟5次
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // Access Token 写入 httpOnly cookie，2 小时有效
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: this.cookieDomain,
      maxAge: 2 * 60 * 60 * 1000, // 2 小时
      path: '/v1',
    });

    // Refresh Token 写入 httpOnly cookie，7 天有效
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: this.cookieDomain,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
      path: '/v1/auth',
    });

    return {
      user: result.user,
    };
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token;
    if (!token) {
      throw new UnauthorizedException('缺少 Refresh Token');
    }

    const result = await this.authService.refreshToken(token);

    // 轮换后新 Access Token 写回 cookie
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: this.cookieDomain,
      maxAge: 2 * 60 * 60 * 1000,
      path: '/v1',
    });

    // 轮换后新 Refresh Token 写回 cookie
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: this.cookieDomain,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/v1/auth',
    });

    return {
      user: result.user,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.id);

    // 清除所有 cookie
    res.clearCookie('access_token', { path: '/v1', domain: this.cookieDomain });
    res.clearCookie('refresh_token', {
      path: '/v1/auth',
      domain: this.cookieDomain,
    });
    return { message: '已退出登录' };
  }

  /** 获取当前登录用户信息 —— 前端初始化时调用 */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return req.user;
  }
}
