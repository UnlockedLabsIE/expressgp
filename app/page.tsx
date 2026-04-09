import Link from "next/link";
import { PATIENT_SERVICES } from "@/lib/config/services";

const trustItems = [
  "IMC Registered GPs",
  "Same day response",
  "Fully confidential",
];

const steps = [
  {
    n: "1",
    title: "Tell us what you need",
    body: "Pick a service and answer a few short questions. Takes about 2 minutes.",
  },
  {
    n: "2",
    title: "Cara gathers your info",
    body: "Our AI health assistant asks the right questions so your GP has everything they need upfront.",
  },
  {
    n: "3",
    title: "Your GP responds same day",
    body: "A real IMC-registered Irish GP reviews your case and sends your prescription, note or referral.",
  },
];

const caraBullets = [
  "Available any time — day or night",
  "Asks the right questions so you don't have to repeat yourself",
  "Hands off to a real GP for review and sign-off",
];

function Check() {
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#2FB36F] text-white"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="4 11 8 15 16 6" />
      </svg>
    </span>
  );
}

function HeadingUnderline() {
  return (
    <span
      aria-hidden
      className="mt-4 block h-1 w-12 rounded-full bg-[#28A863]"
    />
  );
}

function HeroQuickPicker() {
  return (
    <div className="rounded-2xl border border-gray-100 border-t-4 border-t-[#28A863] bg-[#FAFFFE] p-6 shadow-2xl">
      <h2 className="text-lg font-semibold text-[#0F2744]">
        How are you feeling today?
      </h2>
      <p className="mt-1 text-sm text-[#6B7280]">
        Pick what you need and we&apos;ll take it from there.
      </p>

      <ul className="mt-5">
        {PATIENT_SERVICES.map((service, i) => (
          <li key={service.serviceType}>
            <Link
              href={`/${service.patient.slug}`}
              className={`flex items-center justify-between px-2 py-3 transition hover:bg-[#F9FAFB] ${
                i < PATIENT_SERVICES.length - 1
                  ? "border-b border-gray-100"
                  : ""
              }`}
            >
              <span className="text-sm font-medium text-[#0F2744]">
                {service.patient.title.replace(/^(Request a|Get a) /, "")}
              </span>
              <span className="text-sm font-medium text-[#28A863]">
                From €{service.patient.priceFrom}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <Link
          href="/gp-consultation"
          className="text-sm font-medium text-[#2F6FB6] transition hover:text-[#2FB36F]"
        >
          Not sure? Start with a GP Consultation →
        </Link>
      </div>
    </div>
  );
}

function CaraChatCard() {
  return (
    <div className="w-full rounded-2xl bg-[#0F2744] p-8 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#28A863] text-base font-semibold text-white">
            C
          </div>
          <div>
            <p className="text-base font-semibold text-white">Cara</p>
            <p className="text-xs text-white/50">AI Health Assistant</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80">
          <span className="h-2 w-2 rounded-full bg-[#2FB36F]" />
          Online
        </span>
      </div>

      {/* Messages */}
      <div className="space-y-3 py-5">
        <div className="flex">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#1a3a5c] px-4 py-2.5 text-sm text-white">
            Hi! What can I help you with today?
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#28A863] px-4 py-2.5 text-sm text-white">
            I need a sick note for work
          </div>
        </div>
        <div className="flex">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#1a3a5c] px-4 py-2.5 text-sm text-white">
            No problem. How many days have you been unwell, and do you have
            any symptoms I should know about?
          </div>
        </div>

        {/* Typing indicator */}
        <div className="flex">
          <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-[#1a3a5c] px-4 py-3">
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5">
        <span className="flex-1 text-sm text-white/40">
          Type your message...
        </span>
        <span
          aria-hidden
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#28A863] text-xs font-semibold text-white"
        >
          ↑
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #F0F4F8 0%, #EEF2F7 50%, #F5F8FF 100%)",
        }}
      >
        {/* Warm green wash, top-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 right-[-200px] h-[700px] w-[700px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(47,179,111,0.16) 0%, rgba(47,179,111,0) 60%)",
          }}
        />

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-6 pt-8 pb-20 sm:pt-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-[#0F2744] sm:text-6xl lg:text-7xl">
              Skip the waiting room.
              <br />
              <span className="text-[#28A863]">See a GP today.</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-8 text-[#6B7280]">
              Real Irish GPs. Online. From €20. Most requests reviewed the
              same day — no appointments, no commuting, no sitting in a
              waiting room for 3 hours.
            </p>

            <p className="mt-8 text-sm text-[#6B7280]">
              {trustItems.map((item, i) => (
                <span key={item}>
                  {item}
                  {i < trustItems.length - 1 && (
                    <span aria-hidden className="mx-2 text-[#9CA3AF]">
                      •
                    </span>
                  )}
                </span>
              ))}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-[#28A863] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-[#28A863]/20 transition hover:brightness-110"
              >
                Get started — from €20 →
              </Link>
              <Link
                href="#services"
                className="text-base font-medium text-[#2F6FB6] underline underline-offset-4 transition hover:text-[#2FB36F]"
              >
                See all services
              </Link>
            </div>

            <p className="mt-5 text-xs text-[#9CA3AF]">
              No account needed to browse. Pay only when you submit.
            </p>
          </div>

          <div className="lg:pl-2">
            <HeroQuickPicker />
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-white py-20">
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-8">
          <div className="mb-12">
            <h2 className="text-4xl font-bold tracking-tight text-[#0F2744] sm:text-5xl">
              What do you need today?
            </h2>
            <HeadingUnderline />
          </div>

          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PATIENT_SERVICES.map((service) => (
              <li key={service.serviceType}>
                <Link
                  href={`/${service.patient.slug}`}
                  className="group relative flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-7 pl-8 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2FB36F] hover:shadow-md"
                >
                  {/* Left accent bar */}
                  <span
                    aria-hidden
                    className="absolute left-5 top-7 h-8 w-[3px] rounded-full bg-[#28A863]"
                  />
                  <h3 className="text-lg font-semibold text-[#0F2744]">
                    {service.patient.title}
                  </h3>
                  <p className="mt-2 text-sm text-[#6B7280]">
                    {service.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-[#F0FDF4] px-3 py-1 text-xs font-medium text-[#28A863]">
                      From €{service.patient.priceFrom}
                    </span>
                    <span className="text-sm font-medium text-[#2F6FB6] opacity-0 transition group-hover:opacity-100">
                      Book now →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-[#F9FAFB]">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <div>
            <h2 className="text-4xl font-bold tracking-tight text-[#0F2744] sm:text-5xl">
              GP care in 3 steps
            </h2>
            <HeadingUnderline />
          </div>

          <ol className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {steps.map((step) => (
              <li key={step.n}>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#0F2744] text-sm font-bold text-white">
                    {step.n}
                  </span>
                  <h3 className="text-xl font-semibold text-[#0F2744]">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-3 text-base leading-7 text-[#6B7280]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* MEET CARA */}
      <section className="bg-white">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-6 py-24 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <CaraChatCard />
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#28A863]">
              Meet Cara
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#0F2744] sm:text-5xl">
              Your AI health assistant
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#6B7280]">
              Cara is built into every ExpressGP consultation. She gathers
              your information, understands your situation, and prepares
              everything your GP needs — so you get faster, better care.
            </p>

            <ul className="mt-8 space-y-3">
              {caraBullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 text-base text-[#0F2744]"
                >
                  <Check />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-1 text-base font-semibold text-[#28A863] transition hover:gap-2"
            >
              Start a consultation →
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#F0FDF4]">
        <div className="mx-auto w-full max-w-3xl px-6 py-24 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-[#0F2744] sm:text-5xl">
            Ready to feel better?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[#6B7280]">
            Join thousands of Irish people getting GP care online. Fast,
            affordable, and reviewed by a real doctor.
          </p>
          <div className="mt-10">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-[#28A863] px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-[#28A863]/20 transition hover:brightness-110"
            >
              Get started — from €20 →
            </Link>
          </div>
          <p className="mt-6 text-sm text-[#9CA3AF]">
            Secure &amp; confidential · IMC registered GPs · No subscription
            needed
          </p>
        </div>
      </section>
    </>
  );
}
