import type { Metadata } from 'next';

import GenForm from '../../gen/GenForm';

// 口令专属邀请页 —— 管理端「口令列表/口令生成」对外发放的短链入口。
// 不进搜索引擎；真实的 /gen 地址不再对外分享（保留给管理员自用）。
export const metadata: Metadata = {
  title: '生成页面',
  robots: { index: false, follow: false },
};

export default async function InviteGenPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">生成你的页面</h1>
        <p className="mt-2 text-sm text-gray-600">
          填写下面的表单，AI 会在 30-60 秒内为你生成一个可以直接分享的网页。
        </p>
      </header>
      <GenForm inviteCode={code} />
    </div>
  );
}
