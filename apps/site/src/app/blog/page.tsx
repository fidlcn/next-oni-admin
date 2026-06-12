import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '博客',
};

// 占位博客数据 — 二期从后端 API 获取
const placeholderPosts = [
  {
    slug: 'react-18-performance',
    title: '使用 React 18 构建高性能后台',
    excerpt: '本文介绍如何使用 React 18 的新特性来构建高性能的后台管理系统...',
    date: '2025-03-01',
    category: '前端开发',
  },
  {
    slug: 'nestjs-best-practices',
    title: 'NestJS 最佳实践指南',
    excerpt:
      'NestJS 是一个用于构建高效、可扩展的 Node.js 服务器端应用程序的框架...',
    date: '2025-03-05',
    category: '后端开发',
  },
  {
    slug: 'typescript-5-features',
    title: 'TypeScript 5.0 新特性一览',
    excerpt: 'TypeScript 5.0 带来了许多令人兴奋的新特性...',
    date: '2025-04-10',
    category: '前端开发',
  },
];

export default function BlogPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="text-3xl font-bold text-gray-900">博客</h1>
        <p className="mt-2 text-gray-500">技术分享与实践记录</p>

        <div className="mt-10 space-y-6">
          {placeholderPosts.map((post) => (
            <article
              key={post.slug}
              className="rounded-lg border border-gray-200 p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>{post.date}</span>
                <span>·</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-600">
                  {post.category}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-gray-900">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-gray-600 transition-colors"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-gray-600 line-clamp-2">{post.excerpt}</p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-4 inline-block text-sm font-medium text-gray-900 hover:text-gray-600 transition-colors"
              >
                阅读全文 →
              </Link>
            </article>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-gray-400">
          博客内容二期从后端 API 加载
        </p>
      </div>
    </div>
  );
}
