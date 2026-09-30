import { extractHtml, GlmService } from '../services/glm.service';
import { ConfigService } from '@nestjs/config';

describe('GlmService', () => {
  describe('extractHtml（围栏剥离）', () => {
    it('纯 HTML 直接返回', () => {
      const doc = '<!DOCTYPE html><html><body>x</body></html>';
      expect(extractHtml(doc)).toBe(doc);
    });

    it('剥掉 ```html 围栏', () => {
      const doc = '<!DOCTYPE html>\n<html>\n<body>x</body>\n</html>';
      const out = extractHtml('```html\n' + doc + '\n```');
      expect(out).toBe(doc);
    });

    it('从前后解释文字中截取 html 文档', () => {
      const out = extractHtml(
        '好的，以下是页面：\n<html lang="zh"><body>y</body></html>\n希望你喜欢',
      );
      expect(out).toMatch(/^<html lang="zh">/i);
      expect(out).toMatch(/<\/html>$/i);
      expect(out).not.toContain('好的');
    });

    it('无有效 HTML 时抛错', () => {
      expect(() => extractHtml('抱歉我不能生成')).toThrow('未返回有效的 HTML');
      expect(() => extractHtml('')).toThrow();
    });
  });

  describe('buildMessages（禁联网系统提示词）', () => {
    it('系统提示词包含禁联网硬约束，用户消息包含标题/标签/风格指令', () => {
      const service = new GlmService(new ConfigService());
      const messages = service.buildMessages({
        title: '咖啡推广页',
        tags: ['business'],
        style: 'lively',
        content: '新品咖啡豆上市',
      });

      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('禁止联网');
      expect(messages[0].content).toContain('CDN');
      expect(messages[0].content).toContain('禁止 <script>');

      const user = messages[1].content;
      expect(user).toContain('咖啡推广页');
      expect(user).toContain('商业');
      expect(user).toContain('活泼');
      expect(user).toContain('新品咖啡豆上市');
    });
  });
});
