// app-next/src/app/(wide)/layout.tsx
/* Route group (wide) — container 1280px cho các trang mock max-width lớn.
   Shell nằm ở root layout nên URL không đổi; (app) giữ max-w-5xl.
   Dùng chung bởi plan hanzi-studio + pinyin-lab (spec 2026-10-05). */

export default function WideLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1280px] px-4 py-6 pb-28 lg:pb-6">{children}</div>;
}
