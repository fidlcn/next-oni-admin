import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  PAGEGEN_TAGS,
  PAGEGEN_STYLES,
  PAGEGEN_TAG_VALUES,
  PAGEGEN_MAX_TAGS,
  PAGEGEN_TITLE_MAX,
} from '../pagegen.constants';

/** GLM 生成输入（title/tags 由 AI 决定时为空，风格保留用户选择） */
export interface PagegenLlmInput {
  title: string;
  tags: string[];
  style: string;
  content: string;
}

export interface PagegenLlmResult {
  html: string;
  /** AI 自拟的标题/标签（来自元数据注释；用户已提供时为空，由 service 取用户值） */
  title?: string;
  tags?: string[];
  tokensIn: number;
  tokensOut: number;
  model: string;
}

/** 标签范围注入提示词（值=中文说明，供模型选择） */
const TAG_RANGE = PAGEGEN_TAGS.map((t) => `${t.value}=${t.label}`).join(', ');

/**
 * 系统提示词 —— 禁联网是硬约束：
 * 生成的页面必须自包含，不引用任何外部资源，内容仅来自用户输入与模型已有知识。
 * 与 nginx /p/ 的 CSP（default-src 'none'）互为印证：即使模型违规引用也加载不出。
 */
const SYSTEM_PROMPT = `你是一名资深网页设计师与前端工程师。根据用户输入生成一个完整的 HTML5 单页，严格遵守：

1. 输出分两部分：第一行是一行元数据注释（单行合法 JSON，见下），换行后输出完整 HTML 文档（<!DOCTYPE html> 开始、</html> 结束）；不要任何解释文字、不要 markdown 代码围栏。
2. 元数据注释格式固定为：<!--pagegen:{"title":"页面标题","tags":["标签值"]}-->
   （注意结尾是两个短横线加右尖括号 -->）
   - title：用户提供了标题就用用户的；没提供就自拟一个简洁有力的中文标题（20 字以内）；
   - tags：从以下范围中选择 1-3 个最贴合内容的标签值（英文值，不要中文）——${TAG_RANGE}。
3. 【禁止联网】不得引用任何外部脚本、字体、图标库、CSS 框架、CDN 资源；不得编造或引用任何网络来源。
4. 图片只允许使用用户正文中明确给出的图片 URL 或 data URI；用户没提供就不要放外链图片，用纯 CSS 图形、emoji 或内联 SVG 代替。
5. 禁止 <script>、<iframe>、<form>、<input> 等表单控件与任何 on* 事件属性；全部样式通过 <style> 标签或 style 属性内联实现。
6. 内容完全基于用户输入与你的已有知识组织，不要虚构无法核实的事实（如具体奖项、资质、数据来源）。
7. 【移动端优先，硬性要求】页面主要在手机上被打开：
   - 按 375px 宽的小屏设计，再向上适配平板与桌面；使用百分比/max-width 自适应布局；
   - 禁止任何超过视口的固定宽度（如 width:980px），禁止出现横向滚动；
   - 正文字号移动端不小于 16px、行高不低于 1.6；标题层级分明（h1 最大、逐级递减）；
   - 段落宜短（2-4 行），重要信息用列表或卡片分区呈现，避免大段文字糊在一起；
   - 文字与背景对比度要足够，强光/弱光环境下都能看清。
8. 中文排版清晰，合理使用标题层级、留白、配色与分区；页面要完整、精致、可直接发布。`;

/** 从模型输出中提取 HTML 文档（剥解释文字/代码围栏），纯函数便于单测 */
export function extractHtml(raw: string): string {
  let text = (raw || '').trim();

  // 剥掉 ```html ... ``` / ``` ... ``` 围栏
  const fence = text.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n```$/);
  if (fence) {
    text = fence[1].trim();
  }

  const doctypeMatch = text.match(/<!doctype html[\s\S]*<\/html>/i);
  if (doctypeMatch) return doctypeMatch[0];

  const htmlMatch = text.match(/<html[\s\S]*<\/html>/i);
  if (htmlMatch) return htmlMatch[0];

  throw new Error('模型未返回有效的 HTML 文档');
}

/**
 * 解析元数据注释 <!--pagegen:{"title":"..","tags":[..]}-->（容错：缺失/非法 JSON 返回空），纯函数便于单测。
 * 不依赖注释终止符：模型可能丢掉结束符的第二个 '-'（提示词示例曾诱发此格式），
 * 直接截取 pagegen: 之后同一行内的 {...}（注释约定单行，JSON 无嵌套花括号）。
 * 标题统一截断到库表列宽，避免 DB 侧 Data too long。
 */
export function extractMeta(raw: string): { title?: string; tags?: string[] } {
  if (!raw) return {};

  const line = raw.match(/pagegen:\s*(\{.*\})/);
  const legacy = line ? null : raw.match(/<!--\s*pagegen:([\s\S]*?)-->/i);
  const jsonText = (line?.[1] || legacy?.[1] || '').trim();
  if (!jsonText) return {};

  try {
    const json = JSON.parse(jsonText);
    return {
      title:
        typeof json.title === 'string'
          ? json.title.trim().slice(0, PAGEGEN_TITLE_MAX)
          : undefined,
      tags: Array.isArray(json.tags) ? json.tags : undefined,
    };
  } catch {
    return {};
  }
}

/** 校验 AI 标签：过滤白名单外的值、去重、截取上限；全无效时兜底为「创意实验」，纯函数便于单测 */
export function pickValidTags(raw: unknown): string[] {
  const arr = Array.isArray(raw)
    ? raw.filter(
        (t): t is string =>
          typeof t === 'string' && PAGEGEN_TAG_VALUES.includes(t),
      )
    : [];
  const uniq = [...new Set(arr)].slice(0, PAGEGEN_MAX_TAGS);
  return uniq.length > 0 ? uniq : ['fun'];
}

/**
 * GLM 调用服务 —— OpenAI 兼容 chat/completions
 * 密钥仅从环境变量读取，只存进程内存；不打印密钥与完整提示词
 */
@Injectable()
export class GlmService {
  private readonly logger = new Logger(GlmService.name);

  constructor(private configService: ConfigService) {}

  /** 组装对话消息（纯函数便于单测） */
  buildMessages(input: PagegenLlmInput) {
    const style = PAGEGEN_STYLES.find((s) => s.value === input.style);

    const userPrompt = [
      `页面标题：${input.title || '（未提供——请在元数据注释里自拟）'}`,
      `主题标签：${input.tags.length > 0 ? input.tags.join('、') : '（未选择——请在元数据注释里从预设范围挑选）'}`,
      `设计风格：${style ? `${style.label} —— ${style.design}` : '默认 —— 不限定风格，根据内容自由发挥'}`,
      '',
      '页面内容要求：',
      input.content,
    ].join('\n');

    return [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];
  }

  /**
   * 调 GLM 生成页面。重试策略：
   * - 网络类/5xx 错误：立即重试 1 次
   * - 429（限流/余额）：退避 15 秒再试 1 次；若响应体表明余额不足则直接终止
   * - 超时（AbortError）：不重试，单次已等满 5 分钟
   */
  async generatePage(input: PagegenLlmInput): Promise<PagegenLlmResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        return await this.callOnce(input);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `GLM 调用失败（第 ${attempt + 1} 次）：${lastError.message}`,
        );
        if (lastError.name === 'AbortError') break;
        if (/1302|余额不足/.test(lastError.message)) break;
        // 429 立即重试没有意义（线上日志证实两次同秒失败），退避后再试
        if (lastError.message.includes('GLM 接口返回 429') && attempt === 0) {
          await new Promise((r) => setTimeout(r, 15_000));
        }
      }
    }

    if (lastError?.name === 'AbortError') {
      throw new Error('模型响应超时（超过 5 分钟），请精简内容后重试');
    }
    if (/1302|余额不足/.test(lastError?.message || '')) {
      throw new Error('GLM 账户余额不足，请联系管理员充值后重试');
    }
    throw new Error('生成服务暂时不可用，请稍后重试');
  }

  private async callOnce(input: PagegenLlmInput): Promise<PagegenLlmResult> {
    const baseUrl = this.configService.get<string>(
      'GLM_BASE_URL',
      // 默认按量付费通道；GLM Coding Plan 订阅需在 env 里改为
      // https://open.bigmodel.cn/api/coding/paas/v4（套餐额度只在该通道生效）
      'https://open.bigmodel.cn/api/paas/v4',
    );
    const apiKey = this.configService.get<string>('GLM_API_KEY', '');
    const model = this.configService.get<string>('GLM_MODEL', 'glm-5.3');
    const maxTokens = this.configService.get<number>('GLM_MAX_TOKENS', 16384);
    const webSearch =
      this.configService.get<string>('PAGEGEN_WEB_SEARCH', 'false') === 'true';

    if (!apiKey) {
      throw new Error('服务端未配置 GLM_API_KEY');
    }

    const body: Record<string, unknown> = {
      model,
      messages: this.buildMessages(input),
      max_tokens: maxTokens,
      // GLM-5.x 思考模式恒开，显式调低推理力度：HTML 生成不需要 max 思考，省时省钱
      reasoning_effort: 'low',
      stream: false,
    };
    // 联网搜索默认关闭（系统提示词同样禁联网）；放开时仅改配置不动代码
    if (webSearch) {
      body.tools = [
        {
          type: 'web_search',
          web_search: { enable: true, search_result: true },
        },
      ];
    }

    const controller = new AbortController();
    // 非流式生成 16K tokens 可能 legitimately 超过 2 分钟，给足 5 分钟
    const timer = setTimeout(() => controller.abort(), 300_000);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        // 带上响应体（智谱的具体原因码在 body：1302=余额不足、1301=内容安全等）
        const body = (await response.text().catch(() => '')).slice(0, 200);
        throw new Error(
          `GLM 接口返回 ${response.status}${body ? `：${body}` : ''}`,
        );
      }

      const json: any = await response.json();
      const content: string | undefined = json?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('GLM 返回内容为空');
      }

      const html = extractHtml(content);
      const meta = extractMeta(content);
      // 注释缺失/解析失败时的兜底：模型在 HTML <title> 里写的也是它自拟的标题
      const htmlTitle = html
        .match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
        ?.trim();

      return {
        html,
        title:
          meta.title ||
          (htmlTitle ? htmlTitle.slice(0, PAGEGEN_TITLE_MAX) : undefined),
        tags: meta.tags,
        tokensIn: json?.usage?.prompt_tokens ?? 0,
        tokensOut: json?.usage?.completion_tokens ?? 0,
        model,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
