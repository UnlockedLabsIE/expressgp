/**
 * Prescription (Rx)
 *
 * Standard Irish GP prescription format.
 * Sent to pharmacy via Healthmail (Edge Function — pending).
 * This PDF is a printable/archival copy.
 */

import { Document, Page, View, Text } from "@react-pdf/renderer";
import {
  S, Letterhead, PatientBox, SignatureBlock, DocFooter,
  irishDate, irishDateShort,
} from "./shared";

export interface PrescriptionData {
  // Patient
  patientName: string;
  dob: string;
  address?: string;
  // Medication
  drug:      string;
  dose:      string;
  frequency: string;
  duration:  string;
  pharmacy:  string;
  repeats?:  number;
  // GP
  gpName:    string;
  imcNumber: string;
  // Meta
  consultationId: string;
  issuedAt: string;
}

export function PrescriptionPDF({ d }: { d: PrescriptionData }) {
  const today = irishDate(d.issuedAt);
  const ref   = `RX-${d.consultationId.slice(0, 8).toUpperCase()}`;

  return (
    <Document title="Prescription" author={d.gpName}>
      <Page size="A4" style={S.page}>
        <Letterhead gpName={d.gpName} imcNumber={d.imcNumber} />

        {/* Title */}
        <View style={S.docTitleBlock}>
          <Text style={S.docTitle}>Prescription</Text>
          <Text style={S.docSubtitle}>
            This prescription is issued by a registered Irish GP and is valid at
            any participating Irish pharmacy.
          </Text>
        </View>

        {/* Patient */}
        <PatientBox
          name={d.patientName}
          dob={irishDateShort(d.dob)}
          address={d.address}
        />

        {/* Rx symbol + medication */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 28, color: "#1d4ed8", marginBottom: 8, fontFamily: "Helvetica-Bold" }}>
            Rx
          </Text>
          <View style={S.certBox}>
            <View style={{ marginBottom: 10 }}>
              <Text style={S.fieldLabel}>Medication</Text>
              <Text style={[S.certText, { fontSize: 14, fontFamily: "Helvetica-Bold" }]}>
                {d.drug}
              </Text>
              {d.dose ? (
                <Text style={[S.certText, { fontSize: 11, color: "#1e3a8a" }]}>
                  {d.dose}
                </Text>
              ) : null}
            </View>

            <View style={S.divider} />

            <View style={S.row}>
              <View style={S.field}>
                <Text style={S.fieldLabel}>Directions (Sig.)</Text>
                <Text style={S.certText}>{d.frequency}</Text>
              </View>
              <View style={S.field}>
                <Text style={S.fieldLabel}>Duration / Supply</Text>
                <Text style={S.certText}>{d.duration}</Text>
              </View>
              <View style={S.field}>
                <Text style={S.fieldLabel}>Repeats</Text>
                <Text style={S.certText}>{d.repeats != null ? String(d.repeats) : "None"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pharmacy */}
        {d.pharmacy && (
          <View style={{ marginBottom: 16 }}>
            <Text style={S.fieldLabel}>Dispensing Pharmacy</Text>
            <Text style={S.bodyText}>{d.pharmacy}</Text>
          </View>
        )}

        <View style={S.divider} />

        <Text style={[S.bodyText, { fontSize: 8.5, color: "#64748b" }]}>
          This prescription is valid for 6 months from the date of issue unless
          otherwise stated. It is an offence to alter or attempt to alter a
          prescription. Prescription medications should be used strictly as
          directed by your prescribing doctor.
        </Text>

        <SignatureBlock gpName={d.gpName} imcNumber={d.imcNumber} dateStr={today} />

        <DocFooter refNo={ref} />
      </Page>
    </Document>
  );
}
