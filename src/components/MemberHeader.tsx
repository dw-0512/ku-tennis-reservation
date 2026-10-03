import Link from "next/link";
import type { ReactNode } from "react";

const tabs = [
  { href: "/", label: "코트 예약" },
  { href: "/my", label: "예약 확인" },
  { href: "/notice", label: "공지사항" },
];

export default function MemberHeader({
  active = "/",
  title,
  compact = false,
}: {
  active?: string;
  title?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="sticky top-0 z-40 bg-[#8B0029] px-5 py-6 text-white">
      <div className={compact ? "mx-auto max-w-5xl" : "mx-auto max-w-6xl"}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">
              Korea University Tennis Club
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
              {title ?? (
                <>
                  <span>고려대학교 테니스부</span>
                  <span className="block sm:inline sm:ml-2">코트 예약</span>
                </>
              )}
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  tab.href === active
                    ? "rounded-full bg-white px-4 py-2 text-[#8B0029]"
                    : "rounded-full bg-white/10 px-4 py-2 text-white ring-1 ring-white/20 transition hover:bg-white/20"
                }
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
