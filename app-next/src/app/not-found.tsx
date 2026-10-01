export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <section className="flex justify-center py-12">
        <div className="card shadow-neo p-10 text-center max-w-md w-full">
          <div className="mx-auto w-24 h-24 rounded-xl border-2 border-[var(--nhai-border)] bg-[var(--nhai-soft)] flex items-center justify-center text-6xl mb-4" aria-hidden="true">🤔</div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-2">404</h1>
          <p className="text-sm text-[var(--nhai-muted)] mb-6">Trang bạn tìm không tồn tại hoặc đã bị chuyển.</p>
          <a href="/" className="btn-main inline-block px-6 py-3">Về trang chủ</a>
        </div>
      </section>
    </main>
  );
}
