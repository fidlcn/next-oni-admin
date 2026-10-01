import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { PagegenToken } from '../../entities/pagegen-token.entity';
import { PagegenRecord } from '../../entities/pagegen-record.entity';
import {
  CreatePagegenTokenDto,
  UpdatePagegenTokenDto,
  AdminListPagegenTokenDto,
} from './dto/token.dto';
import {
  PAGEGEN_TOKEN_STATUS,
  PAGEGEN_TOKEN_CODE_LENGTH,
  PAGEGEN_DEVICE_RELEASE_HOURS,
  PAGEGEN_COUNTED_STATUSES,
} from './pagegen.constants';

/** 单个口令的用量统计（计数口径：pending/generating/done） */
export interface TokenUsage {
  total: number;
  today: number;
  hour: number;
}

/**
 * 托管页生成口令服务
 * - 管理端：创建（支持批量）/ 列表（含实时用量）/ 启停 / 删除 / 解绑设备
 * - 公开：token-info 供 /g 邀请页校验并展示剩余额度
 * - 提交链：额度频次校验 + 单设备独占绑定（原子条件更新防并发抢绑）
 */
@Injectable()
export class PagegenTokenService {
  private readonly logger = new Logger(PagegenTokenService.name);

  constructor(
    @InjectRepository(PagegenToken)
    private tokenRepo: Repository<PagegenToken>,
    @InjectRepository(PagegenRecord)
    private recordRepo: Repository<PagegenRecord>,
    private configService: ConfigService,
  ) {}

  // ==================== 提交校验链 ====================

  findByCode(code: string): Promise<PagegenToken | null> {
    return this.tokenRepo.findOneBy({ code });
  }

  /** 口令可用性校验：停用 / 短期额度耗尽 / 长期频次达限 */
  async assertUsable(token: PagegenToken): Promise<void> {
    if (token.status !== PAGEGEN_TOKEN_STATUS.ACTIVE) {
      throw new BadRequestException('该口令已被停用');
    }
    const usage = await this.usageForIds([token.id]);
    const u = usage.get(token.id)!;

    if (token.type === 'short') {
      if (u.total >= token.maxUses!) {
        throw new BadRequestException(
          `口令额度已用完（${token.maxUses} 条），该口令已失效`,
        );
      }
    } else if (u.hour >= token.hourlyLimit!) {
      throw new HttpTooMany(
        `该口令已达每小时 ${token.hourlyLimit} 条的上限，请一小时后再试`,
      );
    }
  }

  /** 口令级在途锁：同一口令同时只允许一个生成任务 */
  async assertNoInflight(token: PagegenToken): Promise<void> {
    const inflight = await this.recordRepo.count({
      where: {
        tokenId: token.id,
        status: In(['pending', 'generating']),
      },
    });
    if (inflight > 0) {
      throw new BadRequestException(
        '该口令有任务正在生成中，请等待完成后再提交',
      );
    }
  }

  /**
   * 单设备独占绑定 —— 原子条件更新：
   * 未绑定 / 绑定的是本设备 / 原设备空闲超时，才允许占用（并刷新最近使用时间）
   * affected = 0 即被其他活跃设备占用。
   * 时间全部用应用侧 Date 传参（mysql2 按连接 timezone 序列化），
   * 不用 SQL 的 NOW()——容器 MySQL 时区与连接时区可能不一致（UTC vs +08）
   */
  async bindDevice(token: PagegenToken, deviceId: string): Promise<void> {
    const releaseHours = this.configService.get<number>(
      'PAGEGEN_DEVICE_RELEASE_HOURS',
      PAGEGEN_DEVICE_RELEASE_HOURS,
    );
    const now = new Date();
    const cutoff = new Date(now.getTime() - releaseHours * 60 * 60 * 1000);

    const result = await this.tokenRepo.query(
      `UPDATE pagegen_tokens SET
         active_device_id = ?,
         device_bound_at = IF(active_device_id IS NULL OR active_device_id <> ?, ?, device_bound_at),
         last_used_at = ?,
         updated_at = ?
       WHERE id = ?
         AND (active_device_id IS NULL OR active_device_id = ? OR last_used_at IS NULL OR last_used_at < ?)`,
      [deviceId, deviceId, now, now, now, token.id, deviceId, cutoff],
    );

    if (!result || result.affectedRows === 0) {
      throw new BadRequestException(
        `该口令正被其他设备使用（空闲 ${releaseHours} 小时后自动释放，或联系管理员解绑）`,
      );
    }
  }

  /** 设备是否处于活跃占用（供 token-info 展示） */
  isDeviceLocked(token: PagegenToken): boolean {
    if (!token.activeDeviceId) return false;
    const releaseHours = this.configService.get<number>(
      'PAGEGEN_DEVICE_RELEASE_HOURS',
      PAGEGEN_DEVICE_RELEASE_HOURS,
    );
    const last = token.lastUsedAt ? new Date(token.lastUsedAt).getTime() : 0;
    return Date.now() - last < releaseHours * 60 * 60 * 1000;
  }

  // ==================== 管理端 ====================

  /** 批量创建口令（pageId 式随机码，唯一键冲突重试 3 次） */
  async create(
    dto: CreatePagegenTokenDto,
    userId: number,
  ): Promise<PagegenToken[]> {
    const count = dto.count ?? 1;
    const created: PagegenToken[] = [];
    for (let i = 0; i < count; i++) {
      for (let retry = 0; retry < 3; retry++) {
        const token = new PagegenToken();
        Object.assign(token, {
          code: genTokenCode(),
          name: dto.name.trim(),
          type: dto.type,
          hourlyLimit: dto.type === 'long' ? dto.hourlyLimit : null,
          maxUses: dto.type === 'short' ? dto.maxUses : null,
          status: PAGEGEN_TOKEN_STATUS.ACTIVE,
          createdBy: userId,
        });
        try {
          created.push(await this.tokenRepo.save(token));
          break;
        } catch (error: any) {
          if (error?.code !== 'ER_DUP_ENTRY') throw error;
        }
      }
    }
    if (created.length !== count) {
      throw new Error('口令码生成冲突，请重试');
    }
    this.logger.log(
      `创建口令 ${created.length} 个 type=${dto.type} name=${dto.name}`,
    );
    return created;
  }

  /** 管理端口令列表（含实时用量与推导状态） */
  async adminList(dto: AdminListPagegenTokenDto) {
    const { page, pageSize, type, status } = dto;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [tokens, total] = await this.tokenRepo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    const usage = await this.usageForIds(tokens.map((t) => t.id));
    const list = tokens.map((t) => this.withUsage(t, usage.get(t.id)!));

    return { list, total, page, pageSize };
  }

  /** 改名 / 启停 */
  async update(id: number, dto: UpdatePagegenTokenDto) {
    const token = await this.tokenRepo.findOneBy({ id });
    if (!token) throw new NotFoundException('口令不存在');

    if (dto.name !== undefined) token.name = dto.name.trim();
    if (dto.status !== undefined) token.status = dto.status;
    await this.tokenRepo.save(token);
    return { message: '更新成功' };
  }

  /** 删除口令（生成记录保留 token_id，列表显示为「已删除口令」） */
  async remove(id: number) {
    const token = await this.tokenRepo.findOneBy({ id });
    if (!token) throw new NotFoundException('口令不存在');
    await this.tokenRepo.remove(token);
    return { message: '删除成功' };
  }

  /** 手动解绑设备 */
  async unbind(id: number) {
    const token = await this.tokenRepo.findOneBy({ id });
    if (!token) throw new NotFoundException('口令不存在');
    await this.tokenRepo.update(id, {
      activeDeviceId: null as any,
      deviceBoundAt: null as any,
    });
    return { message: '已解绑设备' };
  }

  /** 记录页口令列展示：token_id → {name, code}（含已删除口令的兜底） */
  async namesFor(
    ids: number[],
  ): Promise<Map<number, { name: string; code: string }>> {
    const map = new Map<number, { name: string; code: string }>();
    const unique = [...new Set(ids.filter((id) => id != null))];
    if (unique.length === 0) return map;
    const tokens = await this.tokenRepo.find({
      where: { id: In(unique) },
      select: { id: true, name: true, code: true },
    });
    for (const t of tokens) map.set(t.id, { name: t.name, code: t.code });
    return map;
  }

  // ==================== 公开 ====================

  /** 概述页口令用量表：最近创建的口令 + 实时用量 */
  async usageOverview(limit = 50) {
    const tokens = await this.tokenRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
    const usage = await this.usageForIds(tokens.map((t) => t.id));
    return tokens.map((t) => this.withUsage(t, usage.get(t.id)!));
  }

  /** /g 邀请页校验口令并展示额度信息（只读，节流防探测） */
  async tokenInfo(code: string) {
    const token = code ? await this.findByCode(code.slice(0, 32)) : null;
    if (!token) return { valid: false, reason: 'not_found' };
    if (token.status !== PAGEGEN_TOKEN_STATUS.ACTIVE) {
      return { valid: false, reason: 'disabled' };
    }

    const usage = await this.usageForIds([token.id]);
    const u = usage.get(token.id)!;
    if (token.type === 'short' && u.total >= token.maxUses!) {
      return { valid: false, reason: 'exhausted' };
    }

    return {
      valid: true,
      type: token.type,
      name: token.name,
      hourlyLimit: token.type === 'long' ? token.hourlyLimit : undefined,
      maxUses: token.type === 'short' ? token.maxUses : undefined,
      usedTotal: u.total,
      hourUsed: u.hour,
      remainingUses:
        token.type === 'short' ? token.maxUses! - u.total : undefined,
      deviceLocked: this.isDeviceLocked(token),
    };
  }

  // ==================== 工具 ====================

  /** 邀请短链：主站 origin（由 PAGEGEN_PUBLIC_BASE_URL 推导）+ /g/{code} */
  inviteUrl(code: string): string {
    const origin = (
      this.configService.get<string>('PAGEGEN_PUBLIC_BASE_URL', '/p') || '/p'
    )
      .replace(/\/+$/, '')
      .replace(/\/p$/, '');
    return `${origin}/g/${code}`;
  }

  /** 汇总使用统计：一次 GROUP BY 查出 total / today / hour */
  async usageForIds(ids: number[]): Promise<Map<number, TokenUsage>> {
    const map = new Map(ids.map((id) => [id, { total: 0, today: 0, hour: 0 }]));
    if (ids.length === 0) return map;

    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const dayStart = d;
    const hourStart = new Date(Date.now() - 60 * 60 * 1000);

    const rows: any[] = await this.recordRepo.query(
      `SELECT token_id AS tokenId,
              COUNT(*) AS total,
              SUM(created_at >= ?) AS today,
              SUM(created_at >= ?) AS hour
       FROM pagegen_records
       WHERE token_id IN (?) AND status IN (?)
       GROUP BY token_id`,
      [dayStart, hourStart, ids, PAGEGEN_COUNTED_STATUSES],
    );

    for (const row of rows) {
      const id = Number(row.tokenId);
      if (map.has(id)) {
        map.set(id, {
          total: Number(row.total),
          today: Number(row.today),
          hour: Number(row.hour),
        });
      }
    }
    return map;
  }

  /** 列表行：实体 + 用量 + 剩余 + 推导状态 + 邀请短链 */
  private withUsage(t: PagegenToken, u: TokenUsage) {
    const remaining =
      t.type === 'short' ? Math.max(0, t.maxUses! - u.total) : null;
    const hourRemaining =
      t.type === 'long' ? Math.max(0, t.hourlyLimit! - u.hour) : null;

    const derivedStatus =
      t.status === PAGEGEN_TOKEN_STATUS.DISABLED
        ? 'disabled'
        : t.type === 'short' && remaining === 0
          ? 'exhausted'
          : 'active';

    return {
      ...t,
      usedTotal: u.total,
      usedToday: u.today,
      usedLastHour: u.hour,
      remaining,
      hourRemaining,
      deviceLocked: this.isDeviceLocked(t),
      inviteUrl: this.inviteUrl(t.code),
      derivedStatus,
    };
  }
}

/** 429 语义的口令频次超限 */
class HttpTooMany extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

const TOKEN_CODE_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function genTokenCode(): string {
  let code = '';
  for (let i = 0; i < PAGEGEN_TOKEN_CODE_LENGTH; i++) {
    code += TOKEN_CODE_ALPHABET[crypto.randomInt(TOKEN_CODE_ALPHABET.length)];
  }
  return code;
}
