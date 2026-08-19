import ClientSearch from '@/components/ClientSearch'
import Image from 'next/image'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { isAdmin } from '@/lib/utils/auth'

export default async function Home() {
  // Check if user is admin to show/hide dashboard link
  const userIsAdmin = await isAdmin()

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
            <div className="flex items-center gap-3">
              {userIsAdmin && (
                <Link
                  href="/dashboard"
                  className="px-6 py-3 bg-white text-gold-700 rounded-lg hover:bg-gold-50 transition-colors font-medium inline-flex items-center"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Admin Dashboard
                </Link>
              )}
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClientSearch />
      </div>
    </div>
  )
}
