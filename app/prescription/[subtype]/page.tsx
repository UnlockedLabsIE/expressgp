"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getServiceConfig } from "@/lib/config/services";

type Params = { subtype: string };

export default function PrescriptionIntakePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { subtype: subtypeValue } = use(params);
  const router = useRouter();

  // Look up the subtype config synchronously — it's pure data, no fetch.
  const config = getServiceConfig("prescription");
  const subtype = config?.subtypes.find((s) => s.value === subtypeValue);

  const [authChecked, setAuthChecked] = useState(false);

  // Form state
  const [symptoms, setSymptoms] = useState("");
  const [medications, setMedications] = useState("");
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");
  const [pharmacy, setPharmacy] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auth check + invalid subtype guard.
  useEffect(() => {
    if (!subtype) {
      router.push("/prescription");
      return;
    }
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
  }, [subtype, router]);

  async function handleSubmit() {
    setError(null);

    if (symptoms.trim().length < 20) {
      setError(
        "Please describe your symptoms or reason in at least 20 characters.",
      );
      return;
    }

    setSubmitting(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      router.push("/login");
      return;
    }

    // Combine the optional free-text fields into a single patient_notes
    // payload — the consultations table only has one notes column.
    const notesParts: string[] = [];
    if (medications.trim())
      notesParts.push(`Current medications:\n${medications.trim()}`);
    if (allergies.trim()) notesParts.push(`Allergies:\n${allergies.trim()}`);
    if (notes.trim()) notesParts.push(`Notes for GP:\n${notes.trim()}`);
    if (pharmacy.trim())
      notesParts.push(`Preferred pharmacy:\n${pharmacy.trim()}`);
    const patientNotes = notesParts.join("\n\n") || null;

    const { data, error: insertError } = await supabase
      .from("consultations")
      .insert({
        patient_id: userId,
        service_type: "prescription",
        service_subtype: subtypeValue,
        status: "pending",
        symptoms: symptoms.trim(),
        patient_notes: patientNotes,
        payment_status: "unpaid",
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not submit your request.");
      setSubmitting(false);
      return;
    }

    router.push(`/consultation/${data.id}/confirmed`);
  }

  if (!subtype || !authChecked) {
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
          href="/prescription"
          className="text-sm font-medium text-[#2F6FB6] hover:text-[#2FB36F]"
        >
          ← Back
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#0F2744] sm:text-4xl">
          {subtype.label}
        </h1>
        <p className="mt-2 text-base text-[#6B7280]">
          Tell your GP what you need — this takes about 2 minutes.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Form (left, 2/3) */}
          <div className="space-y-5 lg:col-span-2">
            <Textarea
              label="Describe your symptoms or reason for this prescription"
              required
              rows={4}
              value={symptoms}
              onChange={setSymptoms}
              help="At least 20 characters."
            />
            <Textarea
              label="Current medications"
              rows={3}
              value={medications}
              onChange={setMedications}
            />
            <Textarea
              label="Allergies"
              rows={3}
              value={allergies}
              onChange={setAllergies}
            />
            <Textarea
              label="Additional notes for your GP"
              rows={3}
              value={notes}
              onChange={setNotes}
            />
            <div>
              <label className="block text-sm font-medium text-[#0F2744]">
                Preferred pharmacy name and town
              </label>
              <input
                type="text"
                value={pharmacy}
                onChange={(e) => setPharmacy(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#0F2744] focus:border-[#28A863] focus:outline-none"
              />
            </div>
          </div>

          {/* Order summary (right, 1/3) */}
          <aside className="lg:col-span-1">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold text-[#0F2744]">
                Order summary
              </h2>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-[#6B7280]">Service</dt>
                  <dd className="font-medium text-[#0F2744]">Prescription</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-[#6B7280]">Type</dt>
                  <dd className="text-right font-medium text-[#0F2744]">
                    {subtype.label}
                  </dd>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <dt className="text-[#6B7280]">Price</dt>
                  <dd className="text-base font-bold text-[#0F2744]">
                    €{subtype.price}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs leading-5 text-[#6B7280]">
                Payment collected after GP review and approval.
              </p>

              {error && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                className="mt-5 w-full rounded-full bg-[#28A863] px-6 py-3 font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit to GP →"}
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Textarea(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  required?: boolean;
  help?: string;
}) {
  const { label, value, onChange, rows, required, help } = props;
  return (
    <div>
      <label className="block text-sm font-medium text-[#0F2744]">
        {label}
        {required && <span className="ml-0.5 text-[#28A863]">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#0F2744] focus:border-[#28A863] focus:outline-none"
      />
      {help && <p className="mt-1 text-xs text-[#9CA3AF]">{help}</p>}
    </div>
  );
}
