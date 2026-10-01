import { SiteUrlService } from '../site-url.service';

/** 用指定 PAGEGEN_PUBLIC_BASE_URL 构造服务 */
function makeService(base?: string) {
  const config = {
    get: (_key: string, def: string) => base ?? def,
  };
  return new SiteUrlService(config as any);
}

describe('SiteUrlService（站外 URL 统一推导）', () => {
  it('默认 /p（本地开发）：全部相对路径', () => {
    const s = makeService();
    expect(s.origin()).toBe('');
    expect(s.pageUrl('abcdefghij')).toBe('/p/abcdefghij.html');
    expect(s.genUrl()).toBe('/gen');
    expect(s.inviteUrl('Abc234Def567Gh89')).toBe('/g/Abc234Def567Gh89');
  });

  it('生产绝对地址：派生全部绝对 URL（管理端跨域可跳转）', () => {
    const s = makeService('https://www.fidlcn.site/p');
    expect(s.origin()).toBe('https://www.fidlcn.site');
    expect(s.pageUrl('abcdefghij')).toBe(
      'https://www.fidlcn.site/p/abcdefghij.html',
    );
    expect(s.genUrl()).toBe('https://www.fidlcn.site/gen');
    expect(s.inviteUrl('Abc234Def567Gh89')).toBe(
      'https://www.fidlcn.site/g/Abc234Def567Gh89',
    );
  });

  it('容忍尾斜杠', () => {
    const s = makeService('https://www.fidlcn.site/p/');
    expect(s.origin()).toBe('https://www.fidlcn.site');
    expect(s.genUrl()).toBe('https://www.fidlcn.site/gen');
  });
});
