/** Version token stored on each consent row; bump when legal text changes. */
export const PATIENT_CONSENT_VERSION = "v1.0";

/** Exact wording shown to the patient and stored immutably on acceptance. */
export const PATIENT_CONSENT_TEXT = [
  "I confirm that I have read and understood the ExpressGP service information, including how my personal data and health information will be processed for the purpose of this consultation.",
  "I consent to remote clinical assessment and to ExpressGP and its partner clinicians using my information to provide care, billing, and regulatory reporting as described in the Privacy Notice.",
  "I understand that online consultations are not suitable for emergencies and that I should call 999 or 112 if I need urgent or emergency care.",
].join("\n\n");
