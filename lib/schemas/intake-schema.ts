import { z } from 'zod'

export const intakeFormSchema = z.object({
  // Personal Information
  photo_url: z.string().optional().nullable(),
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  nickname: z.string().max(100).optional().nullable(),
  phone_number: z.string().optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').or(z.literal('')).optional().nullable(),
  gender: z.string().min(1, 'Gender is required'),
  race: z.string().min(1, 'Race is required'),
  ethnicity: z.string().optional().nullable(),
  sexual_orientation: z.string().optional().nullable(),
  preferred_language: z.string().optional().nullable(),
  cultural_lived_experience: z.string().optional().nullable(),

  // Status Information
  veteran_status: z.boolean(),
  disability_status: z.boolean(),
  disability_types: z.array(z.string()).optional().transform(val => val ?? []),
  chronic_homeless: z.boolean(),
  domestic_violence_victim: z.boolean(),
  chronic_health: z.boolean(),
  mental_health: z.boolean(),
  addictions: z.array(z.string()).optional().transform(val => val ?? []),
  living_situation: z.string().min(1, 'Living situation is required'),
  length_of_time_homeless: z.string().optional().nullable(),
  evictions: z.number().int().min(0).optional().nullable(),
  income: z.string().optional().nullable(),
  income_amount: z.number().min(0).optional().nullable(),
  support_system: z.string().optional().nullable(),

  // Program Information
  enrollment_date: z.string().min(1, 'Enrollment date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  case_manager: z.string().optional().nullable(),
  referral_source: z.string().optional().nullable(),
  release_of_information: z.boolean(),
})

export type IntakeFormData = z.infer<typeof intakeFormSchema>

// HUD Standard Living Situations
export const LIVING_SITUATIONS = [
  'Place not meant for habitation',
  'Emergency shelter',
  'Transitional housing',
  'Safe Haven',
  'Hotel/motel paid by organization',
  'Staying with family/friends (temporary)',
  'Staying with family/friends (permanent)',
  'Vehicle',
  'Other',
] as const

// Standard options for dropdowns
export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Transgender',
  'Non-binary',
  'Prefer not to say',
  'Other',
] as const

export const RACE_OPTIONS = [
  'American Indian or Alaska Native',
  'Asian',
  'Black or African American',
  'Hispanic or Latino',
  'Native Hawaiian or Other Pacific Islander',
  'White',
  'Multiple Races',
  'Prefer not to say',
] as const

export const ETHNICITY_OPTIONS = [
  'Hispanic/Latino',
  'Not Hispanic/Latino',
  'Prefer not to say',
] as const

export const DISABILITY_TYPES = [
  'Physical',
  'Mental Health',
  'Substance Use',
  'Developmental',
  'Chronic Health Condition',
  'Multiple',
  'Other',
] as const

export const REFERRAL_SOURCES = [
  'CRC',
  'Encinitas Library',
  'HOPE',
  'PD (Police Department)',
  'Self',
  'SDRM (San Diego Rescue Mission)',
  'Healthcare Provider',
  'Other Organization',
  'Friend/Family',
  'Other',
] as const

export const TIME_HOMELESS_OPTIONS = [
  'Less than 1 month',
  '1-3 months',
  '3-6 months',
  '6-12 months',
  '1-2 years',
  '2-5 years',
  '5-10 years',
  'More than 10 years',
  'Unknown',
] as const

export const SEXUAL_ORIENTATION_OPTIONS = [
  'Heterosexual/Straight',
  'Gay',
  'Lesbian',
  'Bisexual',
  'Queer',
  'Questioning',
  'Prefer not to say',
  'Other',
] as const

export const ADDICTION_OPTIONS = [
  'Alcohol',
  'Cocaine',
  'Opioids',
  'Meth',
  'Fentanyl',
  'Inhalants',
  'Other',
] as const
