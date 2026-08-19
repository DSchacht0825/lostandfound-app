import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/utils/auth'
import UserManagement from '@/components/UserManagement'
import Link from 'next/link'

export default async function UsersPage() {
  // Check if user is admin - redirect if not
  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-charcoal-950 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/dashboard"
                className="text-gold-200 hover:text-white text-sm mb-2 inline-flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-white">User Management</h1>
              <p className="text-gold-200 text-sm">
                Manage user accounts and permissions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UserManagement />
      </div>
    </div>
  )
}
