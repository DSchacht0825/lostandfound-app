import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/utils/auth'
import EncounterHeatMap from '@/components/EncounterHeatMap'
import ExportButton from '@/components/ExportButton'
import CustomReportBuilder from '@/components/CustomReportBuilder'
import DuplicateManager from '@/components/DuplicateManager'
import LogoutButton from '@/components/LogoutButton'
import ProgramExitsSection from '@/components/ProgramExitsSection'
import MetricsGrid from '@/components/MetricsGrid'
import PlacementBreakdown from '@/components/PlacementBreakdown'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ start_date?: string; end_date?: string }>
}) {
  // Check if user is admin - redirect if not
  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) {
    redirect('/')
  }

  const supabase = await createClient()

  // Parse date range from query params (must await in Next.js 15+)
  const params = await searchParams
  const startDate = params.start_date || null
  const endDate = params.end_date || null

  // Fetch ALL encounters for CustomReportBuilder (unfiltered)
  const { data: allEncountersData, error: allEncountersError } = await supabase
    .from('encounters')
    .select('*')

  // Build filtered query for dashboard metrics
  // Use timestamp range that covers the full day in local timezone
  // Start date: beginning of day (00:00:00)
  // End date: end of day (23:59:59)
  let dashboardEncountersQuery = supabase.from('encounters').select('*')

  if (startDate && endDate) {
    // Both dates provided: filter between range
    const startTimestamp = `${startDate}T00:00:00`
    const endTimestamp = `${endDate}T23:59:59`
    dashboardEncountersQuery = dashboardEncountersQuery
      .gte('service_date', startTimestamp)
      .lte('service_date', endTimestamp)
  } else if (startDate) {
    // Only start date: filter from start date onwards
    const startTimestamp = `${startDate}T00:00:00`
    dashboardEncountersQuery = dashboardEncountersQuery
      .gte('service_date', startTimestamp)
  } else if (endDate) {
    // Only end date: filter up to end date
    const endTimestamp = `${endDate}T23:59:59`
    dashboardEncountersQuery = dashboardEncountersQuery
      .lte('service_date', endTimestamp)
  }

  const { data: encounters, error: encountersError } = await dashboardEncountersQuery

  // Fetch all persons
  const { data: persons, error: personsError } = await supabase
    .from('persons')
    .select('*')

  // Fetch all status changes for reporting
  const { data: statusChanges, error: statusChangesError } = await supabase
    .from('status_changes')
    .select('*')

  // Fetch encampment reports for the map
  const { data: encampmentsData, error: encampmentsError } = await supabase
    .from('encampments')
    .select('*')
    .eq('status', 'active')

  if (encountersError || personsError || allEncountersError || statusChangesError || encampmentsError) {
    console.error('Dashboard data fetch error:', encountersError || personsError || allEncountersError || statusChangesError || encampmentsError)
  }

  // Type assertions for Supabase data (all fields from database)
  type EncounterData = {
    service_date: string
    person_id: string  // UUID foreign key
    outreach_location: string
    latitude: number
    longitude: number
    outreach_worker: string
    language_preference?: string | null
    co_occurring_mh_sud: boolean
    co_occurring_type?: string | null
    mat_referral: boolean
    mat_type?: string | null
    mat_provider?: string | null
    detox_referral: boolean
    detox_provider?: string | null
    naloxone_distributed: boolean
    naloxone_date?: string | null
    fentanyl_test_strips_count?: number | null
    harm_reduction_education: boolean
    transportation_provided: boolean
    shower_trailer: boolean
    other_services?: string | null
    placement_made?: boolean
    placement_location?: string | null
    placement_location_other?: string | null
    case_management_notes?: string | null
  }

  type PersonData = {
    id: string  // UUID from database
    client_id: string
    first_name: string
    last_name: string
    nickname?: string | null
    phone_number?: string | null
    date_of_birth: string
    gender: string
    race: string
    ethnicity: string
    living_situation: string
    length_of_time_homeless?: string | null
    veteran_status: boolean
    chronic_homeless: boolean
    enrollment_date: string
    case_manager?: string | null
    referral_source?: string | null
    income?: string | null
    income_amount?: number | null
    exit_date?: string | null
    exit_destination?: string | null
    exit_notes?: string | null
  }

  type StatusChangeData = {
    id: string
    person_id: string
    change_type: 'exit' | 'return_to_active'
    change_date: string
    exit_destination?: string | null
    notes?: string | null
    created_by?: string | null
    created_at: string
  }

  const allEncounters = (encounters || []) as EncounterData[]
  const allEncountersUnfiltered = (allEncountersData || []) as EncounterData[]
  const allPersons = (persons || []) as PersonData[]
  const allStatusChanges = (statusChanges || []) as StatusChangeData[]

  // Helper function to get local date string (YYYY-MM-DD) from timestamp
  // This properly handles timezone offsets by parsing the date and extracting local date
  const getLocalDateString = (dateStr: string): string => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Get persons who had encounters in the date range (for filtered demographics)
  const personIdsInRange = new Set(allEncounters.map(e => e.person_id))
  const personsInRange = (startDate || endDate)
    ? allPersons.filter(p => personIdsInRange.has(p.id))
    : allPersons

  // Calculate clients served in date range (unique person_ids from filtered encounters)
  const clientsServedInRange = personsInRange.length

  // Calculate metrics
  const metrics = {
    // 1. Number of unduplicated individuals served (filtered by date range)
    unduplicatedIndividuals: personsInRange.length,

    // 2. Exits from unsheltered homelessness (placements made)
    exitsFromHomelessness: allEncounters.filter(
      (e) => e.placement_made
    ).length,

    // 3. Placements made
    placementsMade: allEncounters.filter((e) => e.placement_made).length,

    // 4. Total Naloxone kits distributed
    naloxoneDistributed: allEncounters.filter((e) => e.naloxone_distributed).length,

    // 5. Total MAT/detox referrals
    matDetoxReferrals: allEncounters.filter(
      (e) => e.mat_referral || e.detox_referral
    ).length,

    // 6. Co-occurring SUD and mental health conditions
    coOccurringConditions: allEncounters.filter((e) => e.co_occurring_mh_sud).length,

    // 7. Shower trailer events (need to add this field - placeholder)
    showerTrailerEvents: 0, // TODO: Add shower_trailer field tracking

    // 8. Total service interactions
    totalInteractions: allEncounters.length,

    // 9. Fentanyl test strips distributed
    fentanylTestStrips: allEncounters.reduce(
      (sum, e) => sum + (e.fentanyl_test_strips_count || 0),
      0
    ),

    // 10. Transportation provided count
    transportationProvided: allEncounters.filter((e) => e.transportation_provided)
      .length,
  }

  // Demographics breakdown - use personsInRange for date-filtered stats
  const demographics = {
    byGender: personsInRange.reduce((acc, p) => {
      acc[p.gender] = (acc[p.gender] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byRace: personsInRange.reduce((acc, p) => {
      acc[p.race] = (acc[p.race] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    veterans: personsInRange.filter((p) => p.veteran_status).length,
    chronicallyHomeless: personsInRange.filter((p) => p.chronic_homeless).length,
    withPhoneNumber: personsInRange.filter((p) => p.phone_number).length,
    withIncome: personsInRange.filter((p) => p.income_amount && p.income_amount > 0).length,
    averageIncome: personsInRange.filter((p) => p.income_amount && p.income_amount > 0).length > 0
      ? Math.round(personsInRange.reduce((sum, p) => sum + (p.income_amount || 0), 0) /
          personsInRange.filter((p) => p.income_amount && p.income_amount > 0).length)
      : 0,
    totalIncome: personsInRange.reduce((sum, p) => sum + (p.income_amount || 0), 0),
  }

  // Program exits breakdown - filter by date range if specified
  const exitedPersons = allPersons.filter((p) => {
    if (!p.exit_date) return false
    const exitDateStr = getLocalDateString(p.exit_date)
    if (startDate && endDate) {
      return exitDateStr >= startDate && exitDateStr <= endDate
    } else if (startDate) {
      return exitDateStr >= startDate
    } else if (endDate) {
      return exitDateStr <= endDate
    }
    return true // No date filter, show all exits
  })
  const exitMetrics = {
    totalExits: exitedPersons.length,
    byDestination: exitedPersons.reduce((acc, p) => {
      if (p.exit_destination) {
        acc[p.exit_destination] = (acc[p.exit_destination] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>),
  }

  // Inflows - newly enrolled clients in date range
  const inflows = allPersons.filter((p) => {
    const enrollmentDateStr = getLocalDateString(p.enrollment_date)
    if (startDate && endDate) {
      return enrollmentDateStr >= startDate && enrollmentDateStr <= endDate
    } else if (startDate) {
      return enrollmentDateStr >= startDate
    } else if (endDate) {
      return enrollmentDateStr <= endDate
    }
    return true
  })

  // Outflows - exits categorized by type (housed, sheltered, detox)
  const permanentHousingDests = [
    'Owned by client, no ongoing subsidy',
    'Owned by client, with ongoing subsidy (mortgage, VA, etc.)',
    'Rental by client, no ongoing subsidy',
    'Rental by client, with VASH subsidy',
    'Rental by client, with other ongoing housing subsidy (HCV, public housing, CoC-RRH, etc.)',
    'Permanent housing for formerly homeless persons (CoC, ESG, or other funding)',
    'Staying or living with family, permanent tenure',
    'Staying or living with friends, permanent tenure',
    'Permanent housing',
  ]
  const shelterDests = [
    'Emergency shelter (including hotel/motel paid for with voucher)',
    'Transitional housing for homeless persons (including youth)',
    'Staying or living with family, temporary tenure',
    'Staying or living with friends, temporary tenure',
    'Hotel or motel paid for without emergency shelter voucher',
    'Foster care home or foster care group home',
    'Residential project or halfway house with no homeless criteria (e.g., sober living)',
    'Safe Haven',
  ]
  const detoxDests = ['Substance abuse treatment facility or detox center']

  const outflows = {
    housed: exitedPersons.filter(p => p.exit_destination && permanentHousingDests.includes(p.exit_destination)),
    sheltered: exitedPersons.filter(p => p.exit_destination && shelterDests.includes(p.exit_destination)),
    detox: exitedPersons.filter(p => p.exit_destination && detoxDests.includes(p.exit_destination)),
  }

  // Service interaction types
  const serviceTypes = {
    caseManagement: allEncounters.filter((e) => e.case_management_notes).length,
    harmReduction: allEncounters.filter((e) => e.harm_reduction_education).length,
    matReferrals: allEncounters.filter((e) => e.mat_referral).length,
    detoxReferrals: allEncounters.filter((e) => e.detox_referral).length,
    naloxone: allEncounters.filter((e) => e.naloxone_distributed).length,
    transportation: allEncounters.filter((e) => e.transportation_provided).length,
    showerTrailer: allEncounters.filter((e) => e.shower_trailer).length,
  }

  // Referral breakdown by provider
  const referralBreakdown = {
    mat: allEncounters
      .filter(e => e.mat_referral && e.mat_provider)
      .reduce((acc, e) => {
        const provider = e.mat_provider || 'Unknown'
        acc[provider] = (acc[provider] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    detox: allEncounters
      .filter(e => e.detox_referral && e.detox_provider)
      .reduce((acc, e) => {
        const provider = e.detox_provider || 'Unknown'
        acc[provider] = (acc[provider] || 0) + 1
        return acc
      }, {} as Record<string, number>),
  }

  // Placement breakdown by location
  const placementBreakdown = allEncounters
    .filter(e => e.placement_made)
    .reduce((acc, e) => {
      const location = e.placement_location === 'Other'
        ? (e.placement_location_other || 'Other')
        : (e.placement_location || 'Unknown')
      acc[location] = (acc[location] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  // GPS coordinates for heat map
  const encounterLocations = allEncounters
    .filter((e) => e.latitude && e.longitude)
    .map((e) => ({
      latitude: e.latitude,
      longitude: e.longitude,
      date: e.service_date,
    }))

  // Encampment coordinates for heat map
  type EncampmentData = {
    latitude: number
    longitude: number
    location_description: string | null
    notes: string | null
    reported_by: string
    created_at: string
  }
  const encampmentLocations = ((encampmentsData || []) as EncampmentData[])
    .filter((e) => e.latitude && e.longitude)
    .map((e) => ({
      latitude: e.latitude,
      longitude: e.longitude,
      locationDescription: e.location_description,
      notes: e.notes,
      reportedBy: e.reported_by,
      createdAt: e.created_at,
    }))

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
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with navigation */}
        <div className="mb-8 flex justify-between items-center">
          <div>
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
              Admin Dashboard
            </h2>
            <p className="text-gray-600 mt-1">
              Program metrics and service analytics
            </p>
          </div>
          <div>
            <Link
              href="/dashboard/users"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium inline-flex items-center"
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Manage Users
            </Link>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Custom Date Range</h3>
          <form method="GET" action="/dashboard" className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                defaultValue={startDate || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                defaultValue={endDate || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-gold-600 text-charcoal-900 font-semibold rounded-md hover:bg-gold-500 transition-colors"
            >
              Apply Filter
            </button>
            {(startDate || endDate) && (
              <Link
                href="/dashboard"
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Clear
              </Link>
            )}
          </form>
          {(startDate || endDate) && (
            <p className="text-sm text-gray-600 mt-3">
              {startDate && endDate
                ? `Showing data from ${format(new Date(startDate), 'MMM dd, yyyy')} to ${format(new Date(endDate), 'MMM dd, yyyy')}`
                : startDate
                  ? `Showing data from ${format(new Date(startDate), 'MMM dd, yyyy')} onwards`
                  : `Showing data up to ${format(new Date(endDate!), 'MMM dd, yyyy')}`
              }
            </p>
          )}
        </div>

        {/* Custom Reports Summary - Highlighted Section */}
        <div className="bg-gradient-to-br from-gold-50 to-indigo-50 rounded-lg shadow-lg p-6 mb-6 border-2 border-gold-200">
          <div className="flex items-center mb-4">
            <svg
              className="w-6 h-6 text-gold-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-bold text-gray-900">
              Custom Reports Summary
              {(startDate || endDate) && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  {startDate && endDate
                    ? `(${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')})`
                    : startDate
                      ? `(From ${format(new Date(startDate), 'MMM dd, yyyy')})`
                      : `(Up to ${format(new Date(endDate!), 'MMM dd, yyyy')})`
                  }
                </span>
              )}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 font-medium">Clients Served</p>
              <p className="text-3xl font-bold text-gold-600 mt-1">{clientsServedInRange}</p>
              <p className="text-xs text-gray-500 mt-1">Unduplicated individuals</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 font-medium">Service Interactions</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{metrics.totalInteractions}</p>
              <p className="text-xs text-gray-500 mt-1">Total encounters</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 font-medium">Program Exits</p>
              <p className="text-3xl font-bold text-teal-600 mt-1">{exitMetrics.totalExits}</p>
              <p className="text-xs text-gray-500 mt-1">Clients exited from program</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 font-medium">Naloxone Distributed</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{metrics.naloxoneDistributed}</p>
              <p className="text-xs text-gray-500 mt-1">Kits given out</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 font-medium">Fentanyl Test Strips</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{metrics.fentanylTestStrips}</p>
              <p className="text-xs text-gray-500 mt-1">Total distributed</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 font-medium">Total Referrals</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{metrics.matDetoxReferrals}</p>
              <p className="text-xs text-gray-500 mt-1">MAT & Detox combined</p>
            </div>
          </div>
        </div>

        {/* Inflows & Outflows Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Inflows Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg p-6 border-2 border-green-200">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <h3 className="text-xl font-bold text-gray-900">Inflows</h3>
            </div>
            <p className="text-4xl font-bold text-green-600">{inflows.length}</p>
            <p className="text-sm text-gray-600 mt-2">Newly enrolled clients</p>
            {inflows.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto">
                <p className="text-xs font-medium text-gray-500 mb-2">Recent enrollments:</p>
                {inflows.slice(0, 10).map((p) => (
                  <div key={p.id} className="text-sm py-1 border-b border-green-100">
                    <span className="font-medium">{p.first_name} {p.last_name}</span>
                    <span className="text-gray-500 ml-2">
                      {format(new Date(p.enrollment_date), 'MM/dd/yyyy')}
                    </span>
                  </div>
                ))}
                {inflows.length > 10 && (
                  <p className="text-xs text-gray-500 mt-2">+{inflows.length - 10} more</p>
                )}
              </div>
            )}
          </div>

          {/* Outflows Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-lg p-6 border-2 border-amber-200">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 text-amber-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <h3 className="text-xl font-bold text-gray-900">Outflows</h3>
            </div>
            <p className="text-4xl font-bold text-amber-600">{outflows.housed.length + outflows.sheltered.length + outflows.detox.length}</p>
            <p className="text-sm text-gray-600 mt-2">Exits to housing, shelter, or detox</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="bg-white rounded p-2 text-center">
                <p className="text-2xl font-bold text-gold-600">{outflows.housed.length}</p>
                <p className="text-xs text-gray-600">Housed</p>
              </div>
              <div className="bg-white rounded p-2 text-center">
                <p className="text-2xl font-bold text-teal-600">{outflows.sheltered.length}</p>
                <p className="text-xs text-gray-600">Sheltered</p>
              </div>
              <div className="bg-white rounded p-2 text-center">
                <p className="text-2xl font-bold text-purple-600">{outflows.detox.length}</p>
                <p className="text-xs text-gray-600">Detox</p>
              </div>
            </div>
            {(outflows.housed.length + outflows.sheltered.length + outflows.detox.length) > 0 && (
              <div className="mt-4 max-h-32 overflow-y-auto">
                <p className="text-xs font-medium text-gray-500 mb-2">Recent outflows:</p>
                {[...outflows.housed, ...outflows.sheltered, ...outflows.detox]
                  .sort((a, b) => new Date(b.exit_date!).getTime() - new Date(a.exit_date!).getTime())
                  .slice(0, 5)
                  .map((p) => (
                    <div key={p.id} className="text-sm py-1 border-b border-amber-100">
                      <span className="font-medium">{p.first_name} {p.last_name}</span>
                      <span className="text-gray-500 ml-2 text-xs">
                        {p.exit_destination?.split('(')[0].trim()}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Referral Breakdown Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Referral Breakdown by Provider</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-purple-700 mb-3">MAT Referrals</h4>
              {Object.keys(referralBreakdown.mat).length > 0 ? (
                <dl className="space-y-2">
                  {Object.entries(referralBreakdown.mat)
                    .sort(([, a], [, b]) => b - a)
                    .map(([provider, count]) => (
                      <div key={provider} className="flex justify-between items-center bg-purple-50 px-3 py-2 rounded">
                        <dt className="text-gray-700">{provider}</dt>
                        <dd className="font-semibold text-purple-600">{count}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="text-gray-500 text-sm italic">No MAT referrals in this period</p>
              )}
            </div>

            <div>
              <h4 className="text-md font-medium text-red-700 mb-3">Detox Referrals</h4>
              {Object.keys(referralBreakdown.detox).length > 0 ? (
                <dl className="space-y-2">
                  {Object.entries(referralBreakdown.detox)
                    .sort(([, a], [, b]) => b - a)
                    .map(([provider, count]) => (
                      <div key={provider} className="flex justify-between items-center bg-red-50 px-3 py-2 rounded">
                        <dt className="text-gray-700">{provider}</dt>
                        <dd className="font-semibold text-red-600">{count}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="text-gray-500 text-sm italic">No detox referrals in this period</p>
              )}
            </div>
          </div>
        </div>

        {/* Placement Breakdown Section */}
        <PlacementBreakdown encounters={allEncounters} persons={allPersons} />

        {/* Custom Report Builder */}
        <div className="mb-6">
          <CustomReportBuilder persons={allPersons} encounters={allEncountersUnfiltered} statusChanges={allStatusChanges} />
        </div>

        {/* Duplicate Manager */}
        <div className="mb-6">
          <DuplicateManager persons={allPersons} />
        </div>

        {/* Key Metrics Grid - Clickable Cards */}
        <MetricsGrid
          metrics={metrics}
          persons={personsInRange}
          encounters={allEncounters}
          demographics={demographics}
        />

        {/* Demographics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Gender Distribution</h3>
            <dl className="space-y-2">
              {Object.entries(demographics.byGender).map(([gender, count]) => (
                <div key={gender} className="flex justify-between">
                  <dt className="text-gray-600">{gender}</dt>
                  <dd className="font-medium">{count}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Race/Ethnicity Distribution</h3>
            <dl className="space-y-2">
              {Object.entries(demographics.byRace).map(([race, count]) => (
                <div key={race} className="flex justify-between">
                  <dt className="text-gray-600">{race}</dt>
                  <dd className="font-medium">{count}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Special Populations</h3>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Veterans</dt>
                <dd className="font-medium">{demographics.veterans}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Chronically Homeless</dt>
                <dd className="font-medium">{demographics.chronicallyHomeless}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Program Exits Section */}
        <ProgramExitsSection
          totalExits={exitMetrics.totalExits}
          exitsByDestination={exitMetrics.byDestination}
        />

        {/* Contact & Economic Data */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Contact & Economic Data</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">
                {demographics.withPhoneNumber}
              </p>
              <p className="text-sm text-gray-600 mt-1">Clients with Phone</p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round((demographics.withPhoneNumber / allPersons.length) * 100)}% of total
              </p>
            </div>
            <div className="text-center p-4 bg-cyan-50 rounded-lg">
              <p className="text-2xl font-bold text-cyan-600">
                {demographics.withIncome}
              </p>
              <p className="text-sm text-gray-600 mt-1">Reporting Income</p>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round((demographics.withIncome / allPersons.length) * 100)}% of total
              </p>
            </div>
            <div className="text-center p-4 bg-gold-50 rounded-lg">
              <p className="text-2xl font-bold text-gold-600">
                ${demographics.averageIncome.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">Average Monthly Income</p>
              <p className="text-xs text-gray-500 mt-1">Among those reporting</p>
            </div>
            <div className="text-center p-4 bg-violet-50 rounded-lg">
              <p className="text-2xl font-bold text-violet-600">
                ${demographics.totalIncome.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 mt-1">Total Monthly Income</p>
              <p className="text-xs text-gray-500 mt-1">All clients combined</p>
            </div>
          </div>
        </div>

        {/* Service Types Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Service Interaction Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gold-50 rounded-lg">
              <p className="text-2xl font-bold text-gold-600">
                {serviceTypes.caseManagement}
              </p>
              <p className="text-sm text-gray-600 mt-1">Case Management</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {serviceTypes.harmReduction}
              </p>
              <p className="text-sm text-gray-600 mt-1">Harm Reduction</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {serviceTypes.matReferrals}
              </p>
              <p className="text-sm text-gray-600 mt-1">MAT Referrals</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {serviceTypes.detoxReferrals}
              </p>
              <p className="text-sm text-gray-600 mt-1">Detox Referrals</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {serviceTypes.naloxone}
              </p>
              <p className="text-sm text-gray-600 mt-1">Naloxone</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-600">
                {serviceTypes.transportation}
              </p>
              <p className="text-sm text-gray-600 mt-1">Transportation</p>
            </div>
            <div className="text-center p-4 bg-teal-50 rounded-lg">
              <p className="text-2xl font-bold text-teal-600">
                {serviceTypes.showerTrailer}
              </p>
              <p className="text-sm text-gray-600 mt-1">Shower Trailer</p>
            </div>
          </div>
        </div>

        {/* Heat Map */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Service Interaction Heat Map</h3>
          <EncounterHeatMap locations={encounterLocations} encampments={encampmentLocations} />
        </div>

        {/* Export Button */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Export Data</h3>
          <p className="text-gray-600 mb-4">
            Download all metrics and data for the selected date range. Exports three CSV files:
            summary metrics, client list, and service interactions.
          </p>
          <ExportButton
            persons={allPersons}
            encounters={allEncounters}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>
    </div>
  )
}
