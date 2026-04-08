"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type DashboardCard = {
  href: string;
  title: string;
  description: string;
};

const cards: DashboardCard[] = [
  {
    href: "/consultations/new",
    title: "New Consultation",
    description: "Start a new request — prescription, sick note or referral.",
  },
  {
    href: "/consultations",
    title: "My Consultations",
    description: "View the status of your current and past requests.",
  },
  {
    href: "/documents",
    title: "My Documents",
    description: "Sick notes, certificates and referral letters.",
  },
  {
    href: "/messages",
    title: "Messages",
    description: "Chat with your GP about an active consultation.",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        if (!cancelled) {
          setError(sessionError.message);
          setLoading(false);
        }
        return;
      }

      const userId = sessionData.session?.user.id;
      if (!userId) {
        router.push("/login");
        return;
      }

      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("first_name")
        .eq("id", userId)
        .single();

      if (cancelled) return;

      if (patientError) {
        setError(patientError.message);
      } else {
        setFirstName(patient?.first_name ?? null);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex flex-1 flex-col bg-[#F9FAFB]">
      <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#28A863]">Patient dashboard</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0F2744] sm:text-4xl">
              {loading
                ? "Welcome back…"
                : firstName
                  ? `Welcome back, ${firstName}`
                  : "Welcome back"}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0F2744] transition hover:border-[#2FB36F] hover:text-[#2FB36F]"
          >
            Sign out
          </button>
        </div>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {cards.map((card) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2FB36F] hover:shadow-md"
              >
                <h2 className="text-lg font-semibold text-[#0F2744]">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                  {card.description}
                </p>
                <span className="mt-6 text-sm font-medium text-[#2F6FB6] opacity-0 transition group-hover:opacity-100">
                  Open →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
