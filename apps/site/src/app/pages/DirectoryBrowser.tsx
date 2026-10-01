'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { PAGEGEN_TAGS, api, pageUrl, beaconView } from '@/lib/pagegen';

const PAGE_SIZE = 12;

interface DirectoryItem {
  pageId: string;
  title: string;
  tags: string[];
  createdAt: string;
  views: number;
}

const labelOf = (value: string) =>
  PAGEGEN_TAGS.find((t) => t.value === value)?.label || value;

export default function DirectoryBrowser() {
  const [tag, setTag] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [sort, setSort] = useState<'latest' | 'hot'>('latest');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<DirectoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 请求序号：快速切换筛选时丢弃过期响应，避免旧结果覆盖新结果（竞态）
  const seqRef = useRef(0);

  const fetchList = useCallback(async () => {
    const seq = ++seqRef.current;
    // 请求前置 loading 态（fetchList 由筛选/分页变化经 effect 触发）

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sort,
      });
      if (tag) params.set('tag', tag);
      if (keyword) params.set('keyword', keyword);
      const data = await api<{ list: DirectoryItem[]; total: number }>(
        `/v1/pagegen/public/list?${params.toString()}`,
      );
      if (seq !== seqRef.current) return;
      setList(data.list || []);
      setTotal(data.total || 0);
    } catch {
      if (seq !== seqRef.current) return;
      setList([]);
      setTotal(0);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [tag, keyword, sort, page]);

  useEffect(() => {
    // 筛选/分页变化即重新加载（fetchList 首步同步置 loading）

    fetchList();
  }, [fetchList]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      {/* 筛选区：标签 chips + 搜索 + 排序 */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setTag(null);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              tag === null
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-300 text-gray-600 hover:border-gray-500'
            }`}
          >
            全部
          </button>
          {PAGEGEN_TAGS.map((t) => (
            <button
              key={t.value}
              title={t.desc}
              onClick={() => {
                setTag(t.value);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                tag === t.value
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <form
            className="flex w-full max-w-sm gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setKeyword(keywordInput.trim());
              setPage(1);
            }}
          >
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="搜索页面标题"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none transition focus:border-gray-900"
            />
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-500"
            >
              搜索
            </button>
          </form>

          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            {(
              [
                ['latest', '最新'],
                ['hot', '热门'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  setSort(value);
                  setPage(1);
                }}
                className={`px-4 py-1.5 text-xs font-medium transition ${
                  sort === value
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 卡片列表 */}
      {loading ? (
        <p className="py-20 text-center text-sm text-gray-400">加载中…</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-20 text-center">
          <p className="text-sm text-gray-500">还没有符合条件的页面</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((item) => (
            <a
              key={item.pageId}
              href={pageUrl(item.pageId)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => beaconView(item.pageId)}
              className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-gray-400 hover:shadow-sm"
            >
              <h3 className="mb-2 line-clamp-2 font-semibold text-gray-900 group-hover:underline">
                {item.title}
              </h3>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {(item.tags || []).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {labelOf(t)}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex items-center justify-between text-xs text-gray-400">
                <span>
                  {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                </span>
                <span>{item.views ?? 0} 次浏览</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-300 px-4 py-1.5 font-medium text-gray-700 transition hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-300 px-4 py-1.5 font-medium text-gray-700 transition hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
