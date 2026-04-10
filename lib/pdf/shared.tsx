import { StyleSheet, View, Text, Image } from "@react-pdf/renderer";

// ─── Practice config ──────────────────────────────────────────────────────────
// Update these when Healthmail / practice details are confirmed
export const PRACTICE = {
  name:    "ExpressGP",
  address: "Online GP Service · Ireland",
  phone:   "",
  email:   "support@expressgp.ie",
  website: "www.expressgp.ie",
};

// ─── Shared styles ────────────────────────────────────────────────────────────
export const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a2e",
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 54,
    backgroundColor: "#ffffff",
  },

  // Letterhead
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#1d4ed8",
  },
  practiceContact: {
    fontSize: 8,
    color: "#64748b",
    textAlign: "right",
    lineHeight: 1.5,
  },

  // Document title block
  docTitleBlock: {
    marginBottom: 20,
  },
  docTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a2e",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  docSubtitle: {
    fontSize: 8.5,
    color: "#64748b",
  },
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e1",
    marginVertical: 12,
  },

  // Patient details grid
  patientBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    padding: 12,
    marginBottom: 18,
    borderLeftWidth: 3,
    borderLeftColor: "#1d4ed8",
  },
  patientBoxLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 24,
    flexWrap: "wrap",
  },
  field: {
    marginBottom: 6,
    minWidth: 120,
  },
  fieldLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 10,
    color: "#1e293b",
  },

  // Body text
  bodyText: {
    fontSize: 10,
    color: "#1e293b",
    lineHeight: 1.7,
    marginBottom: 10,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },

  // Certification box
  certBox: {
    borderWidth: 1,
    borderColor: "#1d4ed8",
    borderRadius: 4,
    padding: 14,
    marginVertical: 16,
    backgroundColor: "#eff6ff",
  },
  certText: {
    fontSize: 10.5,
    color: "#1e3a8a",
    lineHeight: 1.8,
  },

  // Signature block
  signatureSection: {
    marginTop: 32,
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBlock: {
    minWidth: 200,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2e",
    marginBottom: 6,
    marginTop: 28,
    width: 180,
  },
  signatureLabel: {
    fontSize: 8.5,
    color: "#1e293b",
    lineHeight: 1.6,
  },
  signatureMeta: {
    fontSize: 8,
    color: "#64748b",
    lineHeight: 1.5,
    marginTop: 2,
  },
  dateBlock: {
    textAlign: "right",
  },
  dateLabel: {
    fontSize: 7,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 10,
    color: "#1e293b",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 32,
    left: 54,
    right: 54,
    textAlign: "center",
    fontSize: 7.5,
    color: "#94a3b8",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
});

// ─── Shared letterhead component ──────────────────────────────────────────────
// Logo URL — resolves from public/ at runtime in the browser
const LOGO_URL = "/logo.png";

export function Letterhead({ gpName, imcNumber }: { gpName: string; imcNumber: string }) {
  return (
    <View style={S.headerRow}>
      <Image src={LOGO_URL} style={{ width: 140, objectFit: "contain" }} />
      <View>
        <Text style={S.practiceContact}>{gpName}</Text>
        <Text style={S.practiceContact}>IMC No: {imcNumber}</Text>
        <Text style={S.practiceContact}>{PRACTICE.email}</Text>
        <Text style={S.practiceContact}>{PRACTICE.website}</Text>
      </View>
    </View>
  );
}

// ─── Patient details box ──────────────────────────────────────────────────────
export function PatientBox({ name, dob, address }: { name: string; dob: string; address?: string }) {
  return (
    <View style={S.patientBox}>
      <Text style={S.patientBoxLabel}>Patient Details</Text>
      <View style={S.row}>
        <View style={S.field}>
          <Text style={S.fieldLabel}>Full Name</Text>
          <Text style={[S.fieldValue, S.bold]}>{name}</Text>
        </View>
        <View style={S.field}>
          <Text style={S.fieldLabel}>Date of Birth</Text>
          <Text style={S.fieldValue}>{dob}</Text>
        </View>
        {address && (
          <View style={S.field}>
            <Text style={S.fieldLabel}>Address</Text>
            <Text style={S.fieldValue}>{address}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Signature block component ────────────────────────────────────────────────
export function SignatureBlock({ gpName, imcNumber, dateStr }: { gpName: string; imcNumber: string; dateStr: string }) {
  return (
    <View style={S.signatureSection}>
      <View style={S.signatureBlock}>
        <View style={S.signatureLine} />
        <Text style={S.signatureLabel}>{gpName}</Text>
        <Text style={S.signatureMeta}>IMC Registration No: {imcNumber}</Text>
        <Text style={S.signatureMeta}>{PRACTICE.name}</Text>
      </View>
      <View style={S.dateBlock}>
        <Text style={S.dateLabel}>Date Issued</Text>
        <Text style={S.dateValue}>{dateStr}</Text>
      </View>
    </View>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
export function DocFooter({ refNo }: { refNo: string }) {
  return (
    <Text style={S.footer} fixed>
      {PRACTICE.name} · {PRACTICE.website} · Document Reference: {refNo}
    </Text>
  );
}

// ─── Date formatting ──────────────────────────────────────────────────────────
export function irishDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "2-digit", month: "long", year: "numeric",
  });
}
export function irishDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}
