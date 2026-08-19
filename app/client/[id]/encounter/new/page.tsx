import ServiceInteractionForm from '@/components/ServiceInteractionForm'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

type PersonData = {
  id: string
  first_name: string
  last_name: string
  client_id: string
}

export default async function NewEncounterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch the person's details
  const { data, error } = await supabase
    .from('persons')
    .select('id, first_name, last_name, client_id')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const person = data as PersonData
  const fullName = `${person.first_name} ${person.last_name}`

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
            Back to {fullName}&apos;s Profile
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mt-4">
            New Service Interaction
          </h2>
          <p className="text-gray-600 mt-2">
            Record services provided to {fullName} (ID: {person.client_id})
          </p>
        </div>

        {/* Service Interaction Form */}
        <ServiceInteractionForm personId={person.id} personName={fullName} />
      </div>
    </div>
  )
}
