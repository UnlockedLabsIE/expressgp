"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/app/components/Logo";
import { supabase } from "@/lib/supabase";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faqs", label: "FAQs" },
];

export default function Header() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setLoggedIn(!!data.session);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-[0_1px_2px_0_rgba(15,39,68,0.04)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          aria-label="ExpressGP home"
          className="flex items-center"
        >
          <Logo height={44} />
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#2F6FB6] transition-colors hover:text-[#2FB36F]"
            >
              {link.label}
            </Link>
          ))}

          {loggedIn === null ? (
            // Auth state loading — render nothing to avoid flash
            <span className="w-[140px]" />
          ) : loggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-[#2F6FB6] transition-colors hover:text-[#2FB36F]"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#0F2744] transition hover:border-[#2FB36F] hover:text-[#2FB36F]"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-[#2F6FB6] transition-colors hover:text-[#2FB36F]"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-[#28A863] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                Get Started →
              </Link>
            </>
          )}
        </nav>

        {/* Mobile CTA */}
        {loggedIn ? (
          <Link
            href="/dashboard"
            className="rounded-full bg-[#28A863] px-4 py-2 text-sm font-semibold text-white shadow-sm md:hidden"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            href="/register"
            className="rounded-full bg-[#28A863] px-4 py-2 text-sm font-semibold text-white shadow-sm md:hidden"
          >
            Get Started →
          </Link>
        )}
      </div>
    </header>
  );
}
