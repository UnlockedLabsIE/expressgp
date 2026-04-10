/**
 * Client-side PDF generation and download.
 *
 * Uses @react-pdf/renderer's pdf() function to render a React PDF
 * document to a Blob, then triggers a browser download.
 *
 * All functions are async and safe to call from any client component.
 */

import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";

import { SickNotePDF }       from "./SickNote";
import { PrescriptionPDF }   from "./Prescription";
import { ReferralLetterPDF } from "./ReferralLetter";
import { MedicalCertPDF }    from "./MedicalCert";

import type { SickNoteData }      from "./SickNote";
import type { PrescriptionData }  from "./Prescription";
import type { ReferralData }      from "./ReferralLetter";
import type { MedicalCertData }   from "./MedicalCert";

// ─── Download helper ──────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilename(name: string, ref: string) {
  return `${name.replace(/\s+/g, "_")}_${ref}.pdf`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function downloadSickNote(d: SickNoteData) {
  const doc  = createElement(SickNotePDF, { d });
  const blob = await pdf(doc).toBlob();
  triggerDownload(blob, safeFilename(`SickNote_${d.patientName}`, d.consultationId.slice(0, 8)));
}

export async function downloadPrescription(d: PrescriptionData) {
  const doc  = createElement(PrescriptionPDF, { d });
  const blob = await pdf(doc).toBlob();
  triggerDownload(blob, safeFilename(`Prescription_${d.patientName}`, d.consultationId.slice(0, 8)));
}

export async function downloadReferral(d: ReferralData) {
  const doc  = createElement(ReferralLetterPDF, { d });
  const blob = await pdf(doc).toBlob();
  triggerDownload(blob, safeFilename(`Referral_${d.patientName}`, d.consultationId.slice(0, 8)));
}

export async function downloadMedicalCert(d: MedicalCertData) {
  const doc  = createElement(MedicalCertPDF, { d });
  const blob = await pdf(doc).toBlob();
  triggerDownload(blob, safeFilename(`MedCert_${d.patientName}`, d.consultationId.slice(0, 8)));
}
