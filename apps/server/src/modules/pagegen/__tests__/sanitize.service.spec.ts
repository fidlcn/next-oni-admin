import { SanitizeService } from '../services/sanitize.service';

/**
 * 消毒服务单测 —— 安全心（白名单必须可靠）：
 * script/事件属性/iframe/表单控件/javascript: 链接一律剥掉，结构与内联样式保留
 */
describe('SanitizeService', () => {
  const service = new SanitizeService();

  describe('sanitize', () => {
    it('剥掉 <script> 标签', () => {
      const out = service.sanitize('<p>hi</p><script>alert(1)</script>');
      expect(out).toContain('<p>hi</p>');
      expect(out).not.toContain('script');
      expect(out).not.toContain('alert');
    });

    it('剥掉事件属性（onerror/onload）', () => {
      const out = service.sanitize(
        '<img src="https://a.com/x.png" onerror="alert(1)"><p onclick="x()">t</p>',
      );
      expect(out).not.toContain('onerror');
      expect(out).not.toContain('onclick');
      expect(out).toContain('src="https://a.com/x.png"');
    });

    it('剥掉 iframe / form 控件 / object / link', () => {
      const out = service.sanitize(
        '<iframe src="https://evil.com"></iframe><form><input name="a"></form><object data="x"></object>',
      );
      expect(out).not.toContain('iframe');
      expect(out).not.toContain('form');
      expect(out).not.toContain('input');
      expect(out).not.toContain('object');
    });

    it('拦截 javascript: 伪协议链接', () => {
      const out = service.sanitize('<a href="javascript:alert(1)">点我</a>');
      expect(out).not.toContain('javascript:');
    });

    it('保留结构与内联样式、<style> 标签', () => {
      const out = service.sanitize(
        '<div style="color:red"><h1>标题</h1><style>.a{color:blue}</style></div>',
      );
      expect(out).toContain('style="color:red"');
      expect(out).toContain('<h1>标题</h1>');
      expect(out).toContain('.a{color:blue}');
    });

    it('图片允许 data URI，其余标签仅 http(s)', () => {
      const ok = service.sanitize('<img src="data:image/png;base64,iVBOR">');
      expect(ok).toContain('data:image/png');
    });
  });

  describe('finalize', () => {
    it('补 DOCTYPE、注入 charset/title/og 标签', () => {
      const out = service.finalize(
        '<html><head></head><body><p>x</p></body></html>',
        '测试标题',
        '这是正文摘要',
      );
      expect(out).toMatch(/^<!DOCTYPE html>/i);
      expect(out).toContain('<meta charset="utf-8">');
      expect(out).toContain('<title>测试标题</title>');
      expect(out).toContain('property="og:title" content="测试标题"');
      expect(out).toContain('property="og:description" content="这是正文摘要"');
    });

    it('替换模型给出的 <title>，注入我们自己的', () => {
      const out = service.finalize(
        '<html><head><title>模型的标题</title></head><body></body></html>',
        '我们的标题',
        '摘要',
      );
      expect(out).toContain('<title>我们的标题</title>');
      expect(out).not.toContain('模型的标题');
    });

    it('og 属性值做 HTML 转义（防属性逃逸）', () => {
      const out = service.finalize(
        '<html><head></head><body></body></html>',
        'a"b<c',
        'x',
      );
      expect(out).not.toContain('content="a"b<c"');
    });

    it('超过大小上限抛出 BadRequest', () => {
      const huge = '<p>' + 'x'.repeat(200 * 1024) + '</p>';
      expect(() =>
        service.finalize(
          `<html><head></head><body>${huge}</body></html>`,
          't',
          'd',
        ),
      ).toThrow();
    });
  });

  describe('findSensitiveWord', () => {
    it('命中内置词表', () => {
      expect(SanitizeService.findSensitiveWord('这是一个博彩网站', '')).toBe(
        '博彩',
      );
    });

    it('支持环境变量追加词', () => {
      expect(
        SanitizeService.findSensitiveWord(
          '含 internalword 的内容',
          'internalword',
        ),
      ).toBe('internalword');
    });

    it('未命中返回 null', () => {
      expect(
        SanitizeService.findSensitiveWord('正常的健康科普内容', ''),
      ).toBeNull();
    });
  });
});
