import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import { PagegenRecord } from '../../entities/pagegen-record.entity';
import { SubmitPagegenDto } from './dto/submit.dto';
import {
  AdminListPagegenDto,
  PublicListPagegenDto,
} from './dto/list-query.dto';
import { GlmService, pickValidTags } from './services/glm.service';
import { SanitizeService } from './services/sanitize.service';
import { parseDeviceMeta } from './device-meta';
import {
  PAGEGEN_STATUS,
  PAGEGEN_PAGE_ID_RE,
  PAGEGEN_CODE_FAIL_LOCK,
} from './pagegen.constants';

/**
 * 托管页生成服务 —— 校验链 / 进程内队列 / 状态机 / 落盘与对账
 *
 * 队列模型：每实例并发 1（PM2 双实例即全局 2）。任务由接收请求的实例处理，
 * 状态全部落在数据库，任意实例都能读到 status；进程崩溃由启动清扫兜底。
 */
@Injectable()
export class PagegenService implements OnModuleInit {
  private readonly logger = new Logger(PagegenService.name);
  private readonly pagesDir: string;

  /** 待处理任务队列（记录 id） */
  private queue: number[] = [];
  private processing = false;
  /** 口令失败计数：key = `yyyymmdd:ip`，当日累计 */
  private codeFails = new Map<string, number>();

  constructor(
    @InjectRepository(PagegenRecord)
    private repo: Repository<PagegenRecord>,
    private glmService: GlmService,
    private sanitizeService: SanitizeService,
    private configService: ConfigService,
  ) {
    // 生成页目录：项目根 pages/（uploads 之外，仅由 nginx /p/ 暴露）
    this.pagesDir = path.join(process.cwd(), 'pages');
    if (!fs.existsSync(this.pagesDir)) {
      fs.mkdirSync(this.pagesDir, { recursive: true });
    }
  }

  // ==================== 生命周期 ====================

  async onModuleInit(): Promise<void> {
    // 启动清扫：重启前进队/生成中的任务已随进程丢失，标记失败让用户重交
    const swept = await this.repo.update(
      { status: In([PAGEGEN_STATUS.PENDING, PAGEGEN_STATUS.GENERATING]) },
      { status: PAGEGEN_STATUS.FAILED, error: '服务重启中断，请重新提交' },
    );
    if (swept.affected) {
      this.logger.warn(`启动清扫：${swept.affected} 条中断任务标记为 failed`);
    }

    // 对账：清理库内无记录的孤儿文件（每日重复执行）
    void this.reconcileOrphanFiles();
    const reconcileTimer = setInterval(
      () => void this.reconcileOrphanFiles(),
      24 * 60 * 60 * 1000,
    );
    reconcileTimer.unref();

    // 看门狗：generating 超过 12 分钟仍未到终态（进程半死/异常链路等死角）
    // 一律强制标记失败，保证状态机一定收敛。12 分钟 > 单次 GLM 上限 5 分钟。
    const watchdog = setInterval(() => void this.reapStuckTasks(), 60_000);
    watchdog.unref();
  }

  /** 看门狗收割：卡死任务 → failed */
  private async reapStuckTasks(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - 12 * 60 * 1000);
      const reaped = await this.repo
        .createQueryBuilder()
        .update(PagegenRecord)
        .set({
          status: PAGEGEN_STATUS.FAILED,
          error: '生成超时（系统已终止本次任务），请重新提交',
        })
        .where('status = :status AND updatedAt < :cutoff', {
          status: PAGEGEN_STATUS.GENERATING,
          cutoff,
        })
        .execute();
      if (reaped.affected) {
        this.logger.warn(`看门狗：${reaped.affected} 条卡死任务标记为超时失败`);
      }
    } catch (error) {
      this.logger.error(
        `看门狗执行失败：${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // ==================== 提交（校验链） ====================

  async submit(
    dto: SubmitPagegenDto,
    ip: string,
    userAgent?: string,
  ): Promise<{ pageId: string; status: string }> {
    // 1. 口令（timingSafeEqual，先查失败锁定）
    const failKey = `${todayKey()}:${ip}`;
    if ((this.codeFails.get(failKey) || 0) >= PAGEGEN_CODE_FAIL_LOCK) {
      throw new HttpException(
        '口令错误次数过多，今日已锁定，请明天再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.assertAccessCode(dto.accessCode, failKey);

    // 2. 生成期间锁死重复提交（前端禁用 + 后端强制双保险）
    const inflight = await this.repo.count({
      where: {
        ip,
        status: In([PAGEGEN_STATUS.PENDING, PAGEGEN_STATUS.GENERATING]),
      },
    });
    if (inflight > 0) {
      throw new BadRequestException('上一页还在生成中，请等待完成后再提交');
    }

    // 3. 敏感词预检（命中直接拒绝，不落库）
    const sensitive = SanitizeService.findSensitiveWord(
      `${dto.title}\n${dto.content}`,
      this.configService.get<string>('PAGEGEN_SENSITIVE_EXTRA', ''),
    );
    if (sensitive) {
      this.logger.warn(`敏感词拦截 ip=${ip} word=${sensitive}`);
      throw new BadRequestException(
        `内容包含敏感词（${sensitive}），请修改后重试`,
      );
    }

    // 4. 频控（当日提交量，含失败记录 —— 天然惩罚刷量）
    const start = todayStart();
    const ipLimit = this.configService.get<number>(
      'PAGEGEN_DAILY_IP_LIMIT',
      10,
    );
    const globalLimit = this.configService.get<number>(
      'PAGEGEN_DAILY_GLOBAL_LIMIT',
      200,
    );

    const ipCount = await this.repo.count({
      where: { ip, createdAt: Between(start, new Date()) },
    });
    if (ipCount >= ipLimit) {
      throw new HttpException(
        `每 IP 每天最多提交 ${ipLimit} 次`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const globalCount = await this.repo.count({
      where: { createdAt: Between(start, new Date()) },
    });
    if (globalCount >= globalLimit) {
      throw new HttpException(
        '今日生成额度已用完，请明天再试',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 5. 落库（pageId 撞车重试 3 次），同步记录 UA 解析出的设备特征
    const record = await this.createRecord(dto, ip, userAgent);

    // 6. 入队异步生成，立即返回
    this.enqueue(record.id);

    return { pageId: record.pageId, status: record.status };
  }

  private assertAccessCode(provided: string, failKey: string): void {
    const expected = this.configService.get<string>('PAGEGEN_ACCESS_CODE', '');
    if (!expected) {
      throw new ServiceUnavailableException('生成服务未配置访问口令');
    }
    // sha256 等长摘要后 timingSafeEqual，避免长度泄露
    const a = crypto.createHash('sha256').update(provided).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    if (!crypto.timingSafeEqual(a, b)) {
      this.codeFails.set(failKey, (this.codeFails.get(failKey) || 0) + 1);
      throw new BadRequestException('访问口令不正确');
    }
    // 口令正确即清零失败计数
    this.codeFails.delete(failKey);
  }

  private async createRecord(
    dto: SubmitPagegenDto,
    ip: string,
    userAgent?: string,
  ): Promise<PagegenRecord> {
    const device = parseDeviceMeta(userAgent);
    for (let i = 0; i < 3; i++) {
      const record = new PagegenRecord();
      Object.assign(record, {
        pageId: genPageId(),
        // 标题/标签可为空 —— 空则由 AI 生成时决定（process 里回填）
        title: dto.title?.trim() || '',
        tags: dto.tags && dto.tags.length > 0 ? dto.tags : [],
        style: dto.style,
        content: dto.content,
        status: PAGEGEN_STATUS.PENDING,
        ip,
        ...device,
      });
      try {
        return await this.repo.save(record);
      } catch (error: any) {
        // 唯一键冲突（pageId 撞车）重试，其余抛出
        if (error?.code !== 'ER_DUP_ENTRY') throw error;
      }
    }
    throw new Error('pageId 生成冲突，请重试');
  }

  // ==================== 队列与生成 ====================

  private enqueue(recordId: number): void {
    this.queue.push(recordId);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const id = this.queue.shift()!;
        await this.process(id);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * 处理一个任务：pending → generating → done / failed。
   * 瞬时错误的自动重试在 GlmService 内部完成（最多 2 次调用）；
   * 这里不做进程内重试——曾经的递归重试会因重入守卫(status!=pending)
   * 空转返回，把任务永久卡在 generating（已由线上日志证实），故移除。
   */
  private async process(id: number): Promise<void> {
    const record = await this.repo.findOneBy({ id });
    if (!record || record.status !== PAGEGEN_STATUS.PENDING) return;

    await this.repo.update(id, {
      status: PAGEGEN_STATUS.GENERATING,
      error: null as any,
    });

    try {
      const result = await this.glmService.generatePage({
        title: record.title,
        tags: record.tags,
        style: record.style,
        content: record.content,
      });

      // 标题/标签：用户提供了就用用户的，否则用 AI 的（标题兜底"未命名页面"，
      // 标签经白名单校验、全无效兜底"创意实验"）
      const finalTitle = record.title || result.title?.trim() || '未命名页面';
      const finalTags =
        record.tags.length > 0 ? record.tags : pickValidTags(result.tags);

      const html = this.sanitizeService.sanitize(result.html);
      const finalHtml = this.sanitizeService.finalize(
        html,
        finalTitle,
        record.content,
      );
      this.writeAtomic(this.pageFilePath(record.pageId), finalHtml);

      await this.repo.update(id, {
        status: PAGEGEN_STATUS.DONE,
        error: null as any,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        title: finalTitle,
        tags: finalTags,
      });
      this.logger.log(
        `页面生成完成 pageId=${record.pageId} title=${finalTitle} tags=${finalTags.join('/')} tokens=${result.tokensIn}/${result.tokensOut}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`页面生成失败 pageId=${record.pageId}：${message}`);
      await this.repo.update(id, {
        status: PAGEGEN_STATUS.FAILED,
        error: friendlyError(message),
      });
    }
  }

  /** 原子写：先写临时文件再 rename，避免半截文件被 nginx 访问到 */
  private writeAtomic(filePath: string, content: string): void {
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, filePath);
  }

  private pageFilePath(pageId: string): string {
    // pageId 在写入前必须已通过格式校验（落库时生成 + 此处双保险）
    if (!PAGEGEN_PAGE_ID_RE.test(pageId)) {
      throw new Error(`非法 pageId: ${pageId}`);
    }
    return path.join(this.pagesDir, `${pageId}.html`);
  }

  /** 对账：目录中存在但库内无记录的孤儿文件 → 删除 */
  private async reconcileOrphanFiles(): Promise<void> {
    try {
      const files = fs
        .readdirSync(this.pagesDir)
        .filter((f) => /^[a-z0-9]{10}\.html$/.test(f));
      if (files.length === 0) return;

      const pageIds = files.map((f) => f.replace(/\.html$/, ''));
      const existing = await this.repo.find({
        where: { pageId: In(pageIds) },
        select: { pageId: true },
      });
      const known = new Set(existing.map((r) => r.pageId));

      for (const pageId of pageIds) {
        if (!known.has(pageId)) {
          fs.unlinkSync(path.join(this.pagesDir, `${pageId}.html`));
          this.logger.warn(`对账清理孤儿文件：${pageId}.html`);
        }
      }
    } catch (error) {
      this.logger.error(
        `对账失败：${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // ==================== 查询 ====================

  /** H5 轮询任务状态 */
  async status(pageId: string) {
    if (!PAGEGEN_PAGE_ID_RE.test(pageId)) {
      throw new BadRequestException('无效的任务 ID');
    }
    const record = await this.repo.findOneBy({ pageId });
    if (!record) throw new NotFoundException('任务不存在');

    return {
      status: record.status,
      // AI 定题后回填的最终标题（H5「最近生成」展示用）
      title: record.title,
      error: record.error,
      url:
        record.status === PAGEGEN_STATUS.DONE
          ? this.publicUrl(record.pageId)
          : undefined,
    };
  }

  /** 公开目录列表（仅 done 页面的安全字段，不含 IP/提示词） */
  async publicList(dto: PublicListPagegenDto) {
    const { page, pageSize, tag, keyword, sort } = dto;
    const where: any = { status: PAGEGEN_STATUS.DONE };
    if (tag) where.tags = Like(`%"${tag}"%`);
    if (keyword) where.title = Like(`%${keyword}%`);

    const [list, total] = await this.repo.findAndCount({
      where,
      select: {
        pageId: true,
        title: true,
        tags: true,
        createdAt: true,
        views: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order:
        sort === 'hot'
          ? { views: 'DESC', createdAt: 'DESC' }
          : { createdAt: 'DESC' },
    });

    return { list, total, page, pageSize };
  }

  /** 浏览计数埋点（近似值：目录页/结果页点击时调用） */
  async incrementViews(pageId: string) {
    if (!PAGEGEN_PAGE_ID_RE.test(pageId)) {
      throw new BadRequestException('无效的页面 ID');
    }
    await this.repo
      .createQueryBuilder()
      .update(PagegenRecord)
      .set({ views: () => 'views + 1' })
      .where('page_id = :pageId', { pageId })
      .execute();
    return { ok: true };
  }

  /** 管理端列表 */
  async adminList(dto: AdminListPagegenDto) {
    const { page, pageSize, status, tag, keyword } = dto;
    const where: any = {};
    if (status) where.status = status;
    if (tag) where.tags = Like(`%"${tag}"%`);
    if (keyword) where.title = Like(`%${keyword}%`);

    const [list, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    // 补充访问 URL：生产环境 PAGEGEN_PUBLIC_BASE_URL 配主站绝对地址，
    // 管理端（admin 域名）才能正确跳转到主站 /p/ 路径
    const withUrl = list.map((r) => ({
      ...r,
      url: r.status === PAGEGEN_STATUS.DONE ? this.publicUrl(r.pageId) : null,
    }));

    return { list: withUrl, total, page, pageSize };
  }

  /** 管理端统计卡片 */
  async stats() {
    const start = todayStart();
    const [todayCount, totalCount, failedCount] = await Promise.all([
      this.repo.count({ where: { createdAt: Between(start, new Date()) } }),
      this.repo.count(),
      this.repo.count({ where: { status: PAGEGEN_STATUS.FAILED } }),
    ]);

    const sums = await this.repo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.tokens_in), 0)', 'tokensIn')
      .addSelect('COALESCE(SUM(r.tokens_out), 0)', 'tokensOut')
      .getRawOne();
    const tokensIn = Number(sums?.tokensIn || 0);
    const tokensOut = Number(sums?.tokensOut || 0);

    // 费用估算：单价按「元 / 百万 tokens」配置（GLM 定价）
    const priceIn = this.configService.get<number>('GLM_PRICE_IN', 8);
    const priceOut = this.configService.get<number>('GLM_PRICE_OUT', 28);
    const cost = (tokensIn * priceIn + tokensOut * priceOut) / 1_000_000;

    // pages 目录磁盘占用
    let diskBytes = 0;
    let fileCount = 0;
    try {
      for (const f of fs.readdirSync(this.pagesDir)) {
        if (f.endsWith('.html')) {
          diskBytes += fs.statSync(path.join(this.pagesDir, f)).size;
          fileCount++;
        }
      }
    } catch {
      // 目录不存在等异常忽略，统计返回 0
    }

    return {
      todayCount,
      totalCount,
      failedCount,
      failRate: totalCount > 0 ? failedCount / totalCount : 0,
      tokensIn,
      tokensOut,
      cost: Math.round(cost * 10000) / 10000,
      diskBytes,
      fileCount,
      // 主站 /gen 生成页地址：由 PAGEGEN_PUBLIC_BASE_URL（如 https://www.fidlcn.site/p）
      // 推导主站 origin，管理端「去生成页」跳转用它，前端不再写死域名
      genUrl: `${(
        this.configService.get<string>('PAGEGEN_PUBLIC_BASE_URL', '/p') || '/p'
      )
        .replace(/\/+$/, '')
        .replace(/\/p$/, '')}/gen`,
    };
  }

  /** 导出 CSV（管理端，含公式注入防护） */
  async exportCsv(): Promise<string> {
    const records = await this.repo.find({
      order: { createdAt: 'DESC' },
      take: 10000,
    });

    const header = [
      'pageId',
      '标题',
      '标签',
      '风格',
      '状态',
      '生成时间',
      'IP',
      '设备类型',
      '浏览器',
      '操作系统',
      '机型',
      '模型',
      '输入tokens',
      '输出tokens',
      '浏览数',
      '提示词',
    ];
    const rows = records.map((r) =>
      [
        r.pageId,
        r.title,
        r.tags.join('/'),
        r.style,
        r.status,
        new Date(r.createdAt).toISOString(),
        r.ip || '',
        r.deviceType || '',
        r.browser || '',
        r.os || '',
        r.deviceModel || '',
        r.model || '',
        String(r.tokensIn),
        String(r.tokensOut),
        String(r.views),
        r.content,
      ]
        .map(csvCell)
        .join(','),
    );

    // BOM 保证 Excel 正确识别 UTF-8 中文
    return '\uFEFF' + [header.map(csvCell).join(','), ...rows].join('\r\n');
  }

  /** 删除：先删文件，成功后再删库记录（generating 拒删） */
  async remove(id: number) {
    const record = await this.repo.findOneBy({ id });
    if (!record) throw new NotFoundException('记录不存在');

    if (
      record.status === PAGEGEN_STATUS.PENDING ||
      record.status === PAGEGEN_STATUS.GENERATING
    ) {
      throw new BadRequestException('生成中的任务不可删除，请稍后再试');
    }

    if (record.status === PAGEGEN_STATUS.DONE) {
      const filePath = this.pageFilePath(record.pageId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await this.repo.remove(record);
    return { message: '删除成功' };
  }

  // ==================== 工具 ====================

  private publicUrl(pageId: string): string {
    const base = (
      this.configService.get<string>('PAGEGEN_PUBLIC_BASE_URL', '/p') || '/p'
    ).replace(/\/+$/, '');
    return `${base}/${pageId}.html`;
  }
}

// ==================== 模块级纯函数 ====================

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

const PAGE_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function genPageId(): string {
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += PAGE_ID_ALPHABET[crypto.randomInt(PAGE_ID_ALPHABET.length)];
  }
  return id;
}

/** CSV 单元格转义 + 公式注入防护（= + - @ 开头加 ' 前缀） */
function csvCell(value: string): string {
  let v = String(value ?? '');
  if (/^[=+\-@]/.test(v)) {
    v = `'${v}`;
  }
  return `"${v.replace(/"/g, '""')}"`;
}

/** 面向用户的错误文案（不透传内部细节） */
function friendlyError(message: string): string {
  if (message.includes('GLM_API_KEY'))
    return '服务端未配置生成密钥，请联系管理员';
  if (
    message.includes('未返回的有效 HTML') ||
    message.includes('未返回有效的 HTML')
  )
    return '生成结果无效，请调整描述后重试';
  if (message.includes('余额不足'))
    return 'GLM 账户余额不足，请联系管理员充值后重试';
  if (message.includes('429')) return '生成请求被限流，请稍等一分钟再试';
  if (message.includes('超时')) return message;
  if (message.includes('过大')) return message;
  if (message.includes('暂时不可用')) return '生成服务暂时不可用，请稍后重试';
  return `生成失败：${message.slice(0, 120)}`;
}
