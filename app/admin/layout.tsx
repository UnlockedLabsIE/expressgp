import Image from "next/image";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSignOutButton from "./AdminSignOutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let adminName = "Admin";
  let adminEmail = "";

  if (user) {
    try {
      const admin = createAdminSupabaseClient();
      const { data } = await admin
        .from("admin_users")
        .select("full_name, email")
        .eq("id", user.id)
        .single();
      if (data) {
        adminName = data.full_name;
        adminEmail = data.email;
      }
    } catch {
      // If service role key not configured yet, fall back gracefully
    }
  }

  const initials = adminName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#0f1729] text-slate-100">
      <div className="mx-auto flex max-w-7xl">

        {/* ── Admin Sidebar ── */}
        <aside className="hidden w-72 shrink-0 border-r border-white/10 px-5 py-6 md:block">
          <Link href="/admin">
            <div className="relative h-12 w-full overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-amber-500/20">
              <Image
                src="/logo.png"
                alt="ExpressGP"
                fill
                priority
                sizes="232px"
                className="object-cover opacity-95"
                style={{ objectPosition: "50% 45%" }}
              />
            </div>
          </Link>

          {/* Admin badge */}
          <div className="mt-3 flex items-center justify-center">
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-amber-400">
              Admin Portal
            </span>
          </div>

          {/* Admin identity card */}
          <div className="mt-4 rounded-2xl bg-amber-500/5 p-3.5 ring-1 ring-amber-500/20">
            <div className="flex items-center gap-3">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-500/15 text-xs font-semibold tracking-tight text-amber-300 ring-1 ring-amber-500/35"
                aria-hidden
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{adminName}</p>
                <p className="mt-0.5 truncate text-xs text-white/50">{adminEmail}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-400/80">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.25)]"
                    aria-hidden
                  />
                  Super admin
                </p>
              </div>
            </div>
          </div>

          <AdminSidebarNav />

          <div className="mt-6 border-t border-white/10 pt-4">
            <AdminSignOutButton />
          </div>
        </aside>

        {/* ── Page content ── */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
