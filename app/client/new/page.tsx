import IntakeForm from '@/components/IntakeForm'
import Link from 'next/link'
import Image from 'next/image'

export default function NewClientPage() {
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
            href="/"
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
            Back to Client List
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mt-4">
            New Client Intake
          </h2>
          <p className="text-gray-600 mt-2">
            Complete the form below to add a new client to the by-name list
          </p>
        </div>

        {/* Intake Form */}
        <IntakeForm />
      </div>
    </div>
  )
}
