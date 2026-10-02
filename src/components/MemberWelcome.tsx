import Link from "next/link";
import MemberLogin from "./MemberLogin";

export default function MemberWelcome() {
  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      <section className="sticky top-0 z-40 bg-[#8B0029] px-5 py-6 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">
                Korea University Tennis Club
              </p>

              <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
                <span>고려대학교 테니스부</span>
                <span className="block sm:inline sm:ml-2">코트 예약</span>
              </h1>
            </div>

            <nav className="flex flex-wrap gap-2 text-sm font-bold">
              <Link
                href="/"
                className="rounded-full bg-white px-4 py-2 text-[#8B0029]"
              >
                코트 예약
              </Link>

              <Link
                href="/my"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                예약 확인
              </Link>

              <Link
                href="/notice"
                className="rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                공지사항
              </Link>
            </nav>
          </div>
        </div>
      </section>

      <MemberLogin />
    </main>
  );
}
