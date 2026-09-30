import type { Metadata } from 'next';

import GenForm from './GenForm';

// 生成表单页不进搜索引擎（与 /p/ 托管页的 noindex 策略一致）
export const metadata: Metadata = {
  title: '生成页面',
  robots: { index: false, follow: false },
};

export default function GenPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">生成你的页面</h1>
        <p className="mt-2 text-sm text-gray-600">
          填写下面的表单，AI 会在 30-60 秒内为你生成一个可以直接分享的网页。
        </p>
      </header>
      <GenForm />
    </div>
  );
}
