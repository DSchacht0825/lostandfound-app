import { z } from 'zod'

export const exitFormSchema = z.object({
  exit_date: z.string().min(1, 'Exit date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  exit_destination: z.string().min(1, 'Exit destination is required'),
  exit_notes: z.string().optional().nullable(),
})

export type ExitFormData = z.infer<typeof exitFormSchema>

// HUD Exit Destination Categories
export const EXIT_DESTINATIONS = {
  'Permanent Housing': [
    'Owned by client, no ongoing subsidy',
    'Owned by client, with ongoing subsidy (mortgage, VA, etc.)',
    'Rental by client, no ongoing subsidy',
    'Rental by client, with VASH subsidy',
    'Rental by client, with other ongoing housing subsidy (HCV, public housing, CoC-RRH, etc.)',
    'Permanent housing for formerly homeless persons (CoC, ESG, or other funding)',
    'Staying or living with family, permanent tenure',
    'Staying or living with friends, permanent tenure',
  ],
  'Temporary Housing': [
    'Transitional housing for homeless persons (including youth)',
    'Staying or living with family, temporary tenure',
    'Staying or living with friends, temporary tenure',
    'Hotel or motel paid for without emergency shelter voucher',
    'Foster care home or foster care group home',
    'Residential project or halfway house with no homeless criteria (e.g., sober living)',
  ],
  'Institutional Settings': [
    'Psychiatric hospital or other psychiatric facility',
    'Substance abuse treatment facility or detox center',
    'Hospital or other residential non-psychiatric medical facility',
    'Jail, prison, or juvenile detention facility',
    'Long-term care facility or nursing home',
  ],
  'Homeless Situations': [
    'Emergency shelter (including hotel/motel paid for with voucher)',
    'Place not meant for habitation (vehicle, park, street, abandoned building, etc.)',
    'Safe Haven',
  ],
  'Other': [
    'Deceased',
    'Moved from one HOPWA funded project to another HOPWA project',
    "Client doesn't know",
    'Client refused',
    'Data not collected',
    'No exit interview completed',
  ],
  'System': [
    'Auto-inactivated - No contact for 90 days',
  ],
} as const

// Flattened list of all destinations for validation
export const ALL_EXIT_DESTINATIONS = Object.values(EXIT_DESTINATIONS).flat()
