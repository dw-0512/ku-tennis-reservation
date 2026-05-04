import Link from "next/link";

export default function NoticePage() {
  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <section className="bg-[#8B0029] px-5 py-6 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">
                Korea University Tennis Club
              </p>

              <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
                공지사항
              </h1>
            </div>

            <nav className="flex flex-wrap gap-2 text-sm font-bold">
              <Link
                href="/"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                코트 예약
              </Link>

              <Link
                href="/my"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                내 예약 확인 및 취소
              </Link>

              <Link
                href="/notice"
                className="rounded-full bg-white px-4 py-2 text-[#8B0029]"
              >
                공지사항
              </Link>
            </nav>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E5E5E5]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B0029]/10 text-3xl">
            📢
          </div>

          <h2 className="mt-5 text-2xl font-bold text-gray-900">
            공지사항 준비중입니다
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            <span>추후 코트 예약 관련 안내를</span>
            <span className="block sm:inline sm:ml-1">
              이곳에서 확인할 수 있습니다.
            </span>
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-[#8B0029] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#6F0021]"
          >
            코트 예약으로 돌아가기
          </Link>
        </div>
      </section>
    </main>
  );
}