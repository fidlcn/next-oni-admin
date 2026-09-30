'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';

import {
  PAGEGEN_TAGS,
  PAGEGEN_STYLES,
  api,
  pageUrl,
  beaconView,
} from '@/lib/pagegen';

type Phase = 'idle' | 'generating' | 'done' | 'failed';

interface RecentItem {
  pageId: string;
  title: string;
  status: string;
  createdAt: number;
}

const CODE_KEY = 'pagegen:code';
const RECENT_KEY = 'pagegen:recent';

/** 时间驱动的阶段文案（真实进度 API 不存在，用已等待时长模拟） */
function stageText(seconds: number): string {
  if (seconds < 8) return '正在理解内容…';
  if (seconds < 25) return '正在排版设计…';
  if (seconds < 50) return '细节打磨中…';
  if (seconds < 120) return '还在精雕细琢，稍安勿躁…';
  return '即将完成，请稍候…';
}

/**
 * 生成表单 —— 尽量精简：风格 + 内容 + 口令三字段。
 * 标题与标签由 AI 决定：标题自拟（元数据注释回传），标签在预设范围内挑选。
 */
export default function GenForm() {
  const [style, setStyle] = useState<string>('auto');
  const [content, setContent] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [pageId, setPageId] = useState('');
  const [resultUrl, setResultUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  // 恢复本设备的口令与最近生成
  useEffect(() => {
    setAccessCode(localStorage.getItem(CODE_KEY) || '');
    try {
      setRecents(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'));
    } catch {
      setRecents([]);
    }
  }, []);

  // 正文 placeholder 示例轮播
  useEffect(() => {
    const timer = setInterval(() => setPlaceholderIdx((i) => i + 1), 4000);
    return () => clearInterval(timer);
  }, []);

  const placeholder = `描述你想要的页面，越具体越好，例如：${
    PAGEGEN_TAGS[placeholderIdx % PAGEGEN_TAGS.length].example
  }`;

  // 轮询任务状态
  useEffect(() => {
    if (phase !== 'generating' || !pageId) return;

    setElapsed(0);
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);

    const poll = setInterval(async () => {
      try {
        const data = await api<{
          status: string;
          title?: string;
          error?: string;
          url?: string;
        }>(`/v1/pagegen/status/${pageId}`);
        if (data.status === 'done' && data.url) {
          const abs = new URL(data.url, window.location.origin).toString();
          setResultUrl(abs);
          setPhase('done');
          beaconView(pageId);
          QRCode.toDataURL(abs, { width: 220, margin: 1 })
            .then(setQrDataUrl)
            .catch(() => {});
          updateRecent(pageId, 'done', data.title);
        } else if (data.status === 'failed') {
          setError(data.error || '生成失败，请调整描述后重试');
          setPhase('failed');
          updateRecent(pageId, 'failed');
        }
      } catch {
        // 网络抖动忽略，下次轮询继续
      }
    }, 3000);

    // 前端超时兜底（后端单次 GLM 上限 5 分钟 + 余量）
    const timeout = setTimeout(() => {
      if (phaseRef.current === 'generating') {
        setError('等待时间过长，请稍后在「最近生成」里查看结果，或重新提交');
        setPhase('failed');
      }
    }, 400_000);

    return () => {
      clearInterval(tick);
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [phase, pageId]);

  function saveRecents(next: RecentItem[]) {
    setRecents(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  }

  /** 新增/更新一条最近记录（status 必填；title 缺省沿用旧值或占位文案） */
  function updateRecent(id: string, status: string, newTitle?: string) {
    const prev = recents;
    const existing = prev.find((r) => r.pageId === id);
    saveRecents(
      [
        {
          pageId: id,
          title: newTitle || existing?.title || '生成中…',
          status,
          createdAt: existing?.createdAt ?? Date.now(),
        },
        ...prev.filter((r) => r.pageId !== id),
      ].slice(0, 20),
    );
  }

  // 恢复轮询：刷新/杀后台重开后，「最近生成」里未到终态的任务自动续上轮询。
  // 手机浏览器后台会挂起定时器导致轮询中断、界面停在"生成中"——这里把它救回来。
  useEffect(() => {
    const stale = recents.filter(
      (r) => r.status === 'generating' || r.status === 'pending',
    );
    if (stale.length === 0 || phase === 'generating') return;

    let stopped = false;
    const pollStale = async () => {
      if (stopped || document.hidden) return;
      for (const item of stale) {
        try {
          const data = await api<{
            status: string;
            title?: string;
            url?: string;
          }>(`/v1/pagegen/status/${item.pageId}`);
          if (data.status === 'done' || data.status === 'failed') {
            updateRecent(item.pageId, data.status, data.title);
          }
        } catch {
          // 网络抖动忽略
        }
      }
    };

    void pollStale();
    const timer = setInterval(() => void pollStale(), 3000);
    // 从后台切回：立即补一次查询，不等下一个 3 秒
    const onVisible = () => {
      if (!document.hidden) void pollStale();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [recents, phase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) return setError('请描述你想要的页面内容');
    if (!accessCode.trim()) return setError('请填写访问口令');

    setSubmitting(true);
    try {
      localStorage.setItem(CODE_KEY, accessCode.trim());
      const data = await api<{ pageId: string }>('/v1/pagegen/submit', {
        method: 'POST',
        body: JSON.stringify({
          style,
          content: content.trim(),
          accessCode: accessCode.trim(),
        }),
      });
      setPageId(data.pageId);
      setPhase('generating');
      updateRecent(data.pageId, 'generating');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(resultUrl);
      setError('');
      alert('链接已复制');
    } catch {
      // 剪贴板不可用时退化：选中提示
      setError(`复制失败，请手动复制：${resultUrl}`);
    }
  };

  const generating = phase === 'generating';

  return (
    <div className="space-y-8">
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6"
      >
        {/* 风格 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            设计风格{' '}
            <span className="font-normal text-gray-400">
              （标题和标签由 AI 帮你定）
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {PAGEGEN_STYLES.map((s) => {
              const active = style === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  disabled={generating}
                  onClick={() => setStyle(s.value)}
                  className={`rounded-lg border px-4 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-600 hover:border-gray-500 disabled:opacity-40'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 正文 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            页面内容{' '}
            <span className="font-normal text-gray-400">
              （写得越具体，效果越好，2000 字以内）
            </span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            rows={6}
            disabled={generating}
            placeholder={placeholder}
            className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50"
          />
        </div>

        {/* 口令 —— 明文显示：共享口令无需遮掩，手机上更好核对 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            访问口令
          </label>
          <input
            type="text"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            maxLength={128}
            disabled={generating}
            placeholder="向页面管理员获取"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50"
          />
        </div>

        {error && phase !== 'done' && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={generating || submitting}
          className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? '生成中，请稍候…' : submitting ? '提交中…' : '生成页面'}
        </button>
        {generating && (
          <p className="text-center text-xs text-gray-400">
            生成期间不能重复提交
          </p>
        )}
      </form>

      {/* 生成进度 */}
      {generating && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="mb-3 text-sm font-medium text-gray-700">
            {stageText(elapsed)}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gray-900 transition-all duration-1000 ease-linear"
              style={{ width: `${Math.min(92, (elapsed / 60) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            通常需要 30-60 秒，已等待 {elapsed}{' '}
            秒。可以离开本页，稍后在「最近生成」里找回。
          </p>
        </div>
      )}

      {/* 生成结果 */}
      {phase === 'done' && resultUrl && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900">
            页面已生成 🎉
          </h3>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="flex-1 min-w-0 space-y-3">
              <a
                href={resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => beaconView(pageId)}
                className="block truncate rounded-lg border border-gray-200 px-3 py-2 text-sm text-blue-600 hover:underline"
              >
                {resultUrl}
              </a>
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-700"
                >
                  复制链接
                </button>
                <Link
                  href="/pages"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-gray-500"
                >
                  到目录页看看
                </Link>
              </div>
              <p className="text-xs text-gray-400">
                想要新的一页？修改描述后可再次生成（每 IP 每天有限额）。
              </p>
            </div>
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="页面二维码"
                className="h-[140px] w-[140px] rounded-lg border border-gray-200"
              />
            )}
          </div>
        </div>
      )}

      {/* 最近生成（本设备） */}
      {recents.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            我的最近生成（本设备）
          </h3>
          <ul className="divide-y divide-gray-100">
            {recents.map((r) => (
              <li
                key={r.pageId}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span className="mr-3 truncate text-gray-700">{r.title}</span>
                {r.status === 'done' ? (
                  <a
                    href={pageUrl(r.pageId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => beaconView(r.pageId)}
                    className="shrink-0 text-xs font-medium text-blue-600 hover:underline"
                  >
                    打开
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-gray-400">
                    {r.status === 'generating' ? '生成中…' : '未完成'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
