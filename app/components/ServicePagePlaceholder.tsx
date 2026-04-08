import Link from "next/link";
import type { Service } from "@/app/lib/services";

// Shared placeholder until each service flow is built out individually.
export default function ServicePagePlaceholder({ service }: { service: Service }) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← All services
        </Link>

        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {service.title}
        </h1>
        <p className="mt-2 text-lg text-emerald-700 dark:text-emerald-400">
          {service.tagline}
        </p>
        <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          {service.description}
        </p>

        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          The intake form for this service is coming soon.
        </div>
      </main>
    </div>
  );
}
