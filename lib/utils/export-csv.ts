// Database types
interface Person {
  client_id: string
  first_name: string
  last_name: string
  nickname?: string | null
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
}

interface Encounter {
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
  case_management_notes?: string | null
}

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) {
    alert('No data to export')
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        // Escape values that contain commas, quotes, or newlines
        if (value === null || value === undefined) {
          return ''
        }
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function formatDataForExport(
  persons: Person[],
  encounters: Encounter[],
  startDate?: string | null,
  endDate?: string | null
) {
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

  // Format persons data
  const personsExport = persons.map(p => ({
    'Client ID': p.client_id,
    'First Name': p.first_name,
    'Last Name': p.last_name,
    'Nickname': p.nickname || '',
    'Age': calculateAge(p.date_of_birth),
    'Date of Birth': p.date_of_birth,
    'Gender': p.gender,
    'Race': p.race,
    'Ethnicity': p.ethnicity,
    'Living Situation': p.living_situation,
    'Length Homeless': p.length_of_time_homeless || '',
    'Veteran': p.veteran_status ? 'Yes' : 'No',
    'Chronic Homeless': p.chronic_homeless ? 'Yes' : 'No',
    'Enrollment Date': p.enrollment_date,
    'Case Manager': p.case_manager || '',
    'Referral Source': p.referral_source || '',
  }))

  // Format encounters data
  const encountersExport = encounters.map(e => ({
    'Service Date': e.service_date,
    'Client ID': e.person_id,
    'Location': e.outreach_location,
    'Latitude': e.latitude,
    'Longitude': e.longitude,
    'Outreach Worker': e.outreach_worker,
    'Language Preference': e.language_preference || '',
    'Co-Occurring MH/SUD': e.co_occurring_mh_sud ? 'Yes' : 'No',
    'Co-Occurring Type': e.co_occurring_type || '',
    'MAT Referral': e.mat_referral ? 'Yes' : 'No',
    'MAT Type': e.mat_type || '',
    'MAT Provider': e.mat_provider || '',
    'Detox Referral': e.detox_referral ? 'Yes' : 'No',
    'Detox Provider': e.detox_provider || '',
    'Naloxone Distributed': e.naloxone_distributed ? 'Yes' : 'No',
    'Naloxone Date': e.naloxone_date || '',
    'Fentanyl Test Strips': e.fentanyl_test_strips_count || '0',
    'Harm Reduction Education': e.harm_reduction_education ? 'Yes' : 'No',
    'Transportation': e.transportation_provided ? 'Yes' : 'No',
    'Shower Trailer': e.shower_trailer ? 'Yes' : 'No',
    'Other Services': e.other_services || '',
    'Case Notes': e.case_management_notes || '',
  }))

  // Create summary metrics
  const metrics = {
    'Report Generated': new Date().toISOString(),
    'Date Range Start': startDate || 'All time',
    'Date Range End': endDate || 'All time',
    'Total Clients': persons.length,
    'Total Interactions': encounters.length,
    'Naloxone Distributed': encounters.filter(e => e.naloxone_distributed).length,
    'MAT Referrals': encounters.filter(e => e.mat_referral).length,
    'Detox Referrals': encounters.filter(e => e.detox_referral).length,
    'Co-Occurring Conditions': encounters.filter(e => e.co_occurring_mh_sud).length,
    'Transportation Provided': encounters.filter(e => e.transportation_provided).length,
    'Shower Trailer Services': encounters.filter(e => e.shower_trailer).length,
    'Veterans': persons.filter(p => p.veteran_status).length,
    'Chronically Homeless': persons.filter(p => p.chronic_homeless).length,
  }

  return {
    personsExport,
    encountersExport,
    metrics: [metrics], // Wrap in array for CSV export
  }
}
