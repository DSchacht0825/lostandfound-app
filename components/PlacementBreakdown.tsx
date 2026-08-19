'use client'

import { useState } from 'react'

type EncounterData = {
  service_date: string
  person_id: string
  placement_made?: boolean
  placement_location?: string | null
  placement_location_other?: string | null
}

type PersonData = {
  id: string
  first_name: string
  last_name: string
}

type PlacementBreakdownProps = {
  encounters: EncounterData[]
  persons: PersonData[]
}

type PlacementDetail = {
  personId: string
  personName: string
  serviceDate: string
}

// Normalize location names to combine variations
const normalizeLocation = (location: string): string => {
  const normalized = location.toLowerCase().trim()
  if (normalized === 'ectlc' || normalized.includes('east county transitional')) {
    return 'East County Transitional Living (ECTLC)'
  }
  return location
}

export default function PlacementBreakdown({ encounters, persons }: PlacementBreakdownProps) {
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null)

  // Create a map of person ID to name for quick lookup
  const personMap = new Map(persons.map(p => [p.id, `${p.first_name} ${p.last_name}`]))

  // Group placements by location with client details
  const placementsByLocation = encounters
    .filter(e => e.placement_made)
    .reduce((acc, e) => {
      const rawLocation = e.placement_location === 'Other'
        ? (e.placement_location_other || 'Other')
        : (e.placement_location || 'Unknown')
      const location = normalizeLocation(rawLocation)

      if (!acc[location]) {
        acc[location] = []
      }

      acc[location].push({
        personId: e.person_id,
        personName: personMap.get(e.person_id) || 'Unknown Client',
        serviceDate: e.service_date,
      })

      return acc
    }, {} as Record<string, PlacementDetail[]>)

  const totalPlacements = Object.values(placementsByLocation).reduce((sum, arr) => sum + arr.length, 0)

  const toggleLocation = (location: string) => {
    setExpandedLocation(expandedLocation === location ? null : location)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Placements by Location
        <span className="ml-2 text-sm font-normal text-gray-500">(click to see names)</span>
      </h3>
      <div className="mb-4">
        <p className="text-3xl font-bold text-green-600">{totalPlacements}</p>
        <p className="text-sm text-gray-500">Total placements in this period</p>
      </div>

      {Object.keys(placementsByLocation).length > 0 ? (
        <div className="space-y-3">
          {Object.entries(placementsByLocation)
            .sort(([, a], [, b]) => b.length - a.length)
            .map(([location, placements]) => (
              <div key={location} className="border border-green-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleLocation(location)}
                  className="w-full flex justify-between items-center bg-green-50 px-4 py-3 hover:bg-green-100 transition-colors text-left"
                >
                  <span className="text-gray-700 font-medium">{location}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-600 text-lg">{placements.length}</span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${expandedLocation === location ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandedLocation === location && (
                  <div className="bg-white px-4 py-3 border-t border-green-200">
                    <ul className="space-y-2">
                      {placements
                        .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())
                        .map((placement, idx) => (
                          <li key={`${placement.personId}-${idx}`} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                            <span className="font-medium text-gray-800">{placement.personName}</span>
                            <span className="text-sm text-gray-500">{formatDate(placement.serviceDate)}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm italic">No placements recorded in this period</p>
      )}
    </div>
  )
}
