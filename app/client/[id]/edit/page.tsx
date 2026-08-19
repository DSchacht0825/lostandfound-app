import ClientEditForm from '@/components/ClientEditForm'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch person details
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const person = data as {
    id: string
    client_id: string
    first_name: string
    last_name: string
    nickname?: string | null
    phone_number?: string | null
    photo_url?: string | null
    date_of_birth: string
    gender: string
    race: string
    ethnicity: string
    sexual_orientation?: string | null
    preferred_language?: string | null
    cultural_lived_experience?: string | null
    veteran_status: boolean
    disability_status: boolean
    disability_type?: string | null
    chronic_homeless: boolean
    domestic_violence_victim?: boolean
    chronic_health?: boolean
    mental_health?: boolean
    addiction?: string | null
    living_situation: string
    length_of_time_homeless?: string | null
    evictions?: number | null
    income?: string | null
    income_amount?: number | null
    support_system?: string | null
    enrollment_date: string
    case_manager?: string | null
    referral_source?: string | null
    release_of_information?: boolean
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <div className="bg-charcoal-950 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image
                src="/logo-header.jpg"
                alt="Lost & Found Outreach"
                width={120}
                height={120}
                className="h-14 w-14 rounded"
              />
              <div className="border-l-2 border-gold-500 pl-4">
                <h1 className="text-2xl font-bold text-white">
                  Lost & Found Outreach
                </h1>
                <p className="text-gold-200 text-sm">
                  By-name list & service tracking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with back link */}
        <div className="mb-8">
          <Link
            href={`/client/${id}`}
            className="text-gold-700 hover:text-gold-800 font-medium mb-4 inline-flex items-center"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Profile
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mt-4">
            Edit Client Profile
          </h2>
          <p className="text-gray-600 mt-2">
            Editing {person.first_name} {person.last_name} (ID: {person.client_id})
          </p>
        </div>

        {/* Edit Form */}
        <ClientEditForm person={person} />
      </div>
    </div>
  )
}
