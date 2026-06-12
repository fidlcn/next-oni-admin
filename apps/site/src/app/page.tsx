import Link from 'next/link';
import { SITE_NAME } from '@/lib/config';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-24">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {SITE_NAME}
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            在这里种下技术的种子，等待知识的花朵绽放。
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/blog"
              className="rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              浏览博客
            </Link>
            <Link
              href="/about"
              className="rounded-md border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              了解更多
            </Link>
          </div>
        </div>
      </section>

      {/* Features placeholder */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            功能模块
          </h2>
          <p className="mt-2 text-center text-gray-500">二期完善</p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: '内容管理',
                desc: '文章发布、分类管理、媒体库',
                icon: '📝',
              },
              {
                title: '权限系统',
                desc: 'RBAC 角色权限、菜单控制',
                icon: '🔐',
              },
              {
                title: '博客展示',
                desc: '公开博客、文章详情、分类浏览',
                icon: '📖',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-gray-200 p-6 transition-shadow hover:shadow-md"
              >
                <div className="text-3xl">{item.icon}</div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
