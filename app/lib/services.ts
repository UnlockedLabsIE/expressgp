// Patient-facing service catalogue.
// `serviceType` matches the `service_type` enum in schema.sql so the value
// can be written straight into consultations.service_type later.

import type { ServiceType } from "@/types";

export type Service = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  icon: string;
  priceFrom: number; // EUR, displayed as "From €X"
  serviceType: ServiceType;
};

export const services: Service[] = [
  {
    slug: "prescription",
    serviceType: "prescription",
    icon: "💊",
    title: "Request a Prescription",
    tagline: "Repeat or new prescriptions",
    description: "Repeat or new prescriptions, sent to your pharmacy",
    priceFrom: 20,
  },
  {
    slug: "sick-note",
    serviceType: "sick_note",
    icon: "📋",
    title: "Get a Sick Note",
    tagline: "Accepted by Irish employers",
    description: "Certified sick notes accepted by all Irish employers",
    priceFrom: 25,
  },
  {
    slug: "medical-cert",
    serviceType: "medical_cert",
    icon: "📄",
    title: "Medical Certificate",
    tagline: "Fit-to-work, fit-to-fly and more",
    description: "Fit-to-work, fit-to-fly, and more",
    priceFrom: 25,
  },
  {
    slug: "referral",
    serviceType: "referral",
    icon: "🔀",
    title: "Referral Letter",
    tagline: "Specialist referrals",
    description: "Specialist referrals written by your GP",
    priceFrom: 30,
  },
  {
    slug: "gp-consultation",
    serviceType: "gp_consultation",
    icon: "🩺",
    title: "GP Consultation",
    tagline: "Online consultation",
    description: "Full online consultation with an Irish GP",
    priceFrom: 40,
  },
  {
    slug: "glp1",
    serviceType: "glp1",
    icon: "⚖️",
    title: "GLP-1 Programme",
    tagline: "Supervised weight loss",
    description: "Medically supervised weight loss programme",
    priceFrom: 60,
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
