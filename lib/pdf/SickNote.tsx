/**
 * Medical Certificate of Unfitness for Work (Sick Note)
 *
 * Irish standard: does NOT state the reason or diagnosis.
 * Certifies only that the patient was medically unfit for work
 * for a specified period. Suitable for submission to an employer
 * or the Department of Social Protection.
 */

import { Document, Page, View, Text } from "@react-pdf/renderer";
import {
  S, Letterhead, PatientBox, SignatureBlock, DocFooter,
  irishDate, irishDateShort,
} from "./shared";

export interface SickNoteData {
  // Patient
  patientName: string;
  dob: string;
  address?: string;
  // Certificate dates
  fromDate: string;
  toDate:   string;
  // GP
  gpName:    string;
  imcNumber: string;
  // Meta
  consultationId: string;
  issuedAt: string;
}

export function SickNotePDF({ d }: { d: SickNoteData }) {
  const today = irishDate(d.issuedAt);
  const from  = irishDate(d.fromDate);
  const to    = irishDate(d.toDate);
  const ref   = `SN-${d.consultationId.slice(0, 8).toUpperCase()}`;

  return (
    <Document title="Medical Certificate of Unfitness for Work" author={d.gpName}>
      <Page size="A4" style={S.page}>
        <Letterhead gpName={d.gpName} imcNumber={d.imcNumber} />

        {/* Document title */}
        <View style={S.docTitleBlock}>
          <Text style={S.docTitle}>Medical Certificate of Unfitness for Work</Text>
          <Text style={S.docSubtitle}>
            This certificate is issued for Social Welfare / employer purposes only.
            It does not contain clinical information.
          </Text>
        </View>

        {/* Patient */}
        <PatientBox
          name={d.patientName}
          dob={irishDateShort(d.dob)}
          address={d.address}
        />

        {/* Certification statement */}
        <View style={S.certBox}>
          <Text style={S.certText}>
            I, the undersigned, hereby certify that I have examined the above-named
            patient and am of the opinion that they were medically unfit for work
            for the following period:
          </Text>
        </View>

        {/* Period box */}
        <View style={{ flexDirection: "row", gap: 32, marginBottom: 20 }}>
          <View style={S.field}>
            <Text style={S.fieldLabel}>Unfit from</Text>
            <Text style={[S.fieldValue, S.bold, { fontSize: 12 }]}>{from}</Text>
          </View>
          <View style={S.field}>
            <Text style={S.fieldLabel}>Unfit to (inclusive)</Text>
            <Text style={[S.fieldValue, S.bold, { fontSize: 12 }]}>{to}</Text>
          </View>
        </View>

        <View style={S.divider} />

        <Text style={S.bodyText}>
          This certificate does not disclose the nature of the illness. Clinical
          details remain confidential between the patient and their treating
          physician in accordance with medical ethics and data protection law.
        </Text>

        <Text style={S.bodyText}>
          If further certification is required, the patient should arrange a
          follow-up consultation.
        </Text>

        <SignatureBlock gpName={d.gpName} imcNumber={d.imcNumber} dateStr={today} />

        <DocFooter refNo={ref} />
      </Page>
    </Document>
  );
}
