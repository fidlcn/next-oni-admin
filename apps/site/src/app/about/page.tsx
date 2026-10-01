import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '关于',
};

export default function AboutPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          关于
        </h1>
        {/* 文案清空，二期补充 */}
        <p className="mt-8 font-mono text-xs tracking-widest text-gray-300">
          {'// under construction'}
        </p>
      </div>
    </div>
  );
}
