import { Injectable, BadRequestException } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

import {
  PAGEGEN_HTML_MAX_BYTES,
  PAGEGEN_SENSITIVE_WORDS,
} from '../pagegen.constants';

/**
 * HTML 消毒服务 —— 白名单方式处理模型输出
 * 只保留结构与内联样式，剥掉脚本/iframe/表单控件/外链资源；
 * 与 nginx /p/ 的 CSP 互为印证：即使这里漏网，浏览器也执行不了脚本
 */
@Injectable()
export class SanitizeService {
  private readonly options: sanitizeHtml.IOptions = {
    // <style> 标签在白名单内（内联 CSS 是生成页质量的核心）。
    // sanitize-html 会对此告警；此处显式确认风险已评估：
    // 白名单不含任何可执行脚本的标签/属性，且 nginx /p/ 的 CSP
    // （default-src 'none'）作为第二道防线彻底禁脚本。
    allowVulnerableTags: true,
    allowedTags: [
      'html',
      'head',
      'body',
      'title',
      'style',
      'div',
      'span',
      'p',
      'a',
      'img',
      'section',
      'header',
      'footer',
      'main',
      'nav',
      'article',
      'aside',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'dl',
      'dt',
      'dd',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'caption',
      'figure',
      'figcaption',
      'blockquote',
      'hr',
      'br',
      'strong',
      'em',
      'b',
      'i',
      'u',
      's',
      'sub',
      'sup',
      'small',
      'mark',
      'code',
      'pre',
      'abbr',
      'address',
      'time',
    ],
    allowedAttributes: {
      '*': ['style', 'class'],
      img: ['src', 'alt', 'width', 'height'],
      a: ['href', 'title', 'target', 'rel'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      ol: ['start'],
    },
    // 只允许 http(s) 链接；图片额外允许 data URI（内联小图）
    allowedSchemes: ['http', 'https'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
      a: ['http', 'https', 'mailto'],
    },
    // 外链一律加 noopener；javascript: 伪协议由 scheme 白名单拦截
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  };

  /** 白名单消毒 */
  sanitize(rawHtml: string): string {
    return sanitizeHtml(rawHtml, this.options);
  }

  /**
   * 落盘前的最终处理：
   * 1. 补 <!DOCTYPE html>（sanitize-html 会剥掉）
   * 2. 去掉模型给的 <title> 与 charset，注入我们自己的（防编码与标题失控）
   * 3. 注入 viewport —— 白名单剥掉了模型的 meta，没有它手机会按 980px
   *    桌面宽度渲染再整体缩小，文字小到看不清（移动端可读性的关键）
   * 4. 注入 og:title / og:description / og:type，微信/QQ 分享卡片可读
   * 5. 大小上限校验
   */
  finalize(html: string, title: string, contentSummary: string): string {
    let out = html;

    // sanitize-html 不保留 doctype，统一补上
    if (!/^\s*<!doctype\s+html/i.test(out)) {
      out = `<!DOCTYPE html>\n${out}`;
    }

    const ogTitle = escapeAttr(title);
    const ogDesc = escapeAttr(contentSummary.slice(0, 80));

    const headBlock =
      `<meta charset="utf-8">\n` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
      `<title>${escapeText(title)}</title>\n` +
      `<meta property="og:title" content="${ogTitle}">\n` +
      `<meta property="og:description" content="${ogDesc}">\n` +
      `<meta property="og:type" content="website">`;

    // 移除模型输出的 title（内容不可控），charset 相关 meta 在白名单里已被剥掉
    out = out.replace(/<title>[\s\S]*?<\/title>/gi, '');

    if (/<head[^>]*>/i.test(out)) {
      out = out.replace(/<head[^>]*>/i, (m) => `${m}\n${headBlock}`);
    } else if (/<html[^>]*>/i.test(out)) {
      out = out.replace(
        /<html[^>]*>/i,
        (m) => `${m}\n<head>${headBlock}</head>`,
      );
    } else {
      out = `<!DOCTYPE html>\n<html>\n<head>${headBlock}</head>\n<body>${out}</body>\n</html>`;
    }

    const bytes = Buffer.byteLength(out, 'utf8');
    if (bytes > PAGEGEN_HTML_MAX_BYTES) {
      throw new BadRequestException(
        `生成的页面过大（${Math.round(bytes / 1024)}KB），请精简内容后重试`,
      );
    }

    return out;
  }

  /**
   * 敏感词检查（静态纯函数，便于单测）
   * @returns 命中的词，未命中返回 null
   */
  static findSensitiveWord(text: string, extraCsv: string): string | null {
    const normalized = text.toLowerCase();
    const extra = (extraCsv || '')
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
    for (const word of [...PAGEGEN_SENSITIVE_WORDS, ...extra]) {
      if (normalized.includes(word.toLowerCase())) {
        return word;
      }
    }
    return null;
  }
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;');
}
