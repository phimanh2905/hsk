/* Route group (wide) — container 1280px cho trang mock max-width lớn (Hanzi Studio,
   spec 2026-10-05 §4). Shell nằm ở root layout nên URL không đổi; (app) giữ max-w-5xl. */

export default function WideLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1280px] px-4 py-6 pb-28 lg:pb-6">{children}</div>;
}
