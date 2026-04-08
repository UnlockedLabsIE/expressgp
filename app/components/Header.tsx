import Link from "next/link";
import Logo from "@/app/components/Logo";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faqs", label: "FAQs" },
];

export default function Header() {
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
          </nav>

          <Link
            href="/register"
            className="rounded-full bg-[#28A863] px-4 py-2 text-sm font-semibold text-white shadow-sm md:hidden"
          >
            Get Started →
          </Link>
        </div>
    </header>
  );
}
