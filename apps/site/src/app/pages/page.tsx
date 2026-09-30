import type { Metadata } from 'next';

import DirectoryBrowser from './DirectoryBrowser';

// 目录页只面向人类访客（与 /p/ 托管页的 noindex 策略一致）
export const metadata: Metadata = {
  title: '页面广场',
  robots: { index: false, follow: false },
};

export default function PagesDirectory() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">页面广场</h1>
        <p className="mt-2 text-sm text-gray-600">
          这里陈列着大家生成的页面，按标签逛逛吧。
        </p>
      </header>
      <DirectoryBrowser />
    </div>
  );
}
