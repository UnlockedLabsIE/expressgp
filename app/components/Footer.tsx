import Link from "next/link";
import Logo from "@/app/components/Logo";

export default function Footer() {
  return (
    <footer className="bg-[#0F2744] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:justify-between">
        <Logo
          height={36}
          style={{ filter: "brightness(0) invert(1)" }}
        />

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-white/60">
          <span>© 2026 ExpressGP. All rights reserved.</span>
          <span aria-hidden>|</span>
          <Link href="/privacy" className="transition hover:text-white">
            Privacy Policy
          </Link>
          <span aria-hidden>|</span>
          <Link href="/terms" className="transition hover:text-white">
            Terms
          </Link>
        </div>

        <p className="text-sm text-white/60">Made in Ireland 🇮🇪</p>
      </div>
    </footer>
  );
}
