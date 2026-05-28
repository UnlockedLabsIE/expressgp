export type UUID = string;
export type ISODate = string; // YYYY-MM-DD
export type ISOTimestamp = string; // ISO-8601 (timestamptz)

export type EmploymentType = "employed" | "contracted";
export type SubscriptionStatus = "active" | "cancelled" | "past_due";

export type TriageChannel = "web" | "phone";
export type TriageAgent = "cara" | "aidan";

export type ServiceType =
  | "prescription"
  | "sick_note"
  | "referral"
  | "medical_cert"
  | "gp_consultation"
  | "glp1"
  | "insurance_report"
  | "corporate";

export type ConsultationStatus =
  | "pending"
  | "under_review"
  | "more_info_required"
  | "approved"
  | "declined"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid" | "refunded";

/** `platform_config` JSON value for key `service_pricing` (amounts in cents). */
export type ServicePricing = {
  prescription: number;
  sick_note: number;
  medical_cert: number;
  referral: number;
  gp_consultation: number;
  glp1: number;
  insurance_report: number;
  corporate: number;
  glp1_subtypes?: Record<string, number>;
};

export type DocumentType =
  | "sick_note"
  | "referral_letter"
  | "medical_cert"
  | "insurance_report"
  | "fit_to_fly"
  | "fit_to_work"
  | "other";

export type MessageSenderType = "patient" | "partner_doctor" | "system";
export type CallDirection = "inbound" | "outbound";

export type NotificationChannel = "email" | "sms" | "push";
export type NotificationStatus = "sent" | "failed" | "pending";

export type AuditActorType = "patient" | "partner_doctor" | "system" | "admin";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type Patient = {
  id: UUID;
  first_name: string;
  last_name: string;
  email: string;
  dob: ISODate | null;
  phone: string | null;
  address: string | null;
  gender: string | null;
  marketing_consent: boolean;
  created_at: ISOTimestamp;
};

export type PartnerDoctor = {
  id: UUID;
  first_name: string;
  last_name: string;
  email: string;
  imc_number: string;
  employment_type: EmploymentType;
  /** Admin-controlled: valid active employee/contractor who may access the GP dashboard. Distinct from is_accepting_cases. */
  is_active: boolean;
  // Availability — add_availability_columns.sql
  /** GP-controlled: whether this clinician is currently accepting new consultations into the queue. Distinct from is_active. */
  is_accepting_cases: boolean;
  out_of_office_until: ISOTimestamp | null;
  // Prescription defaults — add_prescription_defaults.sql
  default_pharmacy_name: string | null;
  default_pharmacy_address: string | null;
  // Profile photo — add_profile_photo.sql
  profile_photo_url: string | null;
  // Display — gp_self_update_partner_doctors.sql (optional until migration applied)
  display_timezone?: string | null;
  created_at: ISOTimestamp;
};

export type DoctorNotificationPreferences = {
  id: UUID;
  doctor_id: UUID;
  email_new_consultation: boolean;
  email_new_message: boolean;
  email_red_flag: boolean;
  sms_new_consultation: boolean;
  sms_red_flag: boolean;
  daily_summary_email: boolean;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
};

/** Outbound GP notification attempt (clinical governance audit). Channel is email or sms in DB; WhatsApp sends are logged as sms. */
export type NotificationDeliveryLog = {
  id: UUID;
  doctor_id: UUID;
  notification_type: string;
  channel: "email" | "sms";
  triggered_at: ISOTimestamp;
  delivered_at: ISOTimestamp | null;
  status: "sent" | "failed" | "pending";
  consultation_id: UUID | null;
  error_message: string | null;
};

/** Immutable patient consent snapshot (GDPR / Medical Council). */
export type PatientConsent = {
  id: UUID;
  patient_id: UUID;
  consent_version: string;
  consented_at: ISOTimestamp;
  /** inet serialized as string from PostgREST */
  ip_address: string | null;
  consent_text: string;
};

export type Company = {
  id: UUID;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus | null;
  employee_limit: number | null;
  created_at: ISOTimestamp;
};

export type CompanyEmployee = {
  id: UUID;
  company_id: UUID;
  patient_id: UUID;
  created_at: ISOTimestamp;
};

export type TriageSession = {
  id: UUID;
  patient_id: UUID;
  channel: TriageChannel;
  agent: TriageAgent;
  transcript: string | null;
  structured_summary: Json | null;
  ai_recommendation: string | null;
  ai_confidence_score: number | null;
  red_flag_triggered: boolean;
  call_recording_url: string | null;
  call_sid: string | null;
  started_at: ISOTimestamp;
  completed_at: ISOTimestamp | null;
  created_at: ISOTimestamp;
};

export type Consultation = {
  id: UUID;
  patient_id: UUID;
  partner_doctor_id: UUID | null;
  triage_session_id: UUID | null;
  service_type: ServiceType;
  service_subtype: string | null;
  status: ConsultationStatus;
  symptoms: string | null;
  patient_notes: string | null;
  doctor_notes: string | null;
  decline_reason: string | null;
  video_call_requested: boolean;
  video_call_url: string | null;
  video_call_scheduled_at: ISOTimestamp | null;
  payment_status: PaymentStatus;
  stripe_payment_id: string | null;
  stripe_subscription_id: string | null;
  amount_charged: number | null; // stored as integer in DB (e.g. cents)
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
};

export type Prescription = {
  id: UUID;
  consultation_id: UUID;
  medication: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  pharmacy_name: string | null;
  pharmacy_address: string | null;
  healthmail_reference: string | null;
  issued_at: ISOTimestamp | null;
  created_at: ISOTimestamp;
};

export type Document = {
  id: UUID;
  consultation_id: UUID;
  type: DocumentType;
  content: string;
  issued_at: ISOTimestamp | null;
  created_at: ISOTimestamp;
};

export type Message = {
  id: UUID;
  consultation_id: UUID;
  sender_id: UUID | null;
  sender_type: MessageSenderType;
  body: string;
  is_read: boolean;
  created_at: ISOTimestamp;
};

export type PatientFile = {
  id: UUID;
  patient_id: UUID;
  consultation_id: UUID | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  uploaded_at: ISOTimestamp;
  created_at: ISOTimestamp;
};

export type CallLog = {
  id: UUID;
  patient_id: UUID;
  triage_session_id: UUID | null;
  direction: CallDirection;
  vapi_call_id: string | null;
  transcript: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  created_at: ISOTimestamp;
};

export type Notification = {
  id: UUID;
  patient_id: UUID | null;
  consultation_id: UUID | null;
  channel: NotificationChannel;
  type: string;
  message: string;
  sent_at: ISOTimestamp | null;
  status: NotificationStatus;
  created_at: ISOTimestamp;
};

export type Subscription = {
  id: UUID;
  patient_id: UUID;
  plan_name: string;
  stripe_subscription_id: string | null;
  status: string | null;
  current_period_start: ISOTimestamp | null;
  current_period_end: ISOTimestamp | null;
  created_at: ISOTimestamp;
};

export type AuditLog = {
  id: UUID;
  actor_id: UUID | null;
  actor_type: AuditActorType;
  action: string;
  table_name: string;
  record_id: UUID | null;
  old_value: Json | null;
  new_value: Json | null;
  ip_address: string | null;
  created_at: ISOTimestamp;
};

