import Link from "next/link";

export default function MessagesPage() {
  return (
    <div className="flex flex-1 flex-col bg-[#F9FAFB]">
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-[#2F6FB6] hover:text-[#2FB36F]"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#0F2744]">
          Messages
        </h1>
        <p className="mt-3 text-base text-[#6B7280]">
          Your conversations with your GP will appear here.
        </p>
      </main>
    </div>
  );
}
