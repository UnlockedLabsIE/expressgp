"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Overview",      href: "/dashboard" },
  { label: "Consultations", href: "/dashboard/consultations" },
  { label: "Messages",      href: "/dashboard/messages" },
  { label: "Prescriptions", href: "/dashboard/prescriptions" },
  { label: "Documents",     href: "/dashboard/documents" },
  { label: "Patients",      href: "/dashboard/patients" },
  { label: "Settings",      href: "/dashboard/settings" },
  { label: "Audit log",     href: "/dashboard/audit-log" },
];

export default function SidebarNav({ unreadMessages }: { unreadMessages: number }) {
  const pathname = usePathname();

  return (
    <nav className="mt-8 space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);
        const isMessages = item.href === "/dashboard/messages";

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-white/10 text-white ring-1 ring-white/15"
                : "text-white/75 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {isMessages && unreadMessages > 0 && (
              <span
                className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full border border-red-400/35 bg-red-500/15 px-1.5 text-[11px] font-semibold tabular-nums leading-none text-red-200"
                aria-label={`${unreadMessages} unread messages`}
              >
                {unreadMessages > 99 ? "99+" : unreadMessages}
              </span>
            )}
            <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
              {isActive && <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
