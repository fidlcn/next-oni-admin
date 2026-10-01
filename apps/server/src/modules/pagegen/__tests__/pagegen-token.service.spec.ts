import { BadRequestException } from '@nestjs/common';

import { PagegenTokenService } from '../pagegen-token.service';
import { SiteUrlService } from '../site-url.service';
import { PagegenToken } from '../../../entities/pagegen-token.entity';

/** 构造一个口令实体（测试用） */
function makeToken(overrides: Partial<PagegenToken> = {}): PagegenToken {
  const token = new PagegenToken();
  Object.assign(token, {
    id: 1,
    code: 'Abc234Def567Gh89',
    name: '测试口令',
    status: 'active',
    activeDeviceId: null,
    deviceBoundAt: null,
    lastUsedAt: null,
    ...overrides,
  });
  return token;
}

/** usageForIds 的 GROUP BY 查询返回行（按传入 total/today/hour） */
function usageRow(tokenId: number, total: number, hour = 0) {
  return {
    tokenId: String(tokenId),
    total: String(total),
    today: '0',
    hour: String(hour),
  };
}

describe('PagegenTokenService', () => {
  let service: PagegenTokenService;
  let tokenRepo: any;
  let recordRepo: any;
  let configService: any;

  beforeEach(() => {
    tokenRepo = {
      findOneBy: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      query: jest.fn(),
    };
    // create() 走事务批量创建 —— em.save 委托到 tokenRepo.save 便于断言
    (tokenRepo as any).manager = {
      transaction: async (fn: (em: any) => Promise<unknown>) =>
        fn({ save: (t: PagegenToken) => tokenRepo.save(t) }),
    };
    recordRepo = { count: jest.fn(), query: jest.fn() };
    configService = { get: jest.fn((_key: string, def: any) => def) };
    service = new PagegenTokenService(
      tokenRepo,
      recordRepo,
      configService,
      new SiteUrlService(configService as any),
    );
  });

  describe('assertUsable（额度/频次校验）', () => {
    it('停用口令直接拒绝', async () => {
      await expect(
        service.assertUsable(makeToken({ status: 'disabled' })),
      ).rejects.toThrow(BadRequestException);
    });

    it('短期口令额度耗尽拒绝', async () => {
      recordRepo.query.mockResolvedValue([usageRow(1, 5)]);
      await expect(
        service.assertUsable(makeToken({ type: 'short', maxUses: 5 })),
      ).rejects.toThrow('额度已用完');
    });

    it('短期口令在途任务也占额度（pending 计入）', async () => {
      recordRepo.query.mockResolvedValue([usageRow(1, 3)]);
      await expect(
        service.assertUsable(makeToken({ type: 'short', maxUses: 3 })),
      ).rejects.toThrow('额度已用完');
    });

    it('长期口令近一小时达上限拒绝（429）', async () => {
      recordRepo.query.mockResolvedValue([usageRow(1, 10, 2)]);
      await expect(
        service.assertUsable(makeToken({ type: 'long', hourlyLimit: 2 })),
      ).rejects.toThrow('每小时 2 条');
    });

    it('长期口令总额不影响（只看小时窗口）', async () => {
      recordRepo.query.mockResolvedValue([usageRow(1, 999, 1)]);
      await expect(
        service.assertUsable(makeToken({ type: 'long', hourlyLimit: 2 })),
      ).resolves.toBeUndefined();
    });

    it('额度内放行', async () => {
      recordRepo.query.mockResolvedValue([usageRow(1, 2, 1)]);
      await expect(
        service.assertUsable(makeToken({ type: 'short', maxUses: 5 })),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertNoInflight（口令在途锁）', () => {
    it('有生成中任务拒绝', async () => {
      recordRepo.count.mockResolvedValue(1);
      await expect(service.assertNoInflight(makeToken())).rejects.toThrow(
        '正在生成中',
      );
    });

    it('无在途放行', async () => {
      recordRepo.count.mockResolvedValue(0);
      await expect(
        service.assertNoInflight(makeToken()),
      ).resolves.toBeUndefined();
    });
  });

  describe('bindDevice（单设备独占）', () => {
    it('占用成功（affectedRows=1）', async () => {
      tokenRepo.query.mockResolvedValue({ affectedRows: 1 });
      await expect(
        service.bindDevice(makeToken(), 'device-a'),
      ).resolves.toBeUndefined();
      expect(tokenRepo.query).toHaveBeenCalledTimes(1);
    });

    it('被其他活跃设备占用时拒绝（affectedRows=0）', async () => {
      tokenRepo.query.mockResolvedValue({ affectedRows: 0 });
      await expect(service.bindDevice(makeToken(), 'device-b')).rejects.toThrow(
        '正被其他设备使用',
      );
    });
  });

  describe('isDeviceLocked（空闲自动释放窗口）', () => {
    it('未绑定设备不锁定', () => {
      expect(service.isDeviceLocked(makeToken())).toBe(false);
    });

    it('窗口内活跃占用', () => {
      expect(
        service.isDeviceLocked(
          makeToken({
            activeDeviceId: 'device-a',
            lastUsedAt: new Date(Date.now() - 30 * 60 * 1000),
          }),
        ),
      ).toBe(true);
    });

    it('超过释放窗口自动失效', () => {
      expect(
        service.isDeviceLocked(
          makeToken({
            activeDeviceId: 'device-a',
            lastUsedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          }),
        ),
      ).toBe(false);
    });

    it('释放窗口可由 PAGEGEN_DEVICE_RELEASE_HOURS 覆盖', () => {
      configService.get = jest.fn((_k, def) => (def === 2 ? 1 : def));
      expect(
        service.isDeviceLocked(
          makeToken({
            activeDeviceId: 'device-a',
            lastUsedAt: new Date(Date.now() - 90 * 60 * 1000),
          }),
        ),
      ).toBe(false);
    });
  });

  describe('tokenInfo（邀请页校验）', () => {
    it('口令不存在', async () => {
      tokenRepo.findOneBy.mockResolvedValue(null);
      await expect(service.tokenInfo('nosuchcode')).resolves.toEqual({
        valid: false,
        reason: 'not_found',
      });
    });

    it('口令已停用', async () => {
      tokenRepo.findOneBy.mockResolvedValue(makeToken({ status: 'disabled' }));
      await expect(service.tokenInfo('Abc234Def567Gh89')).resolves.toEqual({
        valid: false,
        reason: 'disabled',
      });
    });

    it('短期口令已耗尽', async () => {
      tokenRepo.findOneBy.mockResolvedValue(
        makeToken({ type: 'short', maxUses: 3 }),
      );
      recordRepo.query.mockResolvedValue([usageRow(1, 3)]);
      await expect(service.tokenInfo('Abc234Def567Gh89')).resolves.toEqual({
        valid: false,
        reason: 'exhausted',
      });
    });

    it('有效口令返回剩余额度', async () => {
      tokenRepo.findOneBy.mockResolvedValue(
        makeToken({ type: 'short', maxUses: 5 }),
      );
      recordRepo.query.mockResolvedValue([usageRow(1, 2)]);
      const info = await service.tokenInfo('Abc234Def567Gh89');
      expect(info.valid).toBe(true);
      expect(info.remainingUses).toBe(3);
    });
  });

  describe('create（批量创建与碰撞重试）', () => {
    it('生成指定数量的口令（返回与列表同构，含邀请短链）', async () => {
      tokenRepo.save.mockImplementation(async (t: PagegenToken) => t);
      const list = await service.create(
        { name: '给小王的', type: 'short', maxUses: 5, count: 3 } as any,
        9,
      );
      expect(list).toHaveLength(3);
      expect(list[0].code).toMatch(/^[A-Za-z2-9]{16}$/);
      expect(list[0].type).toBe('short');
      expect(list[0].maxUses).toBe(5);
      expect(list[0].hourlyLimit).toBeNull();
      // 创建页直接渲染邀请短链 —— 响应缺该字段会导致前端渲染崩溃
      expect((list[0] as any).inviteUrl).toContain('/g/');
      expect((list[0] as any).remaining).toBe(5);
    });

    it('code 撞车自动重试', async () => {
      tokenRepo.save
        .mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' })
        .mockImplementation(async (t: PagegenToken) => t);
      const list = await service.create(
        { name: 'x', type: 'long', hourlyLimit: 10 } as any,
        9,
      );
      expect(list).toHaveLength(1);
      expect(tokenRepo.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('unbind / update / remove', () => {
    it('解绑清空设备字段', async () => {
      tokenRepo.findOneBy.mockResolvedValue(makeToken({ activeDeviceId: 'a' }));
      await expect(service.unbind(1)).resolves.toEqual({
        message: '已解绑设备',
      });
      expect(tokenRepo.update).toHaveBeenCalledWith(1, {
        activeDeviceId: null,
        deviceBoundAt: null,
      });
    });

    it('更新不存在的口令抛 404', async () => {
      tokenRepo.findOneBy.mockResolvedValue(null);
      await expect(service.update(99, { name: 'x' })).rejects.toThrow(
        '口令不存在',
      );
    });
  });
});
