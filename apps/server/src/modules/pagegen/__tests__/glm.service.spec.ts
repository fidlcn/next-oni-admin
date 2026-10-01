import { ConfigService } from '@nestjs/config';

import {
  extractHtml,
  extractMeta,
  pickValidTags,
  GlmService,
} from '../services/glm.service';

describe('GlmService 纯函数', () => {
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

    it('元数据注释在文档前时，HTML 提取不受影响', () => {
      const raw =
        '<!--pagegen:{"title":"咖啡页","tags":["business"]}-->\n<!DOCTYPE html><html><body>y</body></html>';
      expect(extractHtml(raw)).toBe(
        '<!DOCTYPE html><html><body>y</body></html>',
      );
    });

    it('无有效 HTML 时抛错', () => {
      expect(() => extractHtml('抱歉我不能生成')).toThrow('未返回有效的 HTML');
      expect(() => extractHtml('')).toThrow();
    });
  });

  describe('extractMeta（元数据注释解析）', () => {
    it('解析 title 与 tags', () => {
      const raw =
        '<!--pagegen:{"title":"新品咖啡豆","tags":["business","food"]}-->\n<!DOCTYPE html><html></html>';
      expect(extractMeta(raw)).toEqual({
        title: '新品咖啡豆',
        tags: ['business', 'food'],
      });
    });

    it('容忍残缺结束符（模型丢掉 --> 的第二个短横线，线上实测格式）', () => {
      // glm-5.3 曾照抄提示词示例输出了 `}>` 结尾的非法注释
      const raw =
        '<!--pagegen:{"title":"林川 · 前端工程师的主页","tags":["code","design","travel"]}>\n<!DOCTYPE html><html></html>';
      expect(extractMeta(raw)).toEqual({
        title: '林川 · 前端工程师的主页',
        tags: ['code', 'design', 'travel'],
      });
    });

    it('标题截断到列宽 100（防 Data too long）', () => {
      const long = '标'.repeat(150);
      const raw = `<!--pagegen:{"title":"${long}","tags":["code"]}-->`;
      expect(extractMeta(raw).title).toHaveLength(100);
    });

    it('缺失注释返回空对象', () => {
      expect(extractMeta('<!DOCTYPE html><html></html>')).toEqual({});
    });

    it('非法 JSON 返回空对象（不抛错）', () => {
      expect(extractMeta('<!--pagegen:{oops}-->')).toEqual({});
    });
  });

  describe('pickValidTags（AI 标签白名单校验）', () => {
    it('过滤白名单外的值并去重', () => {
      expect(pickValidTags(['code', 'invalid', 'code', 'life'])).toEqual([
        'code',
        'life',
      ]);
    });

    it('超过上限截断为 3 个', () => {
      expect(pickValidTags(['code', 'life', 'work', 'study'])).toEqual([
        'code',
        'life',
        'work',
      ]);
    });

    it('全无效/非数组时兜底为创意实验', () => {
      expect(pickValidTags(['hack', 42])).toEqual(['fun']);
      expect(pickValidTags(undefined)).toEqual(['fun']);
    });
  });
});

describe('GlmService buildMessages', () => {
  const service = new GlmService(new ConfigService());

  it('系统提示词含禁联网/移动端硬约束/元数据注释格式与标签范围', () => {
    const [sys] = service.buildMessages({
      title: '',
      tags: [],
      style: 'minimal',
      content: 'x',
    }) as any[];
    expect(sys.content).toContain('禁止联网');
    expect(sys.content).toContain('移动端优先');
    expect(sys.content).toContain('<!--pagegen:');
    expect(sys.content).toContain('code=编程');
    expect(sys.content).toContain('people=人物');
  });

  it('用户消息：有标题用标题，无标题提示自拟；含风格指令与正文', () => {
    const withTitle = service.buildMessages({
      title: '咖啡推广页',
      tags: ['business'],
      style: 'lively',
      content: '新品咖啡豆上市',
    }) as any[];
    expect(withTitle[1].content).toContain('页面标题：咖啡推广页');
    expect(withTitle[1].content).toContain('主题标签：business');
    expect(withTitle[1].content).toContain('活泼');
    expect(withTitle[1].content).toContain('新品咖啡豆上市');

    const noTitle = service.buildMessages({
      title: '',
      tags: [],
      style: 'minimal',
      content: '写个页面',
    }) as any[];
    expect(noTitle[1].content).toContain('自拟');
    expect(noTitle[1].content).toContain('预设范围');
  });
});
