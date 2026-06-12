import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '联系',
};

export default function ContactPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-3xl font-bold text-gray-900">联系我们</h1>
        <div className="mt-8 space-y-4 text-gray-600 leading-relaxed">
          <p>如有合作意向或问题咨询，请通过以下方式联系。</p>
          <p className="text-sm text-gray-400">联系表单二期完善</p>
        </div>
      </div>
    </div>
  );
}
