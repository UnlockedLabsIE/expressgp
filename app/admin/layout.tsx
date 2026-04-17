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
            <div className="relative h-12 w-full overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
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

          {/* Identity card — matches GP dashboard style */}
          <div className="mt-5 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#22c55e]/15 text-xs font-semibold tracking-tight text-[#86efac] ring-1 ring-[#22c55e]/35"
                aria-hidden
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{adminName}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-white/55">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e] shadow-[0_0_0_2px_rgba(34,197,94,0.25)]"
                    aria-hidden
                  />
                  Admin · Signed in
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
