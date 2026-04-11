/**
 * Generic clinical document PDF.
 * Used by the Documents registry tab to render any document type
 * from its stored content string, without requiring type-specific data.
 */

import { Document, Page, View, Text } from "@react-pdf/renderer";
import {
  S, Letterhead, PatientBox, SignatureBlock, DocFooter,
  irishDate, irishDateShort,
} from "./shared";

export interface GenericDocumentData {
  ref:         string;
  typeLabel:   string;
  content:     string;
  patientName: string;
  dob:         string;
  gpName:      string;
  imcNumber:   string;
  issuedAt:    string;
  version?:    number;
}

export function GenericDocumentPDF({ d }: { d: GenericDocumentData }) {
  const dateStr = irishDate(d.issuedAt);
  const lines   = d.content.split(/\r?\n/);

  return (
    <Document title={d.typeLabel} author={d.gpName}>
      <Page size="A4" style={S.page}>
        <Letterhead gpName={d.gpName} imcNumber={d.imcNumber} />

        <View style={S.docTitleBlock}>
          <Text style={S.docTitle}>{d.typeLabel}</Text>
          {d.version && d.version > 1 ? (
            <Text style={S.docSubtitle}>
              Version {d.version} — Reissued document. Original version preserved in records.
            </Text>
          ) : (
            <Text style={S.docSubtitle}>
              This document was issued by a Partner GP via ExpressGP. Reference: {d.ref}
            </Text>
          )}
        </View>

        <PatientBox name={d.patientName} dob={irishDateShort(d.dob)} />

        <View style={S.divider} />

        <View style={{ marginBottom: 24 }}>
          {lines.map((line, i) => (
            <Text key={i} style={[S.bodyText, { marginBottom: line.trim() === "" ? 6 : 4 }]}>
              {line.trim() === "" ? " " : line}
            </Text>
          ))}
        </View>

        <SignatureBlock gpName={d.gpName} imcNumber={d.imcNumber} dateStr={dateStr} />

        <DocFooter refNo={d.ref} />
      </Page>
    </Document>
  );
}
