import { unstable_noStore as noStore } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getPartnerDoctor } from "@/lib/queries";
import DocumentsClient, { type DocumentRow } from "./DocumentsClient";

export const metadata = { title: "Documents — ExpressGP" };

export default async function DocumentsPage() {
  noStore();

  const supabase = await createServerSupabaseClient();

  const [doctor, { data: rawDocs, error }] = await Promise.all([
    getPartnerDoctor(),
    supabase
      .from("documents")
      .select(`
        *,
        consultation:consultations (
          id, service_type, service_subtype, status,
          patient:patients ( id, first_name, last_name, dob ),
          doctor:partner_doctors ( first_name, last_name, imc_number )
        )
      `)
      .order("created_at", { ascending: false }),
  ]);

  if (error) {
    console.error("[DocumentsPage]", error.message);
  }

  return (
    <DocumentsClient
      documents={(rawDocs ?? []) as DocumentRow[]}
      doctor={doctor}
    />
  );
}
