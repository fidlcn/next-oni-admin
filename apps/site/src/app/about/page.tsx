import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '关于',
};

export default function AboutPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-3xl font-bold text-gray-900">关于</h1>
        <div className="mt-8 space-y-4 text-gray-600 leading-relaxed">
          <p>
            Next Oni Admin
            是一个基于TypeScript的全栈后台管理系统，采用Monorepo架构，集成了内容管理、权限控制、博客展示等功能。
          </p>
          <p>技术栈：NestJS + React + Next.js + TypeORM + MySQL</p>
          <p className="text-sm text-gray-400">更多内容二期完善</p>
        </div>
      </div>
    </div>
  );
}
