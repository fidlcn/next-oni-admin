import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// 占位博客详情 — 二期从后端 API 获取
const posts: Record<
  string,
  { title: string; date: string; category: string; content: string }
> = {
  'react-18-performance': {
    title: '使用 React 18 构建高性能后台',
    date: '2025-03-01',
    category: '前端开发',
    content:
      '本文介绍如何使用 React 18 的新特性来构建高性能的后台管理系统。内容占位，二期完善。',
  },
  'nestjs-best-practices': {
    title: 'NestJS 最佳实践指南',
    date: '2025-03-05',
    category: '后端开发',
    content:
      'NestJS 是一个用于构建高效、可扩展的 Node.js 服务器端应用程序的框架。内容占位，二期完善。',
  },
  'typescript-5-features': {
    title: 'TypeScript 5.0 新特性一览',
    date: '2025-04-10',
    category: '前端开发',
    content: 'TypeScript 5.0 带来了许多令人兴奋的新特性。内容占位，二期完善。',
  },
};

export function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = posts[slug];
  if (!post) return { title: '未找到' };
  return { title: post.title };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = posts[slug];

  if (!post) {
    notFound();
  }

  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href="/blog"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← 返回博客列表
        </Link>

        <article className="mt-8">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{post.date}</span>
            <span>·</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-600">
              {post.category}
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            {post.title}
          </h1>

          <div className="mt-8 leading-relaxed text-gray-600">
            <p>{post.content}</p>
          </div>
        </article>
      </div>
    </div>
  );
}
