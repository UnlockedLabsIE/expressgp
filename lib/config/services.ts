// Master service + subtype config for ExpressGP.
//
// This file is the single source of truth for which subtypes exist under
// each service_type, what to charge for them, and what to call them in the
// patient UI. Pure data — do NOT import the supabase client here.
//
// `value` strings are written into consultations.service_subtype on the
// database side, so they should be treated as stable identifiers and never
// renamed without a migration.

import type { ServiceType } from "@/types";

export type ServiceSubtype = {
  value: string;
  label: string;
  price: number; // EUR
  active: boolean;
};

// Patient-facing display data. Present only on services that appear in the
// public B2C menu — insurance_report and corporate intentionally have no
// `patient` block so they're filtered out of the homepage automatically.
export type PatientFacing = {
  slug: string; // URL segment, e.g. "sick-note"
  title: string; // homepage card + intake page H1
  tagline: string; // one-line summary, used on the intake page
  priceFrom: number; // displayed as "From €X" on the homepage
};

export type ServiceConfig = {
  serviceType: ServiceType;
  label: string;
  description: string;
  subtypes: ServiceSubtype[];
  patient?: PatientFacing;
};

// Convenience: a ServiceConfig that's been narrowed to "definitely B2C".
export type PatientServiceConfig = ServiceConfig & { patient: PatientFacing };

// ---- helpers ---------------------------------------------------------------

// Build subtype rows from a (value, label) tuple list at a fixed price.
// Lets each service block stay readable instead of repeating price/active
// on every row.
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

// ---- catalogue -------------------------------------------------------------

export const SERVICE_CONFIG: ServiceConfig[] = [
  {
    serviceType: "prescription",
    label: "Prescription",
    description:
      "Repeat or new prescriptions reviewed by an Irish GP and sent to your pharmacy.",
    patient: {
      slug: "prescription",
      title: "Request a Prescription",
      tagline: "Repeat or new prescriptions",
      priceFrom: 20,
    },
    subtypes: flat(
      [
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
      ],
      20,
    ),
  },

  {
    serviceType: "sick_note",
    label: "Sick Note & Certificates",
    description:
      "Certified sick notes and medical certificates accepted by Irish employers, schools and travel providers.",
    patient: {
      slug: "sick-note",
      title: "Get a Sick Note",
      tagline: "Accepted by Irish employers",
      priceFrom: 25,
    },
    subtypes: flat(
      [
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
      ],
      25,
      {
        dsp_social_welfare_cert: { active: false },
      },
    ),
  },

  {
    // TODO: medical_cert subtypes are not yet specified — the patient menu
    // and the /medical-cert route depend on this entry existing. Fill in
    // proper subtypes (likely a subset of fit_to_*, *_medical_cert types
    // from sick_note) when the spec is provided.
    serviceType: "medical_cert",
    label: "Medical Certificate",
    description:
      "Medical certificates issued by IMC-registered Irish doctors for work, travel and other needs.",
    patient: {
      slug: "medical-cert",
      title: "Get a Medical Cert",
      tagline: "Fit-to-work, fit-to-fly and more",
      priceFrom: 25,
    },
    subtypes: [],
  },

  {
    serviceType: "referral",
    label: "Referral Letter",
    description:
      "Specialist, consultant and diagnostic referrals written by your GP.",
    patient: {
      slug: "referral",
      title: "Request a Referral",
      tagline: "Specialist, scan or consultant letters",
      priceFrom: 30,
    },
    subtypes: flat(
      [
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
      ],
      30,
    ),
  },

  {
    serviceType: "gp_consultation",
    label: "GP Consultation",
    description:
      "Full online consultation with an IMC-registered Irish GP for general health concerns.",
    patient: {
      slug: "gp-consultation",
      title: "GP Consultation",
      tagline: "Talk to an Irish-registered GP",
      priceFrom: 40,
    },
    subtypes: flat(
      [
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
      ],
      40,
    ),
  },

  {
    serviceType: "glp1",
    label: "GLP-1 Programme",
    description:
      "Medically supervised weight management with GLP-1 medications.",
    patient: {
      slug: "glp1",
      title: "GLP-1 (Weight Loss)",
      tagline: "Clinically supervised weight management",
      priceFrom: 60,
    },
    subtypes: [
      {
        value: "initial_assessment",
        label: "Initial Assessment",
        price: 60,
        active: true,
      },
      {
        value: "initial_blood_test_referral",
        label: "Initial Blood Test Referral",
        price: 30,
        active: true,
      },
      {
        value: "monthly_review",
        label: "Monthly Review",
        price: 40,
        active: true,
      },
      {
        value: "dose_adjustment",
        label: "Dose Adjustment",
        price: 40,
        active: true,
      },
      {
        value: "other_glp1",
        label: "Other GLP-1",
        price: 40,
        active: true,
      },
    ],
  },

  {
    // Not shown in the patient-facing menu — gated at the UI layer.
    serviceType: "insurance_report",
    label: "Insurance Report",
    description:
      "Medical reports completed by a GP for insurance and protection products.",
    subtypes: flat(
      [
        ["life_assurance", "Life Assurance"],
        ["mortgage_protection", "Mortgage Protection"],
        ["income_protection", "Income Protection"],
        ["private_health_insurance", "Private Health Insurance"],
        ["travel_insurance_report", "Travel Insurance Report"],
        ["other_insurance", "Other Insurance"],
      ],
      50,
    ),
  },

  {
    // Not shown in the patient-facing menu — handled via the corporate flow.
    serviceType: "corporate",
    label: "Corporate",
    description:
      "GP services delivered to employees under a corporate ExpressGP account.",
    subtypes: flat(
      [
        ["employee_sick_note", "Employee Sick Note"],
        ["employee_prescription", "Employee Prescription"],
        ["employee_consultation", "Employee Consultation"],
        ["employee_referral", "Employee Referral"],
        ["employee_wellness_report", "Employee Wellness Report"],
        ["other_corporate", "Other Corporate"],
      ],
      30,
    ),
  },
];

// ---- lookups ---------------------------------------------------------------

export function getServiceConfig(
  type: ServiceType,
): ServiceConfig | undefined {
  return SERVICE_CONFIG.find((s) => s.serviceType === type);
}

// Lookup by patient-facing URL slug. Returns the narrowed `PatientServiceConfig`
// type so callers don't need to null-check `patient` afterwards.
export function getServiceBySlug(
  slug: string,
): PatientServiceConfig | undefined {
  return SERVICE_CONFIG.find(
    (s): s is PatientServiceConfig => s.patient?.slug === slug,
  );
}

// All services that should appear in the patient-facing menu, in catalogue
// order. insurance_report and corporate are excluded automatically because
// they have no `patient` block.
export const PATIENT_SERVICES: PatientServiceConfig[] = SERVICE_CONFIG.filter(
  (s): s is PatientServiceConfig => s.patient !== undefined,
);
