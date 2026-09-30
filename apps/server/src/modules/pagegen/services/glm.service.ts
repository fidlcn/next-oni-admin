import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PAGEGEN_TAGS, PAGEGEN_STYLES } from '../pagegen.constants';

/** GLM 生成输入（service 组装好的结构化字段） */
export interface PagegenLlmInput {
  title: string;
  tags: string[];
  style: string;
  content: string;
}

export interface PagegenLlmResult {
  html: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
}

/**
 * 系统提示词 —— 禁联网是硬约束：
 * 生成的页面必须自包含，不引用任何外部资源，内容仅来自用户输入与模型已有知识。
 * 与 nginx /p/ 的 CSP（default-src 'none'）互为印证：即使模型违规引用也加载不出。
 */
const SYSTEM_PROMPT = `你是一名资深网页设计师与前端工程师。根据用户输入生成一个完整的 HTML5 单页，严格遵守：

1. 只输出一个完整 HTML 文档：以 <!DOCTYPE html> 开始、以 </html> 结束；不要任何解释文字、不要 markdown 代码围栏。
2. 【禁止联网】不得引用任何外部脚本、字体、图标库、CSS 框架、CDN 资源；不得编造或引用任何网络来源。
3. 图片只允许使用用户正文中明确给出的图片 URL 或 data URI；用户没提供就不要放外链图片，用纯 CSS 图形、emoji 或内联 SVG 代替。
4. 禁止 <script>、<iframe>、<form>、<input> 等表单控件与任何 on* 事件属性；全部样式通过 <style> 标签或 style 属性内联实现。
5. 内容完全基于用户输入与你的已有知识组织，不要虚构无法核实的事实（如具体奖项、资质、数据来源）。
6. 移动端优先、自适应宽度；中文排版清晰，合理使用标题层级、留白、配色与分区；页面要完整、精致、可直接发布。`;

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
 * GLM 调用服务 —— OpenAI 兼容 chat/completions
 * 密钥仅从环境变量读取，只存进程内存；不打印密钥与完整提示词
 */
@Injectable()
export class GlmService {
  private readonly logger = new Logger(GlmService.name);

  constructor(private configService: ConfigService) {}

  /** 组装对话消息（纯函数便于单测） */
  buildMessages(input: PagegenLlmInput) {
    const tagLabels = PAGEGEN_TAGS.filter((t) =>
      input.tags.includes(t.value),
    ).map((t) => t.label);
    const style = PAGEGEN_STYLES.find((s) => s.value === input.style);

    const userPrompt = [
      `页面标题：${input.title}`,
      `主题标签：${tagLabels.join('、') || '未指定'}`,
      `设计风格：${style ? `${style.label} —— ${style.design}` : '简约 —— 大量留白、单一主色、细字重'}`,
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

      return {
        html: extractHtml(content),
        tokensIn: json?.usage?.prompt_tokens ?? 0,
        tokensOut: json?.usage?.completion_tokens ?? 0,
        model,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
