"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Overview",    href: "/admin" },
  { label: "Partner GPs", href: "/admin/gps" },
  { label: "Patients",    href: "/admin/patients" },
  { label: "Audit Log",   href: "/admin/audit" },
  { label: "GDPR",        href: "/admin/gdpr" },
  { label: "Billing",     href: "/admin/billing" },
  { label: "Config",      href: "/admin/config" },
];

export default function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-white/10 text-white ring-1 ring-white/15"
                : "text-white/65 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            <span className="min-w-0 truncate">{item.label}</span>
            {isActive && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
