/**
 * GP Referral Letter
 *
 * Standard Irish GP-to-specialist referral format.
 * Addressed to the relevant department or named consultant.
 */

import { Document, Page, View, Text } from "@react-pdf/renderer";
import {
  S, Letterhead, PatientBox, SignatureBlock, DocFooter, PRACTICE,
  irishDate, irishDateShort,
} from "./shared";

export interface ReferralData {
  // Patient
  patientName: string;
  dob: string;
  address?: string;
  age?: number;
  gender?: string;
  // Referral details
  specialty:   string;
  urgency:     "routine" | "urgent" | "emergency";
  clinicalInfo: string;
  currentMedications?: string;
  allergies?: string;
  // GP
  gpName:    string;
  imcNumber: string;
  // Meta
  consultationId: string;
  issuedAt: string;
}

const URGENCY_LABEL: Record<string, string> = {
  routine:   "Routine",
  urgent:    "Urgent",
  emergency: "EMERGENCY",
};

export function ReferralLetterPDF({ d }: { d: ReferralData }) {
  const today    = irishDate(d.issuedAt);
  const ref      = `REF-${d.consultationId.slice(0, 8).toUpperCase()}`;
  const urgency  = URGENCY_LABEL[d.urgency] ?? "Routine";
  const ageGender = [d.age != null ? `${d.age}-year-old` : null, d.gender].filter(Boolean).join(" ");

  return (
    <Document title="GP Referral Letter" author={d.gpName}>
      <Page size="A4" style={S.page}>
        <Letterhead gpName={d.gpName} imcNumber={d.imcNumber} />

        {/* Title + urgency */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <View style={S.docTitleBlock}>
            <Text style={S.docTitle}>GP Referral Letter</Text>
            <Text style={S.docSubtitle}>
              {PRACTICE.name} · {today}
            </Text>
          </View>
          <View style={{
            backgroundColor: d.urgency === "emergency" ? "#fee2e2" : d.urgency === "urgent" ? "#fef3c7" : "#eff6ff",
            borderRadius: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
            <Text style={{
              fontSize: 9,
              fontFamily: "Helvetica-Bold",
              color: d.urgency === "emergency" ? "#dc2626" : d.urgency === "urgent" ? "#d97706" : "#1d4ed8",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}>
              {urgency}
            </Text>
          </View>
        </View>

        {/* Patient */}
        <PatientBox
          name={d.patientName}
          dob={irishDateShort(d.dob)}
          address={d.address}
        />

        {/* Salutation */}
        <Text style={[S.bodyText, { marginBottom: 14 }]}>
          Dear {d.specialty} Team,
        </Text>

        {/* Opening */}
        <Text style={S.bodyText}>
          I would be most grateful if you could see{" "}
          <Text style={S.bold}>{d.patientName}</Text>
          {ageGender ? `, a ${ageGender},` : ","} at your earliest
          {d.urgency === "routine" ? " convenient" : " possible"} opportunity.
        </Text>

        {/* Clinical information */}
        {d.clinicalInfo && (
          <View style={{ marginBottom: 14 }}>
            <Text style={[S.fieldLabel, { marginBottom: 4 }]}>Clinical Summary / Reason for Referral</Text>
            <View style={{
              backgroundColor: "#f8fafc",
              borderRadius: 4,
              padding: 10,
              borderLeftWidth: 2,
              borderLeftColor: "#94a3b8",
            }}>
              <Text style={S.bodyText}>{d.clinicalInfo}</Text>
            </View>
          </View>
        )}

        {/* Current medications */}
        {d.currentMedications && (
          <View style={{ marginBottom: 12 }}>
            <Text style={[S.fieldLabel, { marginBottom: 3 }]}>Current Medications</Text>
            <Text style={S.bodyText}>{d.currentMedications}</Text>
          </View>
        )}

        {/* Allergies */}
        {d.allergies && (
          <View style={{ marginBottom: 12 }}>
            <Text style={[S.fieldLabel, { marginBottom: 3 }]}>Known Allergies</Text>
            <Text style={S.bodyText}>{d.allergies}</Text>
          </View>
        )}

        {/* Closing */}
        <Text style={[S.bodyText, { marginTop: 8 }]}>
          I would be grateful for your assessment and management of this patient and would
          welcome any correspondence regarding the outcome of their consultation.
        </Text>

        <Text style={S.bodyText}>
          Thank you for your assistance in this matter.
        </Text>

        <Text style={[S.bodyText, { marginTop: 12 }]}>
          Yours sincerely,
        </Text>

        <SignatureBlock gpName={d.gpName} imcNumber={d.imcNumber} dateStr={today} />

        <DocFooter refNo={ref} />
      </Page>
    </Document>
  );
}
