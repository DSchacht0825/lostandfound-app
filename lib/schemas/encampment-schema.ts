import { z } from 'zod'

export const encampmentFormSchema = z.object({
  location_description: z.string().optional().nullable(),
  estimated_population: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  reported_by: z.string().min(1, 'Your name is required'),

  // GPS coordinates (required, captured automatically or via map picker)
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export type EncampmentFormData = z.infer<typeof encampmentFormSchema>
