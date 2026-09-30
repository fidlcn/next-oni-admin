import Link from 'next/link';

import { SITE_NAME, SITE_DESCRIPTION } from '@/lib/config';

/**
 * 主页占位设计 —— 浅色编辑风，呼应终端启动页：
 * 点阵纹理 / 等宽微标签 / 巨型标题 + 荧光光标 / 文件索引式导航
 * 无 CTA 按钮、无底部介绍区块（按需求裁剪）
 */
const ENTRIES = [
  {
    href: '/blog',
    index: '01',
    title: '博客',
    path: '/blog',
    desc: '偶发的思考与实践记录',
  },
  {
    href: '/pages',
    index: '02',
    title: '页面广场',
    path: '/pages',
    desc: 'AI 生成页面的陈列室',
  },
  {
    href: '/about',
    index: '03',
    title: '关于',
    path: '/about',
    desc: '尚在施工',
  },
];

export default function HomeLanding() {
  return (
    <div className="relative">
      {/* 点阵纹理 */}
      <div
        className="dotgrid pointer-events-none absolute inset-x-0 top-0 h-[560px]"
        aria-hidden
      />

      <div className="mx-auto max-w-6xl px-4">
        {/* 状态行 */}
        <div className="flex items-center justify-between border-b border-gray-200 py-4 font-mono text-[11px] tracking-widest text-gray-400">
          <span className="flex items-center gap-2">
            <span className="home-dot inline-block h-1.5 w-1.5 rounded-full bg-[#3dff7c]" />
            session established
          </span>
          <span>~/home</span>
        </div>

        {/* Hero */}
        <section className="py-28 sm:py-36">
          <p className="font-mono text-xs tracking-widest text-emerald-600">
            {'// welcome home'}
          </p>
          <h1 className="mt-6 text-5xl font-bold lowercase tracking-tighter text-gray-900 sm:text-7xl">
            {SITE_NAME}
            <span className="home-caret" aria-hidden />
          </h1>
          <p className="mt-8 max-w-md text-base leading-7 text-gray-500">
            {SITE_DESCRIPTION}
          </p>
        </section>

        {/* 文件索引式导航 */}
        <nav className="mb-24">
          <p className="mb-5 font-mono text-xs tracking-widest text-gray-400">
            $ ls ~/
          </p>
          <div className="border-t border-gray-200">
            {ENTRIES.map((e) => (
              <Link
                key={e.href}
                href={e.href}
                className="group grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 border-b border-gray-200 py-7 transition-colors hover:bg-gray-50 sm:grid-cols-[4rem_10rem_1fr_auto] sm:gap-6"
              >
                <span className="font-mono text-xs text-gray-300 transition-colors group-hover:text-emerald-500">
                  {e.index}
                </span>
                <span className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
                  {e.title}
                </span>
                <span className="col-start-2 row-start-2 font-mono text-xs text-gray-400 sm:col-start-3 sm:row-start-1">
                  {e.path} — {e.desc}
                </span>
                <span className="hidden font-mono text-lg text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-emerald-500 sm:block">
                  →
                </span>
              </Link>
            ))}
          </div>
        </nav>

        {/* 底部元信息（单行 hairline，非介绍区块） */}
        <div className="border-t border-gray-100 py-6 font-mono text-[11px] tracking-widest text-gray-300">
          all systems nominal
        </div>
      </div>
    </div>
  );
}
