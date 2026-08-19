'use client'

import MetricCard from './MetricCard'

interface Person {
  id: string
  client_id: string
  first_name: string
  last_name: string
  gender: string
  race: string
  veteran_status: boolean
  chronic_homeless: boolean
  exit_date?: string | null
  exit_destination?: string | null
}

interface Encounter {
  id?: string
  service_date: string
  person_id: string
  outreach_location: string
  outreach_worker: string
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
  transportation_provided: boolean
  placement_made?: boolean
  placement_location?: string | null
}

interface MetricsGridProps {
  metrics: {
    unduplicatedIndividuals: number
    totalInteractions: number
    naloxoneDistributed: number
    matDetoxReferrals: number
    coOccurringConditions: number
    fentanylTestStrips: number
    transportationProvided: number
    exitsFromHomelessness: number
  }
  persons: Person[]
  encounters: Encounter[]
  demographics: {
    byGender: Record<string, number>
    byRace: Record<string, number>
  }
}

export default function MetricsGrid({ metrics, persons, encounters, demographics }: MetricsGridProps) {
  // Build detail items for each metric
  const clientDetails = persons.map(p => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    details: `${p.gender} | ${p.race}${p.veteran_status ? ' | Veteran' : ''}${p.chronic_homeless ? ' | Chronically Homeless' : ''}`,
  }))

  const interactionDetails = encounters.map(e => ({
    id: e.id || e.person_id + e.service_date,
    name: persons.find(p => p.id === e.person_id)?.first_name + ' ' + persons.find(p => p.id === e.person_id)?.last_name || 'Unknown',
    date: new Date(e.service_date).toLocaleDateString(),
    location: e.outreach_location,
    details: `Worker: ${e.outreach_worker}`,
  }))

  const naloxoneDetails = encounters
    .filter(e => e.naloxone_distributed)
    .map(e => ({
      id: e.id || e.person_id + e.service_date,
      name: persons.find(p => p.id === e.person_id)?.first_name + ' ' + persons.find(p => p.id === e.person_id)?.last_name || 'Unknown',
      date: e.naloxone_date ? new Date(e.naloxone_date).toLocaleDateString() : new Date(e.service_date).toLocaleDateString(),
      location: e.outreach_location,
    }))

  const referralDetails = encounters
    .filter(e => e.mat_referral || e.detox_referral)
    .map(e => ({
      id: e.id || e.person_id + e.service_date,
      name: persons.find(p => p.id === e.person_id)?.first_name + ' ' + persons.find(p => p.id === e.person_id)?.last_name || 'Unknown',
      date: new Date(e.service_date).toLocaleDateString(),
      details: [
        e.mat_referral ? `MAT: ${e.mat_provider || 'Provider not specified'}` : '',
        e.detox_referral ? `Detox: ${e.detox_provider || 'Provider not specified'}` : '',
      ].filter(Boolean).join(' | '),
    }))

  // Breakdown for referrals by provider
  const referralBreakdown: Record<string, number> = {}
  encounters.forEach(e => {
    if (e.mat_referral && e.mat_provider) {
      referralBreakdown[`MAT - ${e.mat_provider}`] = (referralBreakdown[`MAT - ${e.mat_provider}`] || 0) + 1
    }
    if (e.detox_referral && e.detox_provider) {
      referralBreakdown[`Detox - ${e.detox_provider}`] = (referralBreakdown[`Detox - ${e.detox_provider}`] || 0) + 1
    }
  })

  const coOccurringDetails = encounters
    .filter(e => e.co_occurring_mh_sud)
    .map(e => ({
      id: e.id || e.person_id + e.service_date,
      name: persons.find(p => p.id === e.person_id)?.first_name + ' ' + persons.find(p => p.id === e.person_id)?.last_name || 'Unknown',
      date: new Date(e.service_date).toLocaleDateString(),
      details: e.co_occurring_type || 'Type not specified',
    }))

  // Breakdown for co-occurring by type
  const coOccurringBreakdown: Record<string, number> = {}
  encounters.filter(e => e.co_occurring_mh_sud).forEach(e => {
    const type = e.co_occurring_type || 'Not specified'
    coOccurringBreakdown[type] = (coOccurringBreakdown[type] || 0) + 1
  })

  // Fentanyl strips by encounter
  const fentanylDetails = encounters
    .filter(e => e.fentanyl_test_strips_count && e.fentanyl_test_strips_count > 0)
    .map(e => ({
      id: e.id || e.person_id + e.service_date,
      name: persons.find(p => p.id === e.person_id)?.first_name + ' ' + persons.find(p => p.id === e.person_id)?.last_name || 'Unknown',
      date: new Date(e.service_date).toLocaleDateString(),
      details: `${e.fentanyl_test_strips_count} strips distributed`,
    }))

  const transportationDetails = encounters
    .filter(e => e.transportation_provided)
    .map(e => ({
      id: e.id || e.person_id + e.service_date,
      name: persons.find(p => p.id === e.person_id)?.first_name + ' ' + persons.find(p => p.id === e.person_id)?.last_name || 'Unknown',
      date: new Date(e.service_date).toLocaleDateString(),
      location: e.outreach_location,
    }))

  const exitsDetails = encounters
    .filter(e => e.placement_made)
    .map(e => ({
      id: e.id || e.person_id + e.service_date,
      name: persons.find(p => p.id === e.person_id)?.first_name + ' ' + persons.find(p => p.id === e.person_id)?.last_name || 'Unknown',
      date: new Date(e.service_date).toLocaleDateString(),
      details: e.placement_location || 'Placement',
    }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <MetricCard
        title="Unduplicated Clients"
        value={metrics.unduplicatedIndividuals}
        color="blue"
        detailItems={clientDetails}
        detailTitle="Clients Served"
        breakdown={demographics.byGender}
        icon={
          <svg className="w-8 h-8 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      />

      <MetricCard
        title="Total Interactions"
        value={metrics.totalInteractions}
        color="green"
        detailItems={interactionDetails}
        detailTitle="Service Interactions"
        icon={
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />

      <MetricCard
        title="Naloxone Distributed"
        value={metrics.naloxoneDistributed}
        color="red"
        detailItems={naloxoneDetails}
        detailTitle="Naloxone Distribution"
        icon={
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        }
      />

      <MetricCard
        title="MAT/Detox Referrals"
        value={metrics.matDetoxReferrals}
        color="purple"
        detailItems={referralDetails}
        detailTitle="Referrals"
        breakdown={referralBreakdown}
        icon={
          <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        }
      />

      <MetricCard
        title="Co-Occurring Conditions"
        value={metrics.coOccurringConditions}
        color="orange"
        detailItems={coOccurringDetails}
        detailTitle="Co-Occurring MH/SUD"
        breakdown={coOccurringBreakdown}
        icon={
          <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        }
      />

      <MetricCard
        title="Fentanyl Test Strips"
        value={metrics.fentanylTestStrips}
        color="yellow"
        detailItems={fentanylDetails}
        detailTitle="Fentanyl Test Strips Distributed"
        icon={
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        }
      />

      <MetricCard
        title="Transportation Provided"
        value={metrics.transportationProvided}
        color="indigo"
        detailItems={transportationDetails}
        detailTitle="Transportation Services"
        icon={
          <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      />

      <MetricCard
        title="Exits from Homelessness"
        value={metrics.exitsFromHomelessness}
        color="teal"
        detailItems={exitsDetails}
        detailTitle="Exits (Placements Made)"
        icon={
          <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        }
      />
    </div>
  )
}
