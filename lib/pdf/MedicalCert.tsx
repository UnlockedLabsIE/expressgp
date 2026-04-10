/**
 * General Medical Certificate
 *
 * Covers multiple cert types:
 *   - Fit to fly
 *   - Fit to return to work
 *   - Fit for sport / exercise
 *   - Insurance / medicolegal report
 *   - General GP letter
 *
 * The body text is generated per cert type to read naturally,
 * as a GP would write it.
 */

import { Document, Page, View, Text } from "@react-pdf/renderer";
import {
  S, Letterhead, PatientBox, SignatureBlock, DocFooter,
  irishDate, irishDateShort,
} from "./shared";

export type CertType =
  | "fit_to_fly"
  | "fit_to_work"
  | "sick_note"
  | "medical_cert"
  | "insurance_report"
  | "other";

export interface MedicalCertData {
  // Patient
  patientName: string;
  dob: string;
  address?: string;
  age?: number;
  gender?: string;
  // Cert specifics
  certType:  CertType;
  fromDate?: string;
  toDate?:   string;
  notes?:    string;
  // GP
  gpName:    string;
  imcNumber: string;
  // Meta
  consultationId: string;
  issuedAt: string;
}

const CERT_TITLES: Record<CertType, string> = {
  fit_to_fly:       "Medical Certificate — Fitness to Travel by Air",
  fit_to_work:      "Medical Certificate — Fitness to Return to Work",
  sick_note:        "Medical Certificate of Unfitness for Work",
  medical_cert:     "Medical Certificate",
  insurance_report: "Medical Report for Insurance Purposes",
  other:            "Medical Certificate",
};

function certBody(d: MedicalCertData): string {
  const name = d.patientName;
  const dob  = irishDateShort(d.dob);
  const today = irishDate(d.issuedAt);

  switch (d.certType) {
    case "fit_to_fly":
      return (
        `I hereby certify that I have examined ${name} (DOB: ${dob}) on ${today} ` +
        `and, in my medical opinion, they are fit to travel by air at this time.\n\n` +
        `There are no known medical contraindications to air travel for this patient ` +
        `as of the date of this examination.`
      );

    case "fit_to_work":
      return (
        `I hereby certify that I have examined ${name} (DOB: ${dob}) on ${today} ` +
        `and am of the opinion that they are now medically fit to return to their normal ` +
        `duties in the workplace.\n\n` +
        `No restrictions are required at this time. Should any concerns arise on return, ` +
        `the patient should seek a further review.`
      );

    case "sick_note":
      return (
        `I hereby certify that I have examined ${name} (DOB: ${dob}) ` +
        `and am of the opinion that they were medically unfit for work ` +
        `for the period specified below.\n\n` +
        `This certificate does not disclose the nature of the illness. Clinical ` +
        `details remain confidential between the patient and their treating physician.`
      );

    case "insurance_report":
      return (
        `This medical report has been prepared at the request of the patient named ` +
        `above and is provided for insurance purposes.\n\n` +
        `I confirm that I have been the treating physician for this patient and that ` +
        `the information contained herein is accurate to the best of my knowledge and ` +
        `belief, based on my clinical records and examination.`
      );

    case "medical_cert":
    default:
      return (
        `I hereby certify that I have examined ${name} (DOB: ${dob}) on ${today} ` +
        `and provide this certificate as requested.\n\n` +
        `This certificate is issued in good faith based on clinical assessment ` +
        `at the time of consultation.`
      );
  }
}

export function MedicalCertPDF({ d }: { d: MedicalCertData }) {
  const today   = irishDate(d.issuedAt);
  const ref     = `MC-${d.consultationId.slice(0, 8).toUpperCase()}`;
  const title   = CERT_TITLES[d.certType] ?? CERT_TITLES.other;
  const body    = certBody(d);
  const showPeriod = (d.certType === "sick_note" || d.certType === "fit_to_work") && d.fromDate && d.toDate;

  return (
    <Document title={title} author={d.gpName}>
      <Page size="A4" style={S.page}>
        <Letterhead gpName={d.gpName} imcNumber={d.imcNumber} />

        {/* Title */}
        <View style={S.docTitleBlock}>
          <Text style={S.docTitle}>{title}</Text>
          <Text style={S.docSubtitle}>Date of issue: {today}</Text>
        </View>

        {/* Patient */}
        <PatientBox
          name={d.patientName}
          dob={irishDateShort(d.dob)}
          address={d.address}
        />

        {/* Certification body */}
        <View style={S.certBox}>
          <Text style={S.certText}>{body}</Text>
        </View>

        {/* Period (for sick note / fit to work) */}
        {showPeriod && (
          <View style={{ flexDirection: "row", gap: 32, marginBottom: 20 }}>
            <View style={S.field}>
              <Text style={S.fieldLabel}>From</Text>
              <Text style={[S.fieldValue, S.bold, { fontSize: 12 }]}>
                {irishDate(d.fromDate!)}
              </Text>
            </View>
            <View style={S.field}>
              <Text style={S.fieldLabel}>To (inclusive)</Text>
              <Text style={[S.fieldValue, S.bold, { fontSize: 12 }]}>
                {irishDate(d.toDate!)}
              </Text>
            </View>
          </View>
        )}

        {/* Additional notes */}
        {d.notes && (
          <View style={{ marginTop: 8, marginBottom: 12 }}>
            <Text style={[S.fieldLabel, { marginBottom: 4 }]}>Additional Notes</Text>
            <Text style={S.bodyText}>{d.notes}</Text>
          </View>
        )}

        <View style={S.divider} />

        <Text style={[S.bodyText, { fontSize: 8.5, color: "#64748b" }]}>
          This certificate was issued following an online GP consultation conducted
          through {" "}ExpressGP, a registered Irish telemedicine service. The issuing
          doctor is a registered medical practitioner with the Medical Council of
          Ireland.
        </Text>

        <SignatureBlock gpName={d.gpName} imcNumber={d.imcNumber} dateStr={today} />

        <DocFooter refNo={ref} />
      </Page>
    </Document>
  );
}
