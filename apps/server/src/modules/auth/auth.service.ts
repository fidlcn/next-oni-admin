import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

import { User } from '../../entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { Role } from '../../entities/role.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';

/**
 * 认证服务 —— 处理登录、注册、Token 刷新、登出
 *
 * 防暴力破解机制：
 *   每次登录失败 loginAttempts+1，达到 5 次后锁定账户 15 分钟
 *   登录成功时重置 loginAttempts 为 0
 *
 * Token 策略：
 *   Access Token 2h 有效（JWT），Refresh Token 7d 有效（UUID + 数据库存储）
 *   刷新时旧 Token 被吊销，生成新 Token（轮换策略）
 *
 * RSA 加密：
 *   服务端启动时生成 2048-bit RSA 密钥对
 *   前端用公钥加密密码，服务端用私钥解密后再 bcrypt.compare
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** RSA 密钥对 —— 启动时生成，进程生命周期内复用 */
  private readonly rsaPublicKey: string;
  private readonly rsaPrivateKey: string;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
    private jwtService: JwtService,
  ) {
    // 启动时生成 RSA 密钥对
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });
    this.rsaPublicKey = publicKey;
    this.rsaPrivateKey = privateKey;
    this.logger.log('RSA 2048-bit 密钥对已生成');
  }

  /** 获取 RSA 公钥（PEM 格式），供前端加密密码 */
  getPublicKey(): string {
    return this.rsaPublicKey;
  }

  /**
   * 用 RSA 私钥解密前端传来的加密密码
   * 前端使用 RSA-OAEP + base64 编码
   */
  private decryptPassword(encrypted: string): string {
    try {
      const buffer = Buffer.from(encrypted, 'base64');
      const decrypted = crypto.privateDecrypt(
        {
          key: this.rsaPrivateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha-256',
        },
        buffer,
      );
      return decrypted.toString('utf8');
    } catch {
      this.logger.warn('RSA 密码解密失败');
      throw new BadRequestException('密码格式错误');
    }
  }

  /** 登录 —— 校验密码 + 防暴力破解 */
  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { username: dto.username },
      select: [
        'id',
        'username',
        'password',
        'status',
        'loginAttempts',
        'lockUntil',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查账户是否被锁定
    if (user.lockUntil && new Date() < user.lockUntil) {
      const remainMinutes = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `账户已锁定，请 ${remainMinutes} 分钟后重试`,
      );
    }

    // RSA 解密前端传来的加密密码
    const plainPassword = this.decryptPassword(dto.password);

    // 校验密码
    const isPasswordValid = await bcrypt.compare(plainPassword, user.password);
    if (!isPasswordValid) {
      await this.handleLoginFailure(user);
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 检查账户状态
    if (user.status !== 1) {
      throw new UnauthorizedException('账户已被禁用');
    }

    // 登录成功：重置失败计数
    await this.userRepo.update(user.id, {
      loginAttempts: 0,
      lockUntil: null as any,
    });

    return this.generateTokens(user);
  }

  /** 注册 —— 公开注册（后续可关闭） */
  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({
      where: [{ username: dto.username }],
    });
    if (exists) {
      throw new BadRequestException('用户名已存在');
    }

    const plainPassword = this.decryptPassword(dto.password);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = new User();
    user.username = dto.username;
    user.password = hashedPassword;
    (user as any).email = dto.email || null;
    (user as any).phone = dto.phone || null;

    await this.userRepo.save(user);
    return this.generateTokens(user);
  }

  /** 管理员创建用户 —— 支持分配角色 */
  async createUser(dto: CreateUserDto) {
    const exists = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (exists) {
      throw new BadRequestException('用户名已存在');
    }

    const plainPassword = this.decryptPassword(dto.password);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    let roles: Role[] = [];

    if (dto.roleIds && dto.roleIds.length > 0) {
      roles = await this.roleRepo.findBy({ id: In(dto.roleIds) });
    }

    const user2 = new User();
    user2.username = dto.username;
    user2.password = hashedPassword;
    (user2 as any).email = dto.email || null;
    (user2 as any).phone = dto.phone || null;
    user2.roles = roles;

    await this.userRepo.save(user2);
    // 返回时不包含密码
    const { password: _pwd, ...result } = user2;
    return result;
  }

  /** 刷新 Access Token —— 用 Refresh Token 换新 Token */
  async refreshToken(token: string) {
    const storedToken = await this.refreshTokenRepo.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('无效的刷新令牌');
    }

    // 检查是否过期
    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('刷新令牌已过期');
    }

    // 检查是否已被吊销
    if (storedToken.revokedAt) {
      throw new UnauthorizedException('刷新令牌已被吊销');
    }

    // 轮换策略：吊销旧 Token
    storedToken.revokedAt = new Date();
    await this.refreshTokenRepo.save(storedToken);

    return this.generateTokens(storedToken.user);
  }

  /** 登出 —— 吊销该用户所有 Refresh Token */
  async logout(userId: number) {
    await this.refreshTokenRepo.update(
      { userId, revokedAt: null as any },
      { revokedAt: new Date() },
    );
  }

  /** 生成 Access + Refresh Token 对 */
  private async generateTokens(user: User) {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });

    // Refresh Token 用 UUID，存入数据库，7 天有效
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: user.id,
        token: refreshToken,
        expiresAt,
      }),
    );

    // 查询用户的完整信息（含角色），返回给前端
    const fullUser = await this.userRepo.findOne({
      where: { id: user.id },
      relations: ['roles', 'roles.permissions'],
    });

    return {
      accessToken,
      refreshToken,
      user: fullUser,
    };
  }

  /**
   * 处理登录失败 —— 累加失败次数，达到阈值后锁定账户
   * MAX_LOGIN_ATTEMPTS=5, LOCK_DURATION=15min
   */
  private async handleLoginFailure(user: User) {
    const attempts = user.loginAttempts + 1;
    const updateData: Partial<User> = { loginAttempts: attempts };

    if (attempts >= 5) {
      // 锁定 15 分钟
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 15);
      updateData.lockUntil = lockUntil;
      this.logger.warn(
        `用户 ${user.username} 登录失败 ${attempts} 次，已锁定 15 分钟`,
      );
    }

    await this.userRepo.update(user.id, updateData);
  }
}
