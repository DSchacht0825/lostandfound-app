import { z } from 'zod'

export const encounterFormSchema = z.object({
  // Service details
  service_date: z.string().min(1, 'Service date is required'),
  outreach_location: z.string().min(1, 'Location is required'),
  outreach_worker: z.string().min(1, 'Outreach worker name is required'),
  referral_source: z.string().optional().nullable(),

  // GPS coordinates (required, captured automatically)
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),

  // Language and cultural
  language_preference: z.string().optional().nullable(),
  cultural_notes: z.string().optional().nullable(),

  // Clinical/Treatment
  co_occurring_mh_sud: z.boolean(),
  co_occurring_type: z.string().optional().nullable(),
  mat_referral: z.boolean(),
  mat_type: z.string().optional().nullable(),
  mat_provider: z.string().optional().nullable(),
  detox_referral: z.boolean(),
  detox_provider: z.string().optional().nullable(),

  // Harm Reduction
  naloxone_distributed: z.boolean(),
  naloxone_date: z.string().optional().nullable(),
  fentanyl_test_strips_count: z.number().int().min(0).optional().nullable(),
  harm_reduction_education: z.boolean(),

  // Other Services
  transportation_provided: z.boolean(),
  shower_trailer: z.boolean(),
  other_services: z.string().optional().nullable(),

  // Placement
  placement_made: z.boolean(),
  placement_location: z.string().optional().nullable(),
  placement_location_other: z.string().optional().nullable(),
  refused_shelter: z.boolean(),

  // Case Management
  high_utilizer_contact: z.boolean(),
  case_management_notes: z.string().optional().nullable(),
})

export type EncounterFormData = z.infer<typeof encounterFormSchema>

// MAT (Medication-Assisted Treatment) types
export const MAT_TYPES = [
  'Methadone',
  'Buprenorphine (Suboxone)',
  'Naltrexone (Vivitrol)',
  'Other',
] as const

// Co-occurring condition types
export const CO_OCCURRING_TYPES = [
  'Substance Use + Depression',
  'Substance Use + Anxiety',
  'Substance Use + Bipolar',
  'Substance Use + PTSD',
  'Substance Use + Schizophrenia',
  'Multiple Conditions',
  'Other',
] as const

// Placement locations
export const PLACEMENT_LOCATIONS = [
  'BCNC',
  'Detox',
  'East County Transitional Living',
  'La Posada',
  'Vista',
  'Victory Outreach',
  'Set Free Ministries',
  'Teen Challenge',
  'Restoration Ranch',
  'Mission Academy',
  'South County Lighthouse',
  'Shelter Not Available',
  'Other',
] as const
