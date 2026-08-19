'use client'

import { useState } from 'react'
import { exportToCSV } from '@/lib/utils/export-csv'
import { EXIT_DESTINATIONS } from '@/lib/schemas/exit-schema'

interface Person {
  id: string  // UUID from database
  client_id: string
  first_name: string
  last_name: string
  nickname?: string | null
  date_of_birth: string
  gender: string
  race: string
  ethnicity: string
  sexual_orientation?: string | null
  living_situation: string
  length_of_time_homeless?: string | null
  veteran_status: boolean
  chronic_homeless: boolean
  enrollment_date: string
  case_manager?: string | null
  referral_source?: string | null
  disability_status?: boolean
  disability_type?: string | null
  exit_date?: string | null
  exit_destination?: string | null
  exit_notes?: string | null
}

interface Encounter {
  id?: string  // UUID from database
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
  refused_shelter?: boolean
  high_utilizer_contact?: boolean
  case_management_notes?: string | null
}

interface StatusChange {
  id: string
  person_id: string
  change_type: 'exit' | 'return_to_active'
  change_date: string
  exit_destination?: string | null
  notes?: string | null
  created_by?: string | null
  created_at: string
}

interface CustomReportBuilderProps {
  persons: Person[]
  encounters: Encounter[]
  statusChanges?: StatusChange[]
}

interface GeneratedReport {
  reportData: Record<string, unknown>[]
  metadata: {
    generated: string
    dateRange: string
    startDate: string
    endDate: string
  }
  metrics: {
    clientsServed: number
    totalInteractions: number
    naloxoneDistributed: number
    fentanylTestStrips: number
    totalReferrals: number
    matReferrals: number
    detoxReferrals: number
    housingPlacements: number
    placementsMade: number
    refusedShelter: number
    highUtilizerContacts: number
    programExits: number
    returnedToActive: number
  }
  breakdowns: {
    matByProvider: Record<string, number>
    detoxByProvider: Record<string, number>
    placementsByLocation: Record<string, number>
    exitsByCategory: Record<string, { total: number, destinations: Record<string, number> }>
    returnedToActiveDetails: Array<{
      person_id: string
      person_name: string
      client_id: string
      return_date: string
      notes: string | null
    }>
    highUtilizerDetails: Array<{
      person_id: string
      person_name: string
      client_id: string
      encounter_count: number
    }>
  }
  filteredPersons: Person[]
  activePersons: Person[]
  filteredEncounters: Encounter[]
}

export default function CustomReportBuilder({
  persons,
  encounters,
  statusChanges = [],
}: CustomReportBuilderProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailModalType, setDetailModalType] = useState<string>('')
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null)
  const [showEncounterModal, setShowEncounterModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Person | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)

  // Metric selections
  const [includeClientsServed, setIncludeClientsServed] = useState(true)
  const [includeServiceInteractions, setIncludeServiceInteractions] = useState(true)
  const [includeNaloxone, setIncludeNaloxone] = useState(true)
  const [includeFentanylStrips, setIncludeFentanylStrips] = useState(true)
  const [includeTotalReferrals, setIncludeTotalReferrals] = useState(true)
  const [includeReferralBreakdown, setIncludeReferralBreakdown] = useState(true)
  const [includeHousingPlacements, setIncludeHousingPlacements] = useState(true)
  const [includePlacements, setIncludePlacements] = useState(true)
  const [includeRefusedShelter, setIncludeRefusedShelter] = useState(true)
  const [includeHighUtilizerCount, setIncludeHighUtilizerCount] = useState(true)
  const [includeReturnedToActive, setIncludeReturnedToActive] = useState(true)
  const [includeInflows, setIncludeInflows] = useState(true)
  const [includeOutflows, setIncludeOutflows] = useState(true)
  const [includeByNameList, setIncludeByNameList] = useState(false)
  const [includeInteractionsDetail, setIncludeInteractionsDetail] = useState(false)

  // Demographic breakdown selections
  const [includeByRace, setIncludeByRace] = useState(false)
  const [includeByEthnicity, setIncludeByEthnicity] = useState(false)
  const [includeByGender, setIncludeByGender] = useState(false)
  const [includeBySexualOrientation, setIncludeBySexualOrientation] = useState(false)
  const [includeByAgeRange, setIncludeByAgeRange] = useState(false)
  const [includeByVeteranStatus, setIncludeByVeteranStatus] = useState(false)
  const [includeByDisabilityStatus, setIncludeByDisabilityStatus] = useState(false)
  const [includeByLivingSituation, setIncludeByLivingSituation] = useState(false)

  // Filter selections
  const [filterVeteransOnly, setFilterVeteransOnly] = useState(false)
  const [filterDisabledOnly, setFilterDisabledOnly] = useState(false)
  const [filterChronicHomeless, setFilterChronicHomeless] = useState(false)
  const [filterAgeRange, setFilterAgeRange] = useState('')

  const handleGenerate = () => {
    setIsGenerating(true)

    // DEBUG: Log what data we're working with

    try {
      // Calculate age helper
      const calculateAge = (dob: string): number => {
        const birthDate = new Date(dob)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        return age
      }

      // Helper function to get local date string (YYYY-MM-DD) from timestamp
      // This properly handles timezone offsets by parsing the date and extracting local date
      const getLocalDateString = (dateStr: string): string => {
        const date = new Date(dateStr)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      // Filter encounters by date range FIRST
      let filteredEncounters = encounters


      if (startDate && endDate) {
        // Both dates provided: filter between range
        filteredEncounters = filteredEncounters.filter(e => {
          const localDate = getLocalDateString(e.service_date)
          return localDate >= startDate && localDate <= endDate
        })
      } else if (startDate) {
        // Only start date: filter from start date onwards
        filteredEncounters = filteredEncounters.filter(e => {
          const localDate = getLocalDateString(e.service_date)
          return localDate >= startDate
        })
      } else if (endDate) {
        // Only end date: filter up to end date
        filteredEncounters = filteredEncounters.filter(e => {
          const localDate = getLocalDateString(e.service_date)
          return localDate <= endDate
        })
      }

      // Get unique person IDs from filtered encounters
      const personIdsWithEncounters = new Set(filteredEncounters.map(e => e.person_id))

      // Get person IDs with exits in the date range
      const personIdsWithExits = new Set(
        persons
          .filter(p => {
            if (!p.exit_date) return false
            const exitDateStr = getLocalDateString(p.exit_date)
            if (startDate && endDate) {
              return exitDateStr >= startDate && exitDateStr <= endDate
            } else if (startDate) {
              return exitDateStr >= startDate
            } else if (endDate) {
              return exitDateStr <= endDate
            }
            return true
          })
          .map(p => p.id)
      )


      // Filter persons by demographics AND by whether they have encounters OR exits in the date range
      let filteredPersons = persons.filter(p =>
        personIdsWithEncounters.has(p.id) || personIdsWithExits.has(p.id)
      )


      if (filterVeteransOnly) {
        filteredPersons = filteredPersons.filter(p => p.veteran_status)
      }

      if (filterDisabledOnly) {
        filteredPersons = filteredPersons.filter(p => p.disability_status)
      }

      if (filterChronicHomeless) {
        filteredPersons = filteredPersons.filter(p => p.chronic_homeless)
      }

      if (filterAgeRange) {
        filteredPersons = filteredPersons.filter(p => {
          const age = calculateAge(p.date_of_birth)
          switch (filterAgeRange) {
            case '18-24': return age >= 18 && age <= 24
            case '25-34': return age >= 25 && age <= 34
            case '35-44': return age >= 35 && age <= 44
            case '45-54': return age >= 45 && age <= 54
            case '55-64': return age >= 55 && age <= 64
            case '65+': return age >= 65
            default: return true
          }
        })
      }

      // Filter encounters to only include those for the filtered persons
      const filteredPersonIds = new Set(filteredPersons.map(p => p.id))
      filteredEncounters = filteredEncounters.filter(e => filteredPersonIds.has(e.person_id))

      // Active persons = those without an exit_date (for By-Name List)
      const activePersons = filteredPersons.filter(p => !p.exit_date)

      // Calculate metrics from filtered data
      const clientsServed = filteredPersons.length

      const totalInteractions = filteredEncounters.length
      const naloxoneDistributed = filteredEncounters.filter(e => e.naloxone_distributed).length
      const fentanylTestStrips = filteredEncounters.reduce(
        (sum, e) => sum + (e.fentanyl_test_strips_count || 0),
        0
      )
      const matReferrals = filteredEncounters.filter(e => e.mat_referral).length
      const detoxReferrals = filteredEncounters.filter(e => e.detox_referral).length
      const totalReferrals = matReferrals + detoxReferrals

      // Count unique persons who have at least one high utilizer encounter
      const highUtilizerPersonIds = new Set(
        filteredEncounters
          .filter(e => e.high_utilizer_contact)
          .map(e => e.person_id)
      )
      const highUtilizerContacts = highUtilizerPersonIds.size

      // Build details for high utilizers with person info and encounter count
      const highUtilizerDetails = Array.from(highUtilizerPersonIds).map(personId => {
        const person = persons.find(p => p.id === personId)
        const encounterCount = filteredEncounters.filter(e => e.person_id === personId && e.high_utilizer_contact).length
        return {
          person_id: personId,
          person_name: person ? `${person.first_name} ${person.last_name}` : 'Unknown',
          client_id: person?.client_id || 'Unknown',
          encounter_count: encounterCount,
        }
      }).sort((a, b) => b.encounter_count - a.encounter_count)

      // Calculate housing placements from program exits to permanent housing
      const permanentHousingDestinations = EXIT_DESTINATIONS['Permanent Housing'] as readonly string[]
      const housingPlacements = filteredPersons.filter(p => {
        if (!p.exit_date || !p.exit_destination) return false

        // Check if exit is within date range
        const exitDateStr = getLocalDateString(p.exit_date)
        const inDateRange = startDate && endDate
          ? (exitDateStr >= startDate && exitDateStr <= endDate)
          : startDate
            ? exitDateStr >= startDate
            : endDate
              ? exitDateStr <= endDate
              : true

        // Check if destination is permanent housing
        const isPermanentHousing = permanentHousingDestinations.includes(p.exit_destination)

        return inDateRange && isPermanentHousing
      }).length

      // Calculate program exits breakdown by category
      const personsWithExits = filteredPersons.filter(p => {
        if (!p.exit_date || !p.exit_destination) return false
        const exitDateStr = getLocalDateString(p.exit_date)
        const inDateRange = startDate && endDate
          ? (exitDateStr >= startDate && exitDateStr <= endDate)
          : startDate
            ? exitDateStr >= startDate
            : endDate
              ? exitDateStr <= endDate
              : true
        return inDateRange
      })

      const programExits = personsWithExits.length

      // Calculate returned to active from status_changes
      const returnedToActiveRecords = statusChanges.filter(sc => {
        if (sc.change_type !== 'return_to_active') return false
        const changeDateStr = getLocalDateString(sc.change_date)
        if (startDate && endDate) {
          return changeDateStr >= startDate && changeDateStr <= endDate
        } else if (startDate) {
          return changeDateStr >= startDate
        } else if (endDate) {
          return changeDateStr <= endDate
        }
        return true
      })
      const returnedToActive = returnedToActiveRecords.length

      // Build details for returned to active with person info
      const returnedToActiveDetails = returnedToActiveRecords.map(sc => {
        const person = persons.find(p => p.id === sc.person_id)
        return {
          person_id: sc.person_id,
          person_name: person ? `${person.first_name} ${person.last_name}` : 'Unknown',
          client_id: person?.client_id || 'Unknown',
          return_date: sc.change_date,
          notes: sc.notes || null,
        }
      }).sort((a, b) => new Date(b.return_date).getTime() - new Date(a.return_date).getTime())

      const exitsByCategory = Object.entries(EXIT_DESTINATIONS).reduce((acc, [category, destinations]) => {
        const categoryDestinations: Record<string, number> = {}
        let categoryTotal = 0

        destinations.forEach(destination => {
          const count = personsWithExits.filter(p => p.exit_destination === destination).length
          if (count > 0) {
            categoryDestinations[destination] = count
            categoryTotal += count
          }
        })

        if (categoryTotal > 0) {
          acc[category] = {
            total: categoryTotal,
            destinations: categoryDestinations
          }
        }

        return acc
      }, {} as Record<string, { total: number, destinations: Record<string, number> }>)

      // Build referral breakdown
      const matByProvider = filteredEncounters
        .filter(e => e.mat_referral && e.mat_provider)
        .reduce((acc, e) => {
          const provider = e.mat_provider || 'Unknown'
          acc[provider] = (acc[provider] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      const detoxByProvider = filteredEncounters
        .filter(e => e.detox_referral && e.detox_provider)
        .reduce((acc, e) => {
          const provider = e.detox_provider || 'Unknown'
          acc[provider] = (acc[provider] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      // Calculate placements
      const placementsMade = filteredEncounters.filter(e => e.placement_made).length

      // Calculate refused shelter
      const refusedShelter = filteredEncounters.filter(e => e.refused_shelter).length

      // Calculate inflows (newly enrolled in date range)
      const inflowPersons = persons.filter(p => {
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

      // Calculate outflows (exits to housed/sheltered/detox)
      const permanentHousingDests = [
        'Owned by client, no ongoing subsidy',
        'Owned by client, with ongoing subsidy (mortgage, VA, etc.)',
        'Rental by client, no ongoing subsidy',
        'Rental by client, with VASH subsidy',
        'Rental by client, with other ongoing housing subsidy (HCV, public housing, CoC-RRH, etc.)',
        'Permanent housing for formerly homeless persons (CoC, ESG, or other funding)',
        'Staying or living with family, permanent tenure',
        'Staying or living with friends, permanent tenure',
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

      const outflowHoused = personsWithExits.filter(p => p.exit_destination && permanentHousingDests.includes(p.exit_destination))
      const outflowSheltered = personsWithExits.filter(p => p.exit_destination && shelterDests.includes(p.exit_destination))
      const outflowDetox = personsWithExits.filter(p => p.exit_destination && detoxDests.includes(p.exit_destination))

      // Placement breakdown by location
      const placementsByLocation = filteredEncounters
        .filter(e => e.placement_made)
        .reduce((acc, e) => {
          const location = e.placement_location === 'Other'
            ? (e.placement_location_other || 'Other')
            : (e.placement_location || 'Unknown')
          acc[location] = (acc[location] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      // Build custom report data
      const reportData: Record<string, unknown>[] = []

      // Add report metadata using same column structure as metrics
      reportData.push({
        'Metric': '=== REPORT INFORMATION ===',
        'Value': '',
        'Description': '',
      })
      reportData.push({
        'Metric': 'Report Type',
        'Value': 'Custom Data Report',
        'Description': '',
      })
      reportData.push({
        'Metric': 'Generated',
        'Value': new Date().toISOString(),
        'Description': '',
      })
      // Determine date range text
      let dateRangeText = 'All Time'
      if (startDate && endDate) {
        dateRangeText = `${startDate} to ${endDate}`
      } else if (startDate) {
        dateRangeText = `From ${startDate}`
      } else if (endDate) {
        dateRangeText = `Up to ${endDate}`
      }

      reportData.push({
        'Metric': 'Date Range',
        'Value': dateRangeText,
        'Description': '',
      })
      reportData.push({
        'Metric': '',
        'Value': '',
        'Description': '',
      })
      reportData.push({
        'Metric': '=== METRICS ===',
        'Value': '',
        'Description': '',
      })

      // Add selected metrics
      if (includeClientsServed) {
        reportData.push({
          'Metric': 'Clients Served',
          'Value': clientsServed,
          'Description': 'Unduplicated individuals',
        })
      }

      if (includeServiceInteractions) {
        reportData.push({
          'Metric': 'Service Interactions',
          'Value': totalInteractions,
          'Description': 'Total encounters',
        })
      }

      if (includeNaloxone) {
        reportData.push({
          'Metric': 'Naloxone Distributed',
          'Value': naloxoneDistributed,
          'Description': 'Kits given out',
        })
      }

      if (includeFentanylStrips) {
        reportData.push({
          'Metric': 'Fentanyl Test Strips',
          'Value': fentanylTestStrips,
          'Description': 'Total distributed',
        })
      }

      if (includeTotalReferrals) {
        reportData.push({
          'Metric': 'Total Referrals',
          'Value': totalReferrals,
          'Description': `MAT: ${matReferrals}, Detox: ${detoxReferrals}`,
        })
      }

      if (includeHighUtilizerCount) {
        reportData.push({
          'Metric': 'High Utilizers',
          'Value': highUtilizerContacts,
          'Description': 'Unique individuals marked as high utilizers',
        })
      }

      if (includeReferralBreakdown) {
        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': 'MAT Referrals by Provider',
          'Value': '',
          'Description': '',
        })
        Object.entries(matByProvider).forEach(([provider, count]) => {
          reportData.push({
            'Metric': `  ${provider}`,
            'Value': count,
            'Description': '',
          })
        })

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': 'Detox Referrals by Provider',
          'Value': '',
          'Description': '',
        })
        Object.entries(detoxByProvider).forEach(([provider, count]) => {
          reportData.push({
            'Metric': `  ${provider}`,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeInflows) {
        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== INFLOWS ===',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': 'Total Inflows',
          'Value': inflowPersons.length,
          'Description': 'Newly enrolled clients in date range',
        })
        if (inflowPersons.length > 0) {
          reportData.push({
            'Metric': 'Inflow Details',
            'Value': '',
            'Description': '',
          })
          inflowPersons.slice(0, 50).forEach(p => {
            reportData.push({
              'Metric': `  ${p.first_name} ${p.last_name}`,
              'Value': p.client_id,
              'Description': `Enrolled: ${getLocalDateString(p.enrollment_date)}`,
            })
          })
        }
      }

      if (includeOutflows) {
        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== OUTFLOWS ===',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': 'Total Outflows',
          'Value': outflowHoused.length + outflowSheltered.length + outflowDetox.length,
          'Description': 'Exits to housing, shelter, or detox',
        })
        reportData.push({
          'Metric': '  Housed',
          'Value': outflowHoused.length,
          'Description': 'Exits to permanent housing',
        })
        reportData.push({
          'Metric': '  Sheltered',
          'Value': outflowSheltered.length,
          'Description': 'Exits to shelter/transitional',
        })
        reportData.push({
          'Metric': '  Detox',
          'Value': outflowDetox.length,
          'Description': 'Exits to detox/treatment',
        })
        if (outflowHoused.length + outflowSheltered.length + outflowDetox.length > 0) {
          reportData.push({
            'Metric': 'Outflow Details',
            'Value': '',
            'Description': '',
          })
          ;[...outflowHoused, ...outflowSheltered, ...outflowDetox].slice(0, 50).forEach(p => {
            reportData.push({
              'Metric': `  ${p.first_name} ${p.last_name}`,
              'Value': p.client_id,
              'Description': `${p.exit_destination?.split('(')[0].trim() || 'Unknown'} - ${getLocalDateString(p.exit_date!)}`,
            })
          })
        }
      }

      if (includeHousingPlacements) {
        reportData.push({
          'Metric': 'Housing Placements',
          'Value': housingPlacements,
          'Description': 'Permanent housing',
        })
      }

      if (includePlacements) {
        reportData.push({
          'Metric': 'Placements Made',
          'Value': placementsMade,
          'Description': 'Total placements to programs/shelters',
        })

        if (Object.keys(placementsByLocation).length > 0) {
          reportData.push({
            'Metric': '',
            'Value': '',
            'Description': '',
          })
          reportData.push({
            'Metric': 'Placements by Location',
            'Value': '',
            'Description': '',
          })
          Object.entries(placementsByLocation)
            .sort(([, a], [, b]) => b - a)
            .forEach(([location, count]) => {
              reportData.push({
                'Metric': `  ${location}`,
                'Value': count,
                'Description': '',
              })
            })
        }
      }

      if (includeRefusedShelter) {
        reportData.push({
          'Metric': 'Refused Shelter',
          'Value': refusedShelter,
          'Description': 'Clients who declined shelter placement',
        })
      }

      if (includeReturnedToActive) {
        reportData.push({
          'Metric': 'Returned to Active',
          'Value': returnedToActive,
          'Description': 'Previously exited clients who returned',
        })
      }

      // Export by-name list if selected
      if (includeByNameList) {
        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== ACTIVE BY-NAME LIST ===',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': 'Total Active Clients',
          'Value': activePersons.length,
          'Description': '',
        })
        reportData.push({
          'Metric': 'Veterans',
          'Value': activePersons.filter(p => p.veteran_status).length,
          'Description': '',
        })
        reportData.push({
          'Metric': 'Chronically Homeless',
          'Value': activePersons.filter(p => p.chronic_homeless).length,
          'Description': '',
        })
        reportData.push({
          'Metric': 'With Disability',
          'Value': activePersons.filter(p => p.disability_status).length,
          'Description': '',
        })
        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': 'Client ID',
          'Value': 'First Name',
          'Description': 'Last Name',
          'Age': 'Age',
          'Gender': 'Gender',
          'Veteran': 'Veteran',
          'Chronic Homeless': 'Chronic Homeless',
          'Enrollment Date': 'Enrollment Date',
        })
        activePersons.forEach(p => {
          reportData.push({
            'Metric': p.client_id,
            'Value': p.first_name,
            'Description': p.last_name,
            'Age': calculateAge(p.date_of_birth),
            'Gender': p.gender,
            'Veteran': p.veteran_status ? 'Yes' : 'No',
            'Chronic Homeless': p.chronic_homeless ? 'Yes' : 'No',
            'Enrollment Date': p.enrollment_date,
          })
        })
      }

      // Export interactions detail if selected
      if (includeInteractionsDetail) {
        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== SERVICE INTERACTIONS DETAIL ===',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': 'Service Date',
          'Value': 'Client ID',
          'Description': 'Location',
          'Outreach Worker': 'Outreach Worker',
          'MAT Referral': 'MAT Referral',
          'Detox Referral': 'Detox Referral',
          'Naloxone': 'Naloxone',
          'Fentanyl Strips': 'Fentanyl Strips',
        })
        filteredEncounters.forEach(e => {
          reportData.push({
            'Metric': e.service_date,
            'Value': e.person_id,
            'Description': e.outreach_location,
            'Outreach Worker': e.outreach_worker,
            'MAT Referral': e.mat_referral ? 'Yes' : 'No',
            'Detox Referral': e.detox_referral ? 'Yes' : 'No',
            'Naloxone': e.naloxone_distributed ? 'Yes' : 'No',
            'Fentanyl Strips': e.fentanyl_test_strips_count || 0,
          })
        })
      }

      // Export demographic breakdowns if selected
      if (includeByRace) {
        const raceBreakdown = filteredPersons.reduce((acc, p) => {
          const race = p.race || 'Unknown'
          acc[race] = (acc[race] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY RACE ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(raceBreakdown).forEach(([race, count]) => {
          reportData.push({
            'Metric': race,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeByEthnicity) {
        const ethnicityBreakdown = filteredPersons.reduce((acc, p) => {
          const ethnicity = p.ethnicity || 'Unknown'
          acc[ethnicity] = (acc[ethnicity] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY ETHNICITY ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(ethnicityBreakdown).forEach(([ethnicity, count]) => {
          reportData.push({
            'Metric': ethnicity,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeByGender) {
        const genderBreakdown = filteredPersons.reduce((acc, p) => {
          const gender = p.gender || 'Unknown'
          acc[gender] = (acc[gender] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY GENDER ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(genderBreakdown).forEach(([gender, count]) => {
          reportData.push({
            'Metric': gender,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeBySexualOrientation) {
        const sexualOrientationBreakdown = filteredPersons.reduce((acc, p) => {
          const orientation = p.sexual_orientation || 'Not specified'
          acc[orientation] = (acc[orientation] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY SEXUAL ORIENTATION ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(sexualOrientationBreakdown).forEach(([orientation, count]) => {
          reportData.push({
            'Metric': orientation,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeByAgeRange) {
        const ageBreakdown: Record<string, number> = {
          '18-24': 0,
          '25-34': 0,
          '35-44': 0,
          '45-54': 0,
          '55-64': 0,
          '65+': 0,
        }

        filteredPersons.forEach(p => {
          const age = calculateAge(p.date_of_birth)
          if (age >= 18 && age <= 24) ageBreakdown['18-24']++
          else if (age >= 25 && age <= 34) ageBreakdown['25-34']++
          else if (age >= 35 && age <= 44) ageBreakdown['35-44']++
          else if (age >= 45 && age <= 54) ageBreakdown['45-54']++
          else if (age >= 55 && age <= 64) ageBreakdown['55-64']++
          else if (age >= 65) ageBreakdown['65+']++
        })

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY AGE RANGE ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(ageBreakdown).forEach(([range, count]) => {
          reportData.push({
            'Metric': range,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeByVeteranStatus) {
        const veteranBreakdown = {
          'Veteran': filteredPersons.filter(p => p.veteran_status).length,
          'Non-Veteran': filteredPersons.filter(p => !p.veteran_status).length,
        }

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY VETERAN STATUS ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(veteranBreakdown).forEach(([status, count]) => {
          reportData.push({
            'Metric': status,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeByDisabilityStatus) {
        const disabilityBreakdown = {
          'Has Disability': filteredPersons.filter(p => p.disability_status).length,
          'No Disability': filteredPersons.filter(p => !p.disability_status).length,
        }

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY DISABILITY STATUS ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(disabilityBreakdown).forEach(([status, count]) => {
          reportData.push({
            'Metric': status,
            'Value': count,
            'Description': '',
          })
        })
      }

      if (includeByLivingSituation) {
        const livingSituationBreakdown = filteredPersons.reduce((acc, p) => {
          const situation = p.living_situation || 'Unknown'
          acc[situation] = (acc[situation] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        reportData.push({
          'Metric': '',
          'Value': '',
          'Description': '',
        })
        reportData.push({
          'Metric': '=== BREAKDOWN BY LIVING SITUATION ===',
          'Value': '',
          'Description': '',
        })
        Object.entries(livingSituationBreakdown).forEach(([situation, count]) => {
          reportData.push({
            'Metric': situation,
            'Value': count,
            'Description': '',
          })
        })
      }

      // Store the generated report data to display
      setGeneratedReport({
        reportData,
        metadata: {
          generated: new Date().toISOString(),
          dateRange: dateRangeText,
          startDate,
          endDate,
        },
        metrics: {
          clientsServed,
          totalInteractions,
          naloxoneDistributed,
          fentanylTestStrips,
          totalReferrals,
          matReferrals,
          detoxReferrals,
          housingPlacements,
          placementsMade,
          refusedShelter,
          highUtilizerContacts,
          programExits,
          returnedToActive,
        },
        breakdowns: {
          matByProvider,
          detoxByProvider,
          placementsByLocation,
          exitsByCategory,
          returnedToActiveDetails,
          highUtilizerDetails,
        },
        filteredPersons,
        activePersons,
        filteredEncounters,
      })

      setShowReportModal(true)
      setIsGenerating(false)
    } catch (error) {
      console.error('Report generation error:', error)
      alert('Error generating report. Please try again.')
      setIsGenerating(false)
    }
  }

  const handleDownloadCSV = () => {
    console.log('🚨 DOWNLOAD CSV BUTTON CLICKED - EXPORTING NOW')
    if (!generatedReport) return

    let dateRange = '_all_time'
    if (generatedReport.metadata.startDate && generatedReport.metadata.endDate) {
      dateRange = `_${generatedReport.metadata.startDate}_to_${generatedReport.metadata.endDate}`
    } else if (generatedReport.metadata.startDate) {
      dateRange = `_from_${generatedReport.metadata.startDate}`
    } else if (generatedReport.metadata.endDate) {
      dateRange = `_up_to_${generatedReport.metadata.endDate}`
    }
    const filename = `custom_report${dateRange}.csv`

    exportToCSV(generatedReport.reportData, filename)
  }

  const allUnchecked = !includeClientsServed && !includeServiceInteractions &&
                       !includeNaloxone && !includeFentanylStrips &&
                       !includeTotalReferrals && !includeReferralBreakdown &&
                       !includeHousingPlacements && !includePlacements &&
                       !includeRefusedShelter && !includeHighUtilizerCount && !includeReturnedToActive &&
                       !includeByNameList && !includeInteractionsDetail &&
                       !includeByRace && !includeByEthnicity && !includeByGender &&
                       !includeBySexualOrientation && !includeByAgeRange &&
                       !includeByVeteranStatus && !includeByDisabilityStatus &&
                       !includeByLivingSituation

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg p-6 border-2 border-green-200">
      <div className="flex items-center mb-4">
        <svg
          className="w-6 h-6 text-green-600 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-xl font-bold text-gray-900">
          Custom Report Builder
        </h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Select the metrics you want to include in your custom report and specify a date range.
      </p>

      {/* Date Range */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">Date Range</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Metric Selection */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">Select Metrics to Include</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeClientsServed}
              onChange={(e) => setIncludeClientsServed(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Clients Served (Unduplicated)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeServiceInteractions}
              onChange={(e) => setIncludeServiceInteractions(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Service Interactions Count</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeNaloxone}
              onChange={(e) => setIncludeNaloxone(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Naloxone Distributed</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeFentanylStrips}
              onChange={(e) => setIncludeFentanylStrips(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Fentanyl Test Strips</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeTotalReferrals}
              onChange={(e) => setIncludeTotalReferrals(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Total Referrals (MAT & Detox)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeReferralBreakdown}
              onChange={(e) => setIncludeReferralBreakdown(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Referrals by Provider</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeHousingPlacements}
              onChange={(e) => setIncludeHousingPlacements(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Housing Placements (Exits)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-green-50 p-2 rounded border border-green-200">
            <input
              type="checkbox"
              checked={includePlacements}
              onChange={(e) => setIncludePlacements(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 font-medium">🏠 Placements (BCNC, La Posada, etc.)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-red-50 p-2 rounded border border-red-200">
            <input
              type="checkbox"
              checked={includeRefusedShelter}
              onChange={(e) => setIncludeRefusedShelter(e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 font-medium">🚫 Refused Shelter</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-yellow-50 p-2 rounded border border-yellow-200">
            <input
              type="checkbox"
              checked={includeHighUtilizerCount}
              onChange={(e) => setIncludeHighUtilizerCount(e.target.checked)}
              className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 font-medium">⚠️ High Utilizers (Unique Count)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-green-50 p-2 rounded border border-green-200">
            <input
              type="checkbox"
              checked={includeReturnedToActive}
              onChange={(e) => setIncludeReturnedToActive(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 font-medium">↩️ Returned to Active</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-green-50 p-2 rounded border border-green-200">
            <input
              type="checkbox"
              checked={includeInflows}
              onChange={(e) => setIncludeInflows(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 font-medium">📥 Inflows (New Enrollments)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-amber-50 p-2 rounded border border-amber-200">
            <input
              type="checkbox"
              checked={includeOutflows}
              onChange={(e) => setIncludeOutflows(e.target.checked)}
              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 font-medium">📤 Outflows (Housed/Sheltered/Detox)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByNameList}
              onChange={(e) => setIncludeByNameList(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 font-medium">Active By-Name List</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeInteractionsDetail}
              onChange={(e) => setIncludeInteractionsDetail(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 font-medium">Service Interactions Detail</span>
          </label>
        </div>
      </div>

      {/* Demographic Filters */}
      <div className="bg-white rounded-lg p-4 mb-4 border-2 border-purple-200">
        <h4 className="font-semibold text-gray-800 mb-3">Filter Data By Demographics</h4>
        <p className="text-sm text-gray-600 mb-3">
          Apply filters to narrow down the data before generating the report. These filters will affect all metrics.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={filterVeteransOnly}
              onChange={(e) => setFilterVeteransOnly(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Veterans Only</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={filterDisabledOnly}
              onChange={(e) => setFilterDisabledOnly(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Disabled Only</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={filterChronicHomeless}
              onChange={(e) => setFilterChronicHomeless(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Chronic Homeless Only</span>
          </label>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700 min-w-fit">Age Range:</label>
            <select
              value={filterAgeRange}
              onChange={(e) => setFilterAgeRange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              <option value="">All Ages</option>
              <option value="18-24">18-24</option>
              <option value="25-34">25-34</option>
              <option value="35-44">35-44</option>
              <option value="45-54">45-54</option>
              <option value="55-64">55-64</option>
              <option value="65+">65+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Demographic Breakdowns */}
      <div className="bg-white rounded-lg p-4 mb-4 border-2 border-gold-200">
        <h4 className="font-semibold text-gray-800 mb-3">Include Demographic Breakdowns</h4>
        <p className="text-sm text-gray-600 mb-3">
          Add demographic breakdowns to the report for creating presentation charts.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByRace}
              onChange={(e) => setIncludeByRace(e.target.checked)}
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Race</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByEthnicity}
              onChange={(e) => setIncludeByEthnicity(e.target.checked)}
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Ethnicity</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByGender}
              onChange={(e) => setIncludeByGender(e.target.checked)}
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Gender</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeBySexualOrientation}
              onChange={(e) => setIncludeBySexualOrientation(e.target.checked)}
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Sexual Orientation</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByAgeRange}
              onChange={(e) => setIncludeByAgeRange(e.target.checked)}
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Age Range</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByVeteranStatus}
              onChange={(e) => setIncludeByVeteranStatus(e.target.checked)}
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Veteran Status</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByDisabilityStatus}
              onChange={(e) => setIncludeByDisabilityStatus(e.target.checked)}
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Disability Status</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
            <input
              type="checkbox"
              checked={includeByLivingSituation}
              onChange={(e) => setIncludeByLivingSituation(e.target.checked)}
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Breakdown by Living Situation</span>
          </label>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || allUnchecked}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {isGenerating ? 'Generating Report...' : 'Generate Report'}
        </button>
      </div>

      {allUnchecked && (
        <p className="text-sm text-red-600 text-right mt-2">
          Please select at least one metric to generate
        </p>
      )}

      {/* Report Modal */}
      {showReportModal && generatedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-lg z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Generated Report</h4>
                  <p className="text-sm text-gray-600">
                    Generated: {new Date(generatedReport.metadata.generated).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Date Range: {generatedReport.metadata.dateRange}
                  </p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <button
                onClick={handleDownloadCSV}
                className="px-4 py-2 bg-gold-600 text-charcoal-900 font-semibold rounded-lg hover:bg-gold-500 transition-colors font-medium inline-flex items-center"
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download CSV
            </button>
          </div>

          <div className="p-6">
            {/* Key Metrics Grid */}
          {(includeClientsServed || includeServiceInteractions || includeNaloxone ||
            includeFentanylStrips || includeTotalReferrals || includeHousingPlacements || includeHighUtilizerCount || includeReturnedToActive) && (
            <div className="mb-8">
              <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Key Metrics
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {includeClientsServed && (
                  <div
                    onClick={() => {
                      setDetailModalType('clientsServed')
                      setShowDetailModal(true)
                    }}
                    className="bg-gradient-to-br from-gold-50 to-gold-100 rounded-lg p-4 border border-gold-200 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm text-gray-600 font-medium">Clients Served</p>
                    <p className="text-3xl font-bold text-gold-600 mt-1">{generatedReport.metrics.clientsServed}</p>
                    <p className="text-xs text-gray-500 mt-1">Click for details</p>
                  </div>
                )}
                {includeServiceInteractions && (
                  <div
                    onClick={() => {
                      setDetailModalType('serviceInteractions')
                      setShowDetailModal(true)
                    }}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm text-gray-600 font-medium">Service Interactions</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{generatedReport.metrics.totalInteractions}</p>
                    <p className="text-xs text-gray-500 mt-1">Click for details</p>
                  </div>
                )}
                {includeNaloxone && (
                  <div
                    onClick={() => {
                      setDetailModalType('naloxone')
                      setShowDetailModal(true)
                    }}
                    className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm text-gray-600 font-medium">Naloxone Distributed</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{generatedReport.metrics.naloxoneDistributed}</p>
                    <p className="text-xs text-gray-500 mt-1">Click for details</p>
                  </div>
                )}
                {includeFentanylStrips && (
                  <div
                    onClick={() => {
                      setDetailModalType('fentanylStrips')
                      setShowDetailModal(true)
                    }}
                    className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm text-gray-600 font-medium">Fentanyl Test Strips</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">{generatedReport.metrics.fentanylTestStrips}</p>
                    <p className="text-xs text-gray-500 mt-1">Click for details</p>
                  </div>
                )}
                {includeTotalReferrals && (
                  <div
                    onClick={() => {
                      setDetailModalType('referrals')
                      setShowDetailModal(true)
                    }}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm text-gray-600 font-medium">Total Referrals</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{generatedReport.metrics.totalReferrals}</p>
                    <p className="text-xs text-gray-500 mt-1">Click for breakdown</p>
                  </div>
                )}
                {includeHousingPlacements && (
                  <div
                    onClick={() => {
                      setDetailModalType('housingPlacements')
                      setShowDetailModal(true)
                    }}
                    className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border border-teal-200 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm text-gray-600 font-medium">Housing Placements</p>
                    <p className="text-3xl font-bold text-teal-600 mt-1">{generatedReport.metrics.housingPlacements}</p>
                    <p className="text-xs text-gray-500 mt-1">Click for details</p>
                  </div>
                )}
                {includePlacements && (
                  <div
                    onClick={() => {
                      setDetailModalType('placements')
                      setShowDetailModal(true)
                    }}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-300 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm text-gray-600 font-medium">🏠 Placements</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{generatedReport.metrics.placementsMade}</p>
                    <p className="text-xs text-gray-500 mt-1">Click for breakdown</p>
                  </div>
                )}
                {includeRefusedShelter && (
                  <div
                    onClick={() => {
                      setDetailModalType('refusedShelter')
                      setShowDetailModal(true)
                    }}
                    className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-2 border-red-300 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm text-gray-600 font-medium">🚫 Refused Shelter</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{generatedReport.metrics.refusedShelter}</p>
                    <p className="text-xs text-gray-500 mt-1">Click for details</p>
                  </div>
                )}
                {includeHighUtilizerCount && (
                  <div
                    onClick={() => {
                      setDetailModalType('highUtilizers')
                      setShowDetailModal(true)
                    }}
                    className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border-2 border-yellow-300 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm text-gray-600 font-medium">⚠️ High Utilizers</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-1">{generatedReport.metrics.highUtilizerContacts}</p>
                    <p className="text-xs text-gray-500 mt-1">Click for details</p>
                  </div>
                )}
                {generatedReport.metrics.programExits > 0 && (
                  <div
                    onClick={() => {
                      setDetailModalType('programExits')
                      setShowDetailModal(true)
                    }}
                    className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm text-gray-600 font-medium">Program Exits</p>
                    <p className="text-3xl font-bold text-orange-600 mt-1">{generatedReport.metrics.programExits}</p>
                    <p className="text-xs text-gray-500 mt-1">Click for breakdown</p>
                  </div>
                )}
                {includeReturnedToActive && (
                  <div
                    onClick={() => {
                      setDetailModalType('returnedToActive')
                      setShowDetailModal(true)
                    }}
                    className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border-2 border-emerald-300 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <p className="text-sm text-gray-600 font-medium">↩️ Returned to Active</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">{generatedReport.metrics.returnedToActive}</p>
                    <p className="text-xs text-gray-500 mt-1">Click for details</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Referral Breakdown */}
          {includeReferralBreakdown && (Object.keys(generatedReport.breakdowns.matByProvider).length > 0 || Object.keys(generatedReport.breakdowns.detoxByProvider).length > 0) && (
            <div className="mb-8">
              <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Referral Breakdown by Provider
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(generatedReport.breakdowns.matByProvider).length > 0 && (
                  <div>
                    <h6 className="text-md font-medium text-purple-700 mb-3">MAT Referrals</h6>
                    <div className="space-y-2">
                      {Object.entries(generatedReport.breakdowns.matByProvider)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([provider, count]) => (
                          <div key={provider} className="flex justify-between items-center bg-purple-50 px-4 py-3 rounded-lg border border-purple-200">
                            <span className="text-gray-700 font-medium">{provider}</span>
                            <span className="text-xl font-bold text-purple-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                {Object.keys(generatedReport.breakdowns.detoxByProvider).length > 0 && (
                  <div>
                    <h6 className="text-md font-medium text-red-700 mb-3">Detox Referrals</h6>
                    <div className="space-y-2">
                      {Object.entries(generatedReport.breakdowns.detoxByProvider)
                        .sort(([, a], [, b]) => (b as number) - (a as number))
                        .map(([provider, count]) => (
                          <div key={provider} className="flex justify-between items-center bg-red-50 px-4 py-3 rounded-lg border border-red-200">
                            <span className="text-gray-700 font-medium">{provider}</span>
                            <span className="text-xl font-bold text-red-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* By-Name List */}
          {includeByNameList && generatedReport.activePersons.length > 0 && (
            <div className="mb-8">
              <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Active By-Name List
              </h5>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-indigo-700">{generatedReport.activePersons.length}</p>
                  <p className="text-sm text-indigo-600">Total Active Clients</p>
                </div>
                <div className="bg-gold-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-gold-700">{generatedReport.activePersons.filter(p => p.veteran_status).length}</p>
                  <p className="text-sm text-gold-600">Veterans</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-700">{generatedReport.activePersons.filter(p => p.chronic_homeless).length}</p>
                  <p className="text-sm text-red-600">Chronically Homeless</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-700">{generatedReport.activePersons.filter(p => p.disability_status).length}</p>
                  <p className="text-sm text-green-600">With Disability</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veteran</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chronic</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {generatedReport.activePersons.map((person: Person, idx: number) => {
                      const calculateAge = (dob: string): number => {
                        const birthDate = new Date(dob)
                        const today = new Date()
                        let age = today.getFullYear() - birthDate.getFullYear()
                        const monthDiff = today.getMonth() - birthDate.getMonth()
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                          age--
                        }
                        return age
                      }
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{person.client_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{person.first_name} {person.last_name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{calculateAge(person.date_of_birth)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{person.gender}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${person.veteran_status ? 'bg-gold-100 text-gold-800' : 'bg-gray-100 text-gray-800'}`}>
                              {person.veteran_status ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${person.chronic_homeless ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                              {person.chronic_homeless ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{person.enrollment_date}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Service Interactions Detail */}
          {includeInteractionsDetail && generatedReport.filteredEncounters.length > 0 && (
            <div className="mb-8">
              <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Service Interactions Detail ({generatedReport.filteredEncounters.length} interactions)
              </h5>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MAT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detox</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Naloxone</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fentanyl Strips</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {generatedReport.filteredEncounters.map((encounter: Encounter, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{encounter.service_date}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{encounter.outreach_location}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{encounter.outreach_worker}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${encounter.mat_referral ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                            {encounter.mat_referral ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${encounter.detox_referral ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                            {encounter.detox_referral ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${encounter.naloxone_distributed ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                            {encounter.naloxone_distributed ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">{encounter.fentanyl_test_strips_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Demographic Breakdowns */}
          {(includeByRace || includeByEthnicity || includeByGender || includeBySexualOrientation ||
            includeByAgeRange || includeByVeteranStatus || includeByDisabilityStatus || includeByLivingSituation) && (
            <div className="mb-8">
              <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Demographic Breakdowns
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Race Breakdown */}
                {includeByRace && (
                  <div>
                    <h6 className="text-md font-medium text-gold-700 mb-3">By Race</h6>
                    <div className="space-y-2">
                      {Object.entries(
                        generatedReport.filteredPersons.reduce((acc, p) => {
                          const race = p.race || 'Unknown'
                          acc[race] = (acc[race] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([race, count]) => (
                          <div key={race} className="flex justify-between items-center bg-gold-50 px-4 py-3 rounded-lg border border-gold-200">
                            <span className="text-gray-700 font-medium">{race}</span>
                            <span className="text-xl font-bold text-gold-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Ethnicity Breakdown */}
                {includeByEthnicity && (
                  <div>
                    <h6 className="text-md font-medium text-indigo-700 mb-3">By Ethnicity</h6>
                    <div className="space-y-2">
                      {Object.entries(
                        generatedReport.filteredPersons.reduce((acc, p) => {
                          const ethnicity = p.ethnicity || 'Unknown'
                          acc[ethnicity] = (acc[ethnicity] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([ethnicity, count]) => (
                          <div key={ethnicity} className="flex justify-between items-center bg-indigo-50 px-4 py-3 rounded-lg border border-indigo-200">
                            <span className="text-gray-700 font-medium">{ethnicity}</span>
                            <span className="text-xl font-bold text-indigo-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Gender Breakdown */}
                {includeByGender && (
                  <div>
                    <h6 className="text-md font-medium text-pink-700 mb-3">By Gender</h6>
                    <div className="space-y-2">
                      {Object.entries(
                        generatedReport.filteredPersons.reduce((acc, p) => {
                          const gender = p.gender || 'Unknown'
                          acc[gender] = (acc[gender] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([gender, count]) => (
                          <div key={gender} className="flex justify-between items-center bg-pink-50 px-4 py-3 rounded-lg border border-pink-200">
                            <span className="text-gray-700 font-medium">{gender}</span>
                            <span className="text-xl font-bold text-pink-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Sexual Orientation Breakdown */}
                {includeBySexualOrientation && (
                  <div>
                    <h6 className="text-md font-medium text-violet-700 mb-3">By Sexual Orientation</h6>
                    <div className="space-y-2">
                      {Object.entries(
                        generatedReport.filteredPersons.reduce((acc, p) => {
                          const orientation = p.sexual_orientation || 'Not specified'
                          acc[orientation] = (acc[orientation] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([orientation, count]) => (
                          <div key={orientation} className="flex justify-between items-center bg-violet-50 px-4 py-3 rounded-lg border border-violet-200">
                            <span className="text-gray-700 font-medium">{orientation}</span>
                            <span className="text-xl font-bold text-violet-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Age Range Breakdown */}
                {includeByAgeRange && (
                  <div>
                    <h6 className="text-md font-medium text-orange-700 mb-3">By Age Range</h6>
                    <div className="space-y-2">
                      {(() => {
                        const calculateAge = (dob: string): number => {
                          const birthDate = new Date(dob)
                          const today = new Date()
                          let age = today.getFullYear() - birthDate.getFullYear()
                          const monthDiff = today.getMonth() - birthDate.getMonth()
                          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                            age--
                          }
                          return age
                        }

                        const ageBreakdown: Record<string, number> = {
                          '18-24': 0,
                          '25-34': 0,
                          '35-44': 0,
                          '45-54': 0,
                          '55-64': 0,
                          '65+': 0,
                        }

                        generatedReport.filteredPersons.forEach(p => {
                          const age = calculateAge(p.date_of_birth)
                          if (age >= 18 && age <= 24) ageBreakdown['18-24']++
                          else if (age >= 25 && age <= 34) ageBreakdown['25-34']++
                          else if (age >= 35 && age <= 44) ageBreakdown['35-44']++
                          else if (age >= 45 && age <= 54) ageBreakdown['45-54']++
                          else if (age >= 55 && age <= 64) ageBreakdown['55-64']++
                          else if (age >= 65) ageBreakdown['65+']++
                        })

                        return Object.entries(ageBreakdown).map(([range, count]) => (
                          <div key={range} className="flex justify-between items-center bg-orange-50 px-4 py-3 rounded-lg border border-orange-200">
                            <span className="text-gray-700 font-medium">{range}</span>
                            <span className="text-xl font-bold text-orange-600">{count}</span>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                )}

                {/* Veteran Status Breakdown */}
                {includeByVeteranStatus && (
                  <div>
                    <h6 className="text-md font-medium text-gold-700 mb-3">By Veteran Status</h6>
                    <div className="space-y-2">
                      {Object.entries({
                        'Veteran': generatedReport.filteredPersons.filter(p => p.veteran_status).length,
                        'Non-Veteran': generatedReport.filteredPersons.filter(p => !p.veteran_status).length,
                      }).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center bg-gold-50 px-4 py-3 rounded-lg border border-gold-200">
                          <span className="text-gray-700 font-medium">{status}</span>
                          <span className="text-xl font-bold text-gold-600">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disability Status Breakdown */}
                {includeByDisabilityStatus && (
                  <div>
                    <h6 className="text-md font-medium text-amber-700 mb-3">By Disability Status</h6>
                    <div className="space-y-2">
                      {Object.entries({
                        'Has Disability': generatedReport.filteredPersons.filter(p => p.disability_status).length,
                        'No Disability': generatedReport.filteredPersons.filter(p => !p.disability_status).length,
                      }).map(([status, count]) => (
                        <div key={status} className="flex justify-between items-center bg-amber-50 px-4 py-3 rounded-lg border border-amber-200">
                          <span className="text-gray-700 font-medium">{status}</span>
                          <span className="text-xl font-bold text-amber-600">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Living Situation Breakdown */}
                {includeByLivingSituation && (
                  <div>
                    <h6 className="text-md font-medium text-teal-700 mb-3">By Living Situation</h6>
                    <div className="space-y-2">
                      {Object.entries(
                        generatedReport.filteredPersons.reduce((acc, p) => {
                          const situation = p.living_situation || 'Unknown'
                          acc[situation] = (acc[situation] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                      )
                        .sort(([, a], [, b]) => b - a)
                        .map(([situation, count]) => (
                          <div key={situation} className="flex justify-between items-center bg-teal-50 px-4 py-3 rounded-lg border border-teal-200">
                            <span className="text-gray-700 font-medium">{situation}</span>
                            <span className="text-xl font-bold text-teal-600">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          </div>
        </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && generatedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h4 className="text-xl font-bold text-gray-900">
                {detailModalType === 'clientsServed' && 'Clients Served Details'}
                {detailModalType === 'serviceInteractions' && 'Service Interactions Details'}
                {detailModalType === 'naloxone' && 'Naloxone Distribution Details'}
                {detailModalType === 'fentanylStrips' && 'Fentanyl Test Strips Details'}
                {detailModalType === 'referrals' && 'Referrals Breakdown'}
                {detailModalType === 'programExits' && 'Program Exits Breakdown'}
                {detailModalType === 'housingPlacements' && 'Housing Placements Details'}
                {detailModalType === 'placements' && 'Placements Breakdown'}
                {detailModalType === 'refusedShelter' && 'Refused Shelter Details'}
                {detailModalType === 'returnedToActive' && 'Returned to Active Details'}
                {detailModalType === 'highUtilizers' && 'High Utilizers Details'}
              </h4>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Clients Served Details */}
              {detailModalType === 'clientsServed' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-gold-50 to-gold-100 rounded-lg p-4 border-2 border-gold-200 mb-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Total Clients Served</p>
                        <p className="text-4xl font-bold text-gold-600 mt-1">{generatedReport.metrics.clientsServed}</p>
                        <p className="text-xs text-gray-500 mt-2">Unduplicated individuals in this date range</p>
                      </div>
                      <button
                        onClick={() => {
                          const printWindow = window.open('', '_blank')
                          if (printWindow) {
                            const clientRows = generatedReport.filteredPersons.map((person, index) => {
                              const clientEncounters = encounters.filter(e => e.person_id === person.id)
                              const age = (() => {
                                const birthDate = new Date(person.date_of_birth)
                                const today = new Date()
                                let a = today.getFullYear() - birthDate.getFullYear()
                                const monthDiff = today.getMonth() - birthDate.getMonth()
                                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) a--
                                return a
                              })()
                              return `
                                <tr style="border-bottom: 1px solid #e5e7eb;">
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${index + 1}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${person.client_id}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">${person.first_name} ${person.last_name}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${age}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${person.gender}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${person.race}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${person.ethnicity}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${person.living_situation}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${person.veteran_status ? 'Yes' : 'No'}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${person.chronic_homeless ? 'Yes' : 'No'}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date(person.enrollment_date).toLocaleDateString()}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${clientEncounters.length}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${person.case_manager || '-'}</td>
                                  <td style="padding: 8px; border: 1px solid #e5e7eb;">${person.exit_date ? new Date(person.exit_date).toLocaleDateString() : 'Active'}</td>
                                </tr>
                              `
                            }).join('')

                            printWindow.document.write(`
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <title>Clients Served Report - ${generatedReport.metadata.dateRange}</title>
                                <style>
                                  body { font-family: Arial, sans-serif; padding: 20px; font-size: 11px; }
                                  h1 { color: #b8860b; margin-bottom: 5px; }
                                  h2 { color: #374151; font-size: 14px; margin-bottom: 20px; }
                                  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                  th { background-color: #0a0a0a; color: white; padding: 10px 8px; text-align: left; font-size: 10px; }
                                  tr:nth-child(even) { background-color: #f3f4f6; }
                                  .header-info { margin-bottom: 20px; }
                                  .stat { display: inline-block; margin-right: 30px; }
                                  .stat-value { font-size: 24px; font-weight: bold; color: #b8860b; }
                                  .stat-label { font-size: 12px; color: #6b7280; }
                                  @media print {
                                    body { padding: 10px; }
                                    table { font-size: 9px; }
                                    th, td { padding: 4px; }
                                  }
                                </style>
                              </head>
                              <body>
                                <h1>Lost & Found Outreach - Clients Served Report</h1>
                                <h2>Date Range: ${generatedReport.metadata.dateRange}</h2>
                                <div class="header-info">
                                  <div class="stat">
                                    <div class="stat-value">${generatedReport.metrics.clientsServed}</div>
                                    <div class="stat-label">Total Clients Served</div>
                                  </div>
                                  <div class="stat">
                                    <div class="stat-value">${generatedReport.metrics.totalInteractions}</div>
                                    <div class="stat-label">Total Interactions</div>
                                  </div>
                                </div>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>#</th>
                                      <th>Client ID</th>
                                      <th>Name</th>
                                      <th>Age</th>
                                      <th>Gender</th>
                                      <th>Race</th>
                                      <th>Ethnicity</th>
                                      <th>Living Situation</th>
                                      <th>Veteran</th>
                                      <th>Chronic</th>
                                      <th>Enrolled</th>
                                      <th>Interactions</th>
                                      <th>Case Manager</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${clientRows}
                                  </tbody>
                                </table>
                                <p style="margin-top: 20px; font-size: 10px; color: #6b7280;">
                                  Generated on ${new Date().toLocaleString()} | Lost & Found Outreach Program
                                </p>
                              </body>
                              </html>
                            `)
                            printWindow.document.close()
                            printWindow.print()
                          }
                        }}
                        className="px-4 py-2 bg-gold-600 text-charcoal-900 font-semibold rounded-lg hover:bg-gold-500 transition-colors flex items-center gap-2 text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print List
                      </button>
                    </div>
                  </div>

                  {generatedReport.filteredPersons.length > 0 ? (
                    <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                      <h5 className="font-semibold text-gold-700 text-lg mb-3">Client List</h5>
                      <p className="text-xs text-gray-500 mb-3">Click any client to view full details</p>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {generatedReport.filteredPersons.map((person) => (
                          <div
                            key={person.id}
                            onClick={() => {
                              setSelectedClient(person)
                              setShowClientModal(true)
                            }}
                            className="bg-white rounded-lg p-3 border border-gold-100 shadow-sm flex justify-between items-center cursor-pointer hover:bg-gold-50 hover:border-gold-300 transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-gray-900">{person.first_name} {person.last_name}</p>
                              <p className="text-sm text-gray-500">ID: {person.client_id}</p>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              <p>{person.gender}</p>
                              <p>{person.race}</p>
                              <p className="text-xs text-gold-600 mt-1">Click for details →</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No clients served in this date range.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Service Interactions Details */}
              {detailModalType === 'serviceInteractions' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200 mb-6">
                    <p className="text-sm text-gray-600 font-medium">Total Service Interactions</p>
                    <p className="text-4xl font-bold text-green-600 mt-1">{generatedReport.metrics.totalInteractions}</p>
                    <p className="text-xs text-gray-500 mt-2">Click any encounter to view full details</p>
                  </div>

                  {generatedReport.filteredEncounters.length > 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="font-semibold text-green-700 text-lg mb-3">Encounter List</h5>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {generatedReport.filteredEncounters.map((encounter, index) => {
                          const person = persons.find(p => p.id === encounter.person_id)
                          return (
                            <div
                              key={index}
                              onClick={() => {
                                setSelectedEncounter(encounter)
                                setShowEncounterModal(true)
                              }}
                              className="bg-white rounded-lg p-3 border border-green-100 shadow-sm cursor-pointer hover:bg-green-50 hover:border-green-300 transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-semibold text-gray-900">{person?.first_name} {person?.last_name}</p>
                                  <p className="text-sm text-gray-500">{encounter.outreach_location}</p>
                                </div>
                                <div className="text-right text-sm">
                                  <p className="text-gray-600">{new Date(encounter.service_date).toLocaleDateString()}</p>
                                  <p className="text-gray-500">{encounter.outreach_worker}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {encounter.naloxone_distributed && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Naloxone</span>}
                                {encounter.mat_referral && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">MAT</span>}
                                {encounter.detox_referral && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Detox</span>}
                                {encounter.fentanyl_test_strips_count && encounter.fentanyl_test_strips_count > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">{encounter.fentanyl_test_strips_count} strips</span>}
                                {encounter.transportation_provided && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Transport</span>}
                                {encounter.co_occurring_mh_sud && <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded">Co-occurring</span>}
                                {encounter.placement_made && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Placement</span>}
                              </div>
                              <p className="text-xs text-green-600 mt-2">Click to view full details →</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No encounters in this date range.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Naloxone Details */}
              {detailModalType === 'naloxone' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-2 border-red-200 mb-6">
                    <p className="text-sm text-gray-600 font-medium">Total Naloxone Distributed</p>
                    <p className="text-4xl font-bold text-red-600 mt-1">{generatedReport.metrics.naloxoneDistributed}</p>
                    <p className="text-xs text-gray-500 mt-2">Kits given out in this date range</p>
                  </div>

                  {(() => {
                    const naloxoneEncounters = generatedReport.filteredEncounters.filter(e => e.naloxone_distributed)
                    return naloxoneEncounters.length > 0 ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h5 className="font-semibold text-red-700 text-lg mb-3">Distribution Details</h5>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {naloxoneEncounters.map((encounter, index) => {
                            const person = persons.find(p => p.id === encounter.person_id)
                            return (
                              <div key={index} className="bg-white rounded-lg p-3 border border-red-100 shadow-sm flex justify-between items-center">
                                <div>
                                  <p className="font-semibold text-gray-900">{person?.first_name} {person?.last_name}</p>
                                  <p className="text-sm text-gray-500">{encounter.outreach_location}</p>
                                </div>
                                <div className="text-right text-sm">
                                  <p className="text-gray-600">{new Date(encounter.service_date).toLocaleDateString()}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No naloxone distributed in this date range.</p>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Fentanyl Strips Details */}
              {detailModalType === 'fentanylStrips' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border-2 border-yellow-200 mb-6">
                    <p className="text-sm text-gray-600 font-medium">Total Fentanyl Test Strips</p>
                    <p className="text-4xl font-bold text-yellow-600 mt-1">{generatedReport.metrics.fentanylTestStrips}</p>
                    <p className="text-xs text-gray-500 mt-2">Strips distributed in this date range</p>
                  </div>

                  {(() => {
                    const stripEncounters = generatedReport.filteredEncounters.filter(e => e.fentanyl_test_strips_count && e.fentanyl_test_strips_count > 0)
                    return stripEncounters.length > 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h5 className="font-semibold text-yellow-700 text-lg mb-3">Distribution Details</h5>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {stripEncounters.map((encounter, index) => {
                            const person = persons.find(p => p.id === encounter.person_id)
                            return (
                              <div key={index} className="bg-white rounded-lg p-3 border border-yellow-100 shadow-sm flex justify-between items-center">
                                <div>
                                  <p className="font-semibold text-gray-900">{person?.first_name} {person?.last_name}</p>
                                  <p className="text-sm text-gray-500">{encounter.outreach_location}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-yellow-600">{encounter.fentanyl_test_strips_count}</p>
                                  <p className="text-xs text-gray-500">{new Date(encounter.service_date).toLocaleDateString()}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No fentanyl test strips distributed in this date range.</p>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Referrals Details */}
              {detailModalType === 'referrals' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-200 mb-6">
                    <p className="text-sm text-gray-600 font-medium">Total Referrals</p>
                    <p className="text-4xl font-bold text-purple-600 mt-1">{generatedReport.metrics.totalReferrals}</p>
                    <p className="text-xs text-gray-500 mt-2">MAT: {generatedReport.metrics.matReferrals}, Detox: {generatedReport.metrics.detoxReferrals}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* MAT Referrals */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h5 className="font-semibold text-purple-700 text-lg mb-3">MAT Referrals ({generatedReport.metrics.matReferrals})</h5>
                      {Object.keys(generatedReport.breakdowns.matByProvider).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(generatedReport.breakdowns.matByProvider)
                            .sort(([, a], [, b]) => b - a)
                            .map(([provider, count]) => (
                              <div key={provider} className="bg-white rounded-lg p-2 border border-purple-100 flex justify-between items-center">
                                <span className="text-gray-700">{provider}</span>
                                <span className="font-bold text-purple-600">{count}</span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm italic">No MAT referrals</p>
                      )}
                    </div>

                    {/* Detox Referrals */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-semibold text-red-700 text-lg mb-3">Detox Referrals ({generatedReport.metrics.detoxReferrals})</h5>
                      {Object.keys(generatedReport.breakdowns.detoxByProvider).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(generatedReport.breakdowns.detoxByProvider)
                            .sort(([, a], [, b]) => b - a)
                            .map(([provider, count]) => (
                              <div key={provider} className="bg-white rounded-lg p-2 border border-red-100 flex justify-between items-center">
                                <span className="text-gray-700">{provider}</span>
                                <span className="font-bold text-red-600">{count}</span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm italic">No detox referrals</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {detailModalType === 'programExits' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-2 border-orange-200 mb-6">
                    <p className="text-sm text-gray-600 font-medium">Total Program Exits</p>
                    <p className="text-4xl font-bold text-orange-600 mt-1">{generatedReport.metrics.programExits}</p>
                  </div>

                  {Object.entries(generatedReport.breakdowns.exitsByCategory).map(([category, data]) => {
                    const categoryColors: Record<string, { bg: string, text: string, border: string }> = {
                      'Permanent Housing': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
                      'Temporary Housing': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
                      'Institutional Settings': { bg: 'bg-gold-50', text: 'text-gold-700', border: 'border-gold-200' },
                      'Homeless Situations': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                      'Other': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
                    }
                    const colors = categoryColors[category] || categoryColors['Other']

                    return (
                      <div key={category} className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
                        <div className="flex justify-between items-center mb-3">
                          <h5 className={`font-semibold ${colors.text} text-lg`}>{category}</h5>
                          <span className={`${colors.text} font-bold text-2xl`}>{data.total}</span>
                        </div>
                        <div className="space-y-2 pl-4">
                          {Object.entries(data.destinations).map(([destination, count]) => (
                            <div key={destination} className="flex justify-between items-center">
                              <span className="text-gray-700">{destination}</span>
                              <span className="font-semibold text-gray-900 text-lg">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {detailModalType === 'housingPlacements' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4 border-2 border-teal-200 mb-6">
                    <p className="text-sm text-gray-600 font-medium">Total Housing Placements</p>
                    <p className="text-4xl font-bold text-teal-600 mt-1">{generatedReport.metrics.housingPlacements}</p>
                    <p className="text-xs text-gray-500 mt-2">Exits to permanent housing destinations</p>
                  </div>

                  {generatedReport.breakdowns.exitsByCategory['Permanent Housing'] && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="font-semibold text-green-700 text-lg mb-3">Permanent Housing Destinations</h5>
                      <div className="space-y-2 pl-4">
                        {Object.entries(generatedReport.breakdowns.exitsByCategory['Permanent Housing'].destinations).map(([destination, count]) => (
                          <div key={destination} className="flex justify-between items-center">
                            <span className="text-gray-700">{destination}</span>
                            <span className="font-semibold text-gray-900 text-lg">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {detailModalType === 'returnedToActive' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border-2 border-emerald-200 mb-6">
                    <p className="text-sm text-gray-600 font-medium">Total Returned to Active</p>
                    <p className="text-4xl font-bold text-emerald-600 mt-1">{generatedReport.metrics.returnedToActive}</p>
                    <p className="text-xs text-gray-500 mt-2">Previously exited clients who returned to active status</p>
                  </div>

                  {generatedReport.breakdowns.returnedToActiveDetails.length > 0 ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <h5 className="font-semibold text-emerald-700 text-lg mb-3">Clients Who Returned</h5>
                      <div className="space-y-3">
                        {generatedReport.breakdowns.returnedToActiveDetails.map((detail, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-emerald-100 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-gray-900">{detail.person_name}</p>
                                <p className="text-sm text-gray-500">ID: {detail.client_id}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-emerald-600">
                                  Returned: {new Date(detail.return_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {detail.notes && (
                              <p className="text-sm text-gray-600 mt-2 italic">&quot;{detail.notes}&quot;</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No clients returned to active in this date range.</p>
                    </div>
                  )}
                </div>
              )}

              {detailModalType === 'placements' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200 mb-6">
                    <p className="text-sm text-gray-600 font-medium">Total Placements</p>
                    <p className="text-4xl font-bold text-green-600 mt-1">{generatedReport.metrics.placementsMade}</p>
                    <p className="text-xs text-gray-500 mt-2">Placements made to programs/shelters in this date range</p>
                  </div>

                  {Object.keys(generatedReport.breakdowns.placementsByLocation).length > 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h5 className="font-semibold text-green-700 text-lg mb-3">Placements by Location</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(generatedReport.breakdowns.placementsByLocation)
                          .sort(([, a], [, b]) => b - a)
                          .map(([location, count]) => (
                            <div key={location} className="flex justify-between items-center bg-white px-4 py-3 rounded-lg border border-green-100 shadow-sm">
                              <span className="text-gray-700 font-medium">{location}</span>
                              <span className="font-bold text-green-600 text-lg">{count}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No placements recorded in this date range.</p>
                    </div>
                  )}
                </div>
              )}

              {detailModalType === 'refusedShelter' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-2 border-red-200 mb-6">
                    <p className="text-sm text-gray-600 font-medium">Total Refused Shelter</p>
                    <p className="text-4xl font-bold text-red-600 mt-1">{generatedReport.metrics.refusedShelter}</p>
                    <p className="text-xs text-gray-500 mt-2">Clients who declined shelter placement in this date range</p>
                  </div>

                  {generatedReport.filteredEncounters.filter(e => e.refused_shelter).length > 0 ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-semibold text-red-700 text-lg mb-3">Refused Shelter Encounters</h5>
                      <div className="space-y-3">
                        {generatedReport.filteredEncounters
                          .filter(e => e.refused_shelter)
                          .map((encounter, index) => {
                            const person = generatedReport.filteredPersons.find(p => p.id === encounter.person_id)
                            return (
                              <div key={index} className="bg-white rounded-lg p-3 border border-red-100 shadow-sm">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {person ? `${person.first_name} ${person.last_name}` : 'Unknown'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {new Date(encounter.service_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="text-right text-sm text-gray-500">
                                    <p>{encounter.outreach_location}</p>
                                    <p>{encounter.outreach_worker}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No refused shelter encounters in this date range.</p>
                    </div>
                  )}
                </div>
              )}

              {detailModalType === 'highUtilizers' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border-2 border-yellow-200 mb-6">
                    <p className="text-sm text-gray-600 font-medium">Total High Utilizers</p>
                    <p className="text-4xl font-bold text-yellow-600 mt-1">{generatedReport.metrics.highUtilizerContacts}</p>
                    <p className="text-xs text-gray-500 mt-2">Unique individuals flagged as high utilizers in this date range</p>
                  </div>

                  {generatedReport.breakdowns.highUtilizerDetails.length > 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-semibold text-yellow-700 text-lg mb-3">High Utilizer List</h5>
                      <div className="space-y-3">
                        {generatedReport.breakdowns.highUtilizerDetails.map((detail, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 border border-yellow-100 shadow-sm">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-gray-900">{detail.person_name}</p>
                                <p className="text-sm text-gray-500">ID: {detail.client_id}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-yellow-600">{detail.encounter_count}</p>
                                <p className="text-xs text-gray-500">encounters</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No high utilizers in this date range.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Encounter Detail Modal */}
      {showEncounterModal && selectedEncounter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
              <div>
                <h4 className="text-xl font-bold">Service Interaction Details</h4>
                <p className="text-green-100 text-sm">{new Date(selectedEncounter.service_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <button
                onClick={() => {
                  setShowEncounterModal(false)
                  setSelectedEncounter(null)
                }}
                className="text-white hover:text-green-200 transition-colors p-2 rounded-full hover:bg-green-500"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Client Info */}
              {(() => {
                const person = persons.find(p => p.id === selectedEncounter.person_id)
                return person && (
                  <div className="bg-gold-50 border border-gold-200 rounded-lg p-4">
                    <h5 className="font-semibold text-gold-700 mb-2">Client Information</h5>
                    <p className="text-lg font-bold text-gray-900">{person.first_name} {person.last_name}</p>
                    <p className="text-sm text-gray-600">ID: {person.client_id}</p>
                  </div>
                )
              })()}

              {/* Basic Encounter Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-semibold text-gray-900">{selectedEncounter.outreach_location}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Outreach Worker</p>
                  <p className="font-semibold text-gray-900">{selectedEncounter.outreach_worker}</p>
                </div>
              </div>

              {/* Harm Reduction Services */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h5 className="font-semibold text-red-700 mb-3">Harm Reduction</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Naloxone Distributed</span>
                    <span className={`font-bold ${selectedEncounter.naloxone_distributed ? 'text-green-600' : 'text-gray-400'}`}>
                      {selectedEncounter.naloxone_distributed ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Fentanyl Test Strips</span>
                    <span className={`font-bold ${selectedEncounter.fentanyl_test_strips_count ? 'text-yellow-600' : 'text-gray-400'}`}>
                      {selectedEncounter.fentanyl_test_strips_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Harm Reduction Education</span>
                    <span className={`font-bold ${selectedEncounter.harm_reduction_education ? 'text-green-600' : 'text-gray-400'}`}>
                      {selectedEncounter.harm_reduction_education ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Referrals */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h5 className="font-semibold text-purple-700 mb-3">Referrals</h5>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">MAT Referral</span>
                    <span className={`font-bold ${selectedEncounter.mat_referral ? 'text-green-600' : 'text-gray-400'}`}>
                      {selectedEncounter.mat_referral ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  {selectedEncounter.mat_referral && selectedEncounter.mat_provider && (
                    <div className="ml-4 bg-white rounded p-2">
                      <p className="text-sm text-gray-500">Provider</p>
                      <p className="font-semibold text-purple-700">{selectedEncounter.mat_provider}</p>
                      {selectedEncounter.mat_type && <p className="text-sm text-gray-600">Type: {selectedEncounter.mat_type}</p>}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Detox Referral</span>
                    <span className={`font-bold ${selectedEncounter.detox_referral ? 'text-green-600' : 'text-gray-400'}`}>
                      {selectedEncounter.detox_referral ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  {selectedEncounter.detox_referral && selectedEncounter.detox_provider && (
                    <div className="ml-4 bg-white rounded p-2">
                      <p className="text-sm text-gray-500">Provider</p>
                      <p className="font-semibold text-orange-700">{selectedEncounter.detox_provider}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Placement */}
              {selectedEncounter.placement_made && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-semibold text-green-700 mb-3">🏠 Placement Made</h5>
                  <p className="font-bold text-green-800 text-lg">
                    {selectedEncounter.placement_location === 'Other'
                      ? selectedEncounter.placement_location_other
                      : selectedEncounter.placement_location}
                  </p>
                </div>
              )}

              {/* Co-Occurring Conditions */}
              {selectedEncounter.co_occurring_mh_sud && (
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                  <h5 className="font-semibold text-pink-700 mb-2">Co-Occurring MH/SUD</h5>
                  <p className="text-gray-700">{selectedEncounter.co_occurring_type || 'Type not specified'}</p>
                </div>
              )}

              {/* Other Services */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h5 className="font-semibold text-indigo-700 mb-3">Other Services</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Transportation</span>
                    <span className={`font-bold ${selectedEncounter.transportation_provided ? 'text-green-600' : 'text-gray-400'}`}>
                      {selectedEncounter.transportation_provided ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Shower Trailer</span>
                    <span className={`font-bold ${selectedEncounter.shower_trailer ? 'text-green-600' : 'text-gray-400'}`}>
                      {selectedEncounter.shower_trailer ? '✓ Yes' : '✗ No'}
                    </span>
                  </div>
                </div>
                {selectedEncounter.other_services && (
                  <div className="mt-3 bg-white rounded p-2">
                    <p className="text-sm text-gray-500">Other Services Provided</p>
                    <p className="text-gray-700">{selectedEncounter.other_services}</p>
                  </div>
                )}
              </div>

              {/* Case Management Notes */}
              {selectedEncounter.case_management_notes && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h5 className="font-semibold text-gray-700 mb-2">Case Management Notes</h5>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedEncounter.case_management_notes}</p>
                </div>
              )}

              {/* High Utilizer Flag */}
              {selectedEncounter.high_utilizer_contact && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <p className="font-bold text-yellow-700">⚠️ High Utilizer Contact</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  setShowEncounterModal(false)
                  setSelectedEncounter(null)
                }}
                className="w-full py-2 px-4 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Client Detail Modal */}
      {showClientModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-charcoal-950 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
              <div>
                <h4 className="text-xl font-bold text-gold-400">{selectedClient.first_name} {selectedClient.last_name}</h4>
                <p className="text-charcoal-300 text-sm">Client ID: {selectedClient.client_id}</p>
              </div>
              <button
                onClick={() => {
                  setShowClientModal(false)
                  setSelectedClient(null)
                }}
                className="text-white hover:text-gold-400 transition-colors p-2 rounded-full hover:bg-charcoal-800"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {selectedClient.veteran_status && (
                  <span className="px-3 py-1 bg-gold-100 text-gold-800 rounded-full text-sm font-medium">🎖️ Veteran</span>
                )}
                {selectedClient.chronic_homeless && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">⚠️ Chronically Homeless</span>
                )}
                {selectedClient.disability_status && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">♿ Has Disability</span>
                )}
                {selectedClient.exit_date && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">🚪 Exited Program</span>
                )}
              </div>

              {/* Enrollment Info */}
              <div className="bg-gradient-to-br from-gold-50 to-gold-100 rounded-lg p-4 border-2 border-gold-200">
                <h5 className="font-semibold text-gold-700 mb-3">📅 Enrollment Information</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Date Entered</p>
                    <p className="font-semibold text-gray-900">{new Date(selectedClient.enrollment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Referral Source</p>
                    <p className="font-semibold text-gray-900">{selectedClient.referral_source || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Case Manager</p>
                    <p className="font-semibold text-gray-900">{selectedClient.case_manager || 'Not assigned'}</p>
                  </div>
                </div>
              </div>

              {/* Demographics */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h5 className="font-semibold text-gray-700 mb-3">👤 Demographics</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="font-semibold text-gray-900">{new Date(selectedClient.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Age</p>
                    <p className="font-semibold text-gray-900">
                      {(() => {
                        const birthDate = new Date(selectedClient.date_of_birth)
                        const today = new Date()
                        let age = today.getFullYear() - birthDate.getFullYear()
                        const monthDiff = today.getMonth() - birthDate.getMonth()
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                          age--
                        }
                        return age
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Gender</p>
                    <p className="font-semibold text-gray-900">{selectedClient.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Race</p>
                    <p className="font-semibold text-gray-900">{selectedClient.race}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ethnicity</p>
                    <p className="font-semibold text-gray-900">{selectedClient.ethnicity}</p>
                  </div>
                  {selectedClient.sexual_orientation && (
                    <div>
                      <p className="text-sm text-gray-500">Sexual Orientation</p>
                      <p className="font-semibold text-gray-900">{selectedClient.sexual_orientation}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Housing Status */}
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <h5 className="font-semibold text-yellow-700 mb-3">🏠 Housing Status</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Living Situation</p>
                    <p className="font-semibold text-gray-900">{selectedClient.living_situation}</p>
                  </div>
                  {selectedClient.length_of_time_homeless && (
                    <div>
                      <p className="text-sm text-gray-500">Time Homeless</p>
                      <p className="font-semibold text-gray-900">{selectedClient.length_of_time_homeless}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Disability Info */}
              {selectedClient.disability_status && selectedClient.disability_type && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h5 className="font-semibold text-purple-700 mb-3">♿ Disability Information</h5>
                  <p className="font-semibold text-gray-900">{selectedClient.disability_type}</p>
                </div>
              )}

              {/* Exit Information */}
              {selectedClient.exit_date && (
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                  <h5 className="font-semibold text-red-700 mb-3">🚪 Exit Information</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Exit Date</p>
                      <p className="font-semibold text-gray-900">{new Date(selectedClient.exit_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Exit Destination</p>
                      <p className="font-semibold text-gray-900">{selectedClient.exit_destination || 'Not specified'}</p>
                    </div>
                  </div>
                  {selectedClient.exit_notes && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedClient.exit_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Service Interaction History */}
              {(() => {
                const clientEncounters = encounters
                  .filter(e => e.person_id === selectedClient.id)
                  .sort((a, b) => new Date(b.service_date).getTime() - new Date(a.service_date).getTime())

                return (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h5 className="font-semibold text-green-700 mb-3">📋 Service Interaction History ({clientEncounters.length} total)</h5>
                    {clientEncounters.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {clientEncounters.map((encounter, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              setSelectedEncounter(encounter)
                              setShowEncounterModal(true)
                            }}
                            className="bg-white rounded-lg p-3 border border-green-100 shadow-sm cursor-pointer hover:bg-green-50 hover:border-green-300 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-gray-900">{new Date(encounter.service_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                <p className="text-sm text-gray-500">{encounter.outreach_location}</p>
                                <p className="text-xs text-gray-400">Worker: {encounter.outreach_worker}</p>
                              </div>
                              <div className="text-right">
                                <div className="flex gap-1 flex-wrap justify-end">
                                  {encounter.naloxone_distributed && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Naloxone</span>}
                                  {encounter.mat_referral && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">MAT</span>}
                                  {encounter.detox_referral && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Detox</span>}
                                  {encounter.placement_made && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Placement</span>}
                                  {encounter.transportation_provided && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Transport</span>}
                                  {encounter.high_utilizer_contact && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">High Utilizer</span>}
                                </div>
                                <p className="text-xs text-green-600 mt-1">Click for details →</p>
                              </div>
                            </div>
                            {encounter.case_management_notes && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{encounter.case_management_notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No service interactions recorded</p>
                    )}
                  </div>
                )
              })()}

              {/* Summary Stats */}
              {(() => {
                const clientEncounters = encounters.filter(e => e.person_id === selectedClient.id)
                const naloxoneCount = clientEncounters.filter(e => e.naloxone_distributed).length
                const matReferrals = clientEncounters.filter(e => e.mat_referral).length
                const detoxReferrals = clientEncounters.filter(e => e.detox_referral).length
                const placements = clientEncounters.filter(e => e.placement_made).length
                const fentanylStrips = clientEncounters.reduce((sum, e) => sum + (e.fentanyl_test_strips_count || 0), 0)

                return (
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                    <h5 className="font-semibold text-indigo-700 mb-3">📊 Client Summary Statistics</h5>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gold-600">{clientEncounters.length}</p>
                        <p className="text-xs text-gray-500">Total Interactions</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{naloxoneCount}</p>
                        <p className="text-xs text-gray-500">Naloxone Given</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-600">{fentanylStrips}</p>
                        <p className="text-xs text-gray-500">Fentanyl Strips</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">{matReferrals}</p>
                        <p className="text-xs text-gray-500">MAT Referrals</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{detoxReferrals}</p>
                        <p className="text-xs text-gray-500">Detox Referrals</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{placements}</p>
                        <p className="text-xs text-gray-500">Placements</p>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  setShowClientModal(false)
                  setSelectedClient(null)
                }}
                className="w-full py-2 px-4 rounded-lg bg-gold-600 text-charcoal-900 font-semibold font-medium hover:bg-gold-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
