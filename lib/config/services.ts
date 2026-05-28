import type { ServicePricing } from "@/types";

// Master service + subtype config for ExpressGP.
//
// Pricing is defined in code (see `PRICING` below) and baked into
// `SERVICE_CONFIG` at module load. This is intentional:
//
//   - The `platform_config` table in Supabase is service-role-only
//     (RLS enabled, zero policies) because it also holds commercially
//     sensitive config such as `gp_revenue_share`. Reading it with the
//     anon key from a client or Edge context would either silently
//     return nothing (today, with RLS closed) or leak sensitive rows
//     (tomorrow, if anyone loosens the policy to "make prices work").
//
//   - If DB-driven pricing is needed in future, implement it via a
//     server client with the user's session — never the anon key —
//     and add a narrow RLS policy scoped to `key = 'service_pricing'`
//     only, or expose a separate, intentionally public table.
//
// `value` strings are written into consultations.service_subtype on the database
// side, so they are stable identifiers — never rename without a migration.

export type ServiceSubtype = {
  value: string;
  label: string;
  price: number; // EUR
  active: boolean;
};

export type PatientFacing = {
  slug: string;
  title: string;
  tagline: string;
  priceFrom: number;
};

export type ServiceConfig = {
  serviceType: string;
  label: string;
  description: string;
  subtypes: ServiceSubtype[];
  patient?: PatientFacing;
};

export type PatientServiceConfig = ServiceConfig & { patient: PatientFacing };

// ── Pricing — source of truth ────────────────────────────────────────────────
// In-code pricing. Admin UI writes to `platform_config.service_pricing` for
// audit/reporting, but the app itself renders from this constant. See the
// file header for why this is not loaded from the DB on the client.
const PRICING: ServicePricing = {
  prescription: 20,
  sick_note: 25,
  medical_cert: 25,
  referral: 30,
  gp_consultation: 40,
  glp1: 60,
  insurance_report: 50,
  corporate: 30,
  glp1_subtypes: {
    initial_assessment: 60,
    initial_blood_test_referral: 30,
    monthly_review: 40,
    dose_adjustment: 40,
    other_glp1: 40,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const flat = (
  rows: ReadonlyArray<readonly [value: string, label: string]>,
  price: number,
  overrides: Record<string, Partial<ServiceSubtype>> = {},
): ServiceSubtype[] =>
  rows.map(([value, label]) => ({
    value,
    label,
    price,
    active: true,
    ...overrides[value],
  }));

// ── Catalogue builder ────────────────────────────────────────────────────────

export function buildServiceConfig(): ServiceConfig[] {
  const p = PRICING;
  const g = PRICING.glp1_subtypes!;

  return [
    {
      serviceType: "prescription",
      label: "Prescription",
      description: "Repeat or new prescriptions reviewed by an Irish GP and sent to your pharmacy.",
      patient: { slug: "prescription", title: "Request a Prescription", tagline: "Repeat or new prescriptions", priceFrom: p.prescription ?? 20 },
      subtypes: flat([
        ["uti", "UTI Treatment"],
        ["hayfever", "Hay Fever"],
        ["thrush", "Thrush"],
        ["cold_sores", "Cold Sores"],
        ["conjunctivitis", "Conjunctivitis"],
        ["contraception", "Contraception"],
        ["erectile_dysfunction", "Erectile Dysfunction"],
        ["hair_loss", "Hair Loss"],
        ["acne", "Acne"],
        ["skincare_tretinoin", "Skincare (Tretinoin)"],
        ["blood_pressure", "Blood Pressure"],
        ["cholesterol", "Cholesterol"],
        ["anxiety_ssri", "Anxiety (SSRI)"],
        ["depression_ssri", "Depression (SSRI)"],
        ["travel_medication", "Travel Medication"],
        ["sleep", "Sleep"],
        ["acid_reflux", "Acid Reflux"],
        ["asthma_repeat", "Asthma (Repeat)"],
        ["glp1_weight_management", "GLP-1 Weight Management"],
        ["hrt_menopause", "HRT / Menopause"],
        ["adhd", "ADHD"],
        ["period_delay", "Period Delay"],
        ["stop_smoking", "Stop Smoking"],
        ["dermatology", "Dermatology"],
        ["sexual_health_sti", "Sexual Health / STI"],
        ["home_test_kit", "Home Test Kit"],
        ["other_prescription", "Other Prescription"],
      ], p.prescription ?? 20),
    },
    {
      serviceType: "sick_note",
      label: "Sick Note & Certificates",
      description: "Certified sick notes and medical certificates accepted by Irish employers, schools and travel providers.",
      patient: { slug: "sick-note", title: "Get a Sick Note", tagline: "Accepted by Irish employers", priceFrom: p.sick_note ?? 25 },
      subtypes: flat([
        ["employer_sick_note", "Employer Sick Note"],
        ["fit_to_return_to_work", "Fit to Return to Work"],
        ["fit_to_fly", "Fit to Fly"],
        ["fit_to_travel", "Fit to Travel"],
        ["college_medical_cert", "College Medical Cert"],
        ["sports_medical_cert", "Sports Medical Cert"],
        ["pre_employment_cert", "Pre-Employment Cert"],
        ["visa_immigration_cert", "Visa / Immigration Cert"],
        ["jury_duty_cert", "Jury Duty Cert"],
        ["gym_medical_cert", "Gym Medical Cert"],
        ["dsp_social_welfare_cert", "DSP Social Welfare Cert"],
        ["other_cert", "Other Certificate"],
      ], p.sick_note ?? 25, { dsp_social_welfare_cert: { active: false } }),
    },
    {
      serviceType: "medical_cert",
      label: "Medical Certificate",
      description: "Medical certificates issued by IMC-registered Irish doctors for work, travel and other needs.",
      patient: { slug: "medical-cert", title: "Get a Medical Cert", tagline: "Fit-to-work, fit-to-fly and more", priceFrom: p.medical_cert ?? 25 },
      subtypes: flat([
        ["fit_to_work", "Fit to Work Certificate"],
        ["fit_to_fly", "Fit to Fly Certificate"],
        ["fit_to_travel", "Fit to Travel Certificate"],
        ["pre_employment", "Pre-Employment Medical Certificate"],
        ["visa_immigration", "Visa / Immigration Certificate"],
        ["college_cert", "College Medical Certificate"],
        ["sports_cert", "Sports Medical Certificate"],
        ["other_cert", "Other Medical Certificate"],
      ], p.medical_cert ?? 25),
    },
    {
      serviceType: "referral",
      label: "Referral Letter",
      description: "Specialist, consultant and diagnostic referrals written by your GP.",
      patient: { slug: "referral", title: "Request a Referral", tagline: "Specialist, scan or consultant letters", priceFrom: p.referral ?? 30 },
      subtypes: flat([
        ["ed_referral", "ED Referral"],
        ["private_consultant", "Private Consultant"],
        ["dermatology", "Dermatology"],
        ["cardiology", "Cardiology"],
        ["gastroenterology", "Gastroenterology"],
        ["orthopaedics", "Orthopaedics"],
        ["neurology", "Neurology"],
        ["psychiatry", "Psychiatry"],
        ["gynaecology", "Gynaecology"],
        ["urology", "Urology"],
        ["ophthalmology", "Ophthalmology"],
        ["ent", "ENT"],
        ["endocrinology", "Endocrinology"],
        ["rheumatology", "Rheumatology"],
        ["oncology_follow_up", "Oncology Follow-Up"],
        ["addiction_services", "Addiction Services"],
        ["dietitian", "Dietitian"],
        ["physiotherapy", "Physiotherapy"],
        ["psychology_counselling", "Psychology / Counselling"],
        ["blood_test", "Blood Test"],
        ["imaging_xray", "Imaging (X-Ray)"],
        ["imaging_mri", "Imaging (MRI)"],
        ["imaging_ultrasound", "Imaging (Ultrasound)"],
        ["dexa_scan_referral", "DEXA Scan Referral"],
        ["private_hospital", "Private Hospital"],
        ["other_referral", "Other Referral"],
      ], p.referral ?? 30),
    },
    {
      serviceType: "gp_consultation",
      label: "GP Consultation",
      description: "Full online consultation with an IMC-registered Irish GP for general health concerns.",
      patient: { slug: "gp-consultation", title: "GP Consultation", tagline: "Talk to an Irish-registered GP", priceFrom: p.gp_consultation ?? 40 },
      subtypes: flat([
        ["general_consultation", "General Consultation"],
        ["travel_health", "Travel Health"],
        ["sexual_health", "Sexual Health"],
        ["mental_health", "Mental Health"],
        ["menopause_consultation", "Menopause Consultation"],
        ["chronic_disease_review", "Chronic Disease Review"],
        ["medication_review", "Medication Review"],
        ["second_opinion", "Second Opinion"],
        ["pre_surgery", "Pre-Surgery"],
        ["post_surgery", "Post-Surgery"],
        ["adhd_assessment", "ADHD Assessment"],
        ["other_consultation", "Other Consultation"],
      ], p.gp_consultation ?? 40),
    },
    {
      serviceType: "glp1",
      label: "GLP-1 Programme",
      description: "Medically supervised weight management with GLP-1 medications.",
      patient: { slug: "glp1", title: "GLP-1 (Weight Loss)", tagline: "Clinically supervised weight management", priceFrom: g.initial_assessment ?? 60 },
      subtypes: [
        { value: "initial_assessment",          label: "Initial Assessment",          price: g.initial_assessment ?? 60,          active: true },
        { value: "initial_blood_test_referral",  label: "Initial Blood Test Referral", price: g.initial_blood_test_referral ?? 30,  active: true },
        { value: "monthly_review",               label: "Monthly Review",              price: g.monthly_review ?? 40,               active: true },
        { value: "dose_adjustment",              label: "Dose Adjustment",             price: g.dose_adjustment ?? 40,              active: true },
        { value: "other_glp1",                   label: "Other GLP-1",                 price: g.other_glp1 ?? 40,                   active: true },
      ],
    },
    {
      serviceType: "insurance_report",
      label: "Insurance Report",
      description: "Medical reports completed by a GP for insurance and protection products.",
      subtypes: flat([
        ["life_assurance", "Life Assurance"],
        ["mortgage_protection", "Mortgage Protection"],
        ["income_protection", "Income Protection"],
        ["private_health_insurance", "Private Health Insurance"],
        ["travel_insurance_report", "Travel Insurance Report"],
        ["other_insurance", "Other Insurance"],
      ], p.insurance_report ?? 50),
    },
    {
      serviceType: "corporate",
      label: "Corporate",
      description: "GP services delivered to employees under a corporate ExpressGP account.",
      subtypes: flat([
        ["employee_sick_note", "Employee Sick Note"],
        ["employee_prescription", "Employee Prescription"],
        ["employee_consultation", "Employee Consultation"],
        ["employee_referral", "Employee Referral"],
        ["employee_wellness_report", "Employee Wellness Report"],
        ["other_corporate", "Other Corporate"],
      ], p.corporate ?? 30),
    },
  ];
}

// ── Static catalogue (no prices) — safe to use anywhere ──────────────────────
// Use this for routing, form labels, and subtype lookups that don't need prices.

export const SERVICE_CONFIG: ServiceConfig[] = buildServiceConfig();

export function getServiceConfig(type: string): ServiceConfig | undefined {
  return SERVICE_CONFIG.find((s) => s.serviceType === type);
}

export function getServiceBySlug(slug: string): PatientServiceConfig | undefined {
  return SERVICE_CONFIG.find(
    (s): s is PatientServiceConfig => s.patient?.slug === slug,
  );
}

export const PATIENT_SERVICES: PatientServiceConfig[] = SERVICE_CONFIG.filter(
  (s): s is PatientServiceConfig => s.patient !== undefined,
);
