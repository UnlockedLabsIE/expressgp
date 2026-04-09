"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getServiceConfig, type ServiceSubtype } from "@/lib/config/services";

export default function Glp1SubtypePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        router.push("/login");
        return;
      }
      setAuthChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const config = getServiceConfig("glp1");
  const subtypes: ServiceSubtype[] =
    config?.subtypes.filter((s) => s.active) ?? [];

  if (!authChecked) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F9FAFB]">
        <p className="text-sm text-[#6B7280]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#F9FAFB]">
      <main className="mx-auto w-full max-w-4xl px-6 py-12 sm:py-16">
        <Link
          href="/"
          className="text-sm font-medium text-[#2F6FB6] hover:text-[#2FB36F]"
        >
          ← Back
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#0F2744] sm:text-4xl">
          GLP-1 Weight Loss Programme
        </h1>
        <p className="mt-2 text-base text-[#6B7280]">
          Medically supervised weight loss — select where you are in your
          journey.
        </p>

        <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {subtypes.map((subtype) => (
            <li key={subtype.value}>
              <Link
                href={`/glp1/${subtype.value}`}
                className="group relative flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#28A863] hover:shadow-md"
              >
                <h2 className="text-base font-semibold text-[#0F2744]">
                  {subtype.label}
                </h2>
                <p className="mt-2 text-sm font-medium text-[#28A863]">
                  €{subtype.price}
                </p>
                <span
                  aria-hidden
                  className="absolute bottom-5 right-5 text-lg font-semibold text-[#2FB36F] opacity-0 transition group-hover:opacity-100"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
