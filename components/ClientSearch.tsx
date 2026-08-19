'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fuzzySearchPersons } from '@/lib/utils/duplicate-detection'
import { format } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image'

interface Person {
  id: string
  client_id: string
  first_name: string
  last_name: string
  nickname: string | null
  date_of_birth: string
  photo_url: string | null
  phone_number: string | null
  exit_date?: string | null
  exit_destination?: string | null
  last_encounter?: {
    service_date: string
    outreach_location: string
    case_management_notes: string | null
  }
  case_notes?: string[] // All case management notes from encounters
}

// Helper function to calculate age from date of birth
function calculateAge(dob: string): number {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export default function ClientSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [allPersons, setAllPersons] = useState<Person[]>([])
  const [filteredPersons, setFilteredPersons] = useState<Person[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [showExitedOnly, setShowExitedOnly] = useState(false)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)

  // Load all persons on component mount
  useEffect(() => {
    loadPersons()
  }, [])

  // Filter persons when search term or exit filter changes
  useEffect(() => {
    // First apply exit filter
    const baseList = showExitedOnly
      ? allPersons.filter(p => p.exit_date !== null && p.exit_date !== undefined)
      : allPersons

    if (!searchTerm || searchTerm.trim() === '') {
      setFilteredPersons(baseList.slice(0, 20)) // Show first 20 by default
      setIsSearching(false)
    } else {
      setIsSearching(true)
      const results = fuzzySearchPersons(searchTerm, baseList)
      setFilteredPersons(results.slice(0, 20))
      setIsSearching(false)
    }
  }, [searchTerm, allPersons, showExitedOnly])

  const loadPersons = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      // Get all persons with their encounters including case notes
      const { data: persons, error } = await supabase
        .from('persons')
        .select(`
          id,
          client_id,
          first_name,
          last_name,
          nickname,
          date_of_birth,
          photo_url,
          phone_number,
          exit_date,
          exit_destination,
          encounters (
            service_date,
            outreach_location,
            case_management_notes
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process the data to include only the most recent encounter and all case notes
      const processedPersons = persons?.map((person: {
        id: string
        client_id: string
        first_name: string
        last_name: string
        nickname: string | null
        date_of_birth: string
        photo_url: string | null
        phone_number: string | null
        exit_date?: string | null
        exit_destination?: string | null
        encounters?: Array<{ service_date: string; outreach_location: string; case_management_notes: string | null }>
      }) => {
        // Sort encounters by date (most recent first)
        const sortedEncounters = person.encounters?.sort((a, b) =>
          new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
        ) || []

        // Collect all non-empty case notes
        const caseNotes = sortedEncounters
          .filter(e => e.case_management_notes && e.case_management_notes.trim())
          .map(e => `${format(new Date(e.service_date), 'MM/dd/yyyy')}: ${e.case_management_notes}`)

        return {
          ...person,
          last_encounter: sortedEncounters.length > 0 ? sortedEncounters[0] : undefined,
          case_notes: caseNotes,
          encounters: undefined, // Remove the full encounters array
        }
      }) || []

      setAllPersons(processedPersons)
      setFilteredPersons(processedPersons.slice(0, 20))
    } catch (error) {
      console.error('Error loading persons:', error)
      alert('Error loading clients. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, nickname, or client ID..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 text-lg"
          autoFocus
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <svg
              className="h-5 w-5 text-gray-400 hover:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowExitedOnly(!showExitedOnly)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showExitedOnly
              ? 'bg-amber-100 text-amber-800 border-2 border-amber-300'
              : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
          }`}
        >
          <span className="inline-flex items-center">
            {showExitedOnly ? (
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
            {showExitedOnly ? 'Showing Exited Only' : 'Show Exited Clients'}
          </span>
        </button>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          {isLoading
            ? 'Loading...'
            : isSearching
            ? 'Searching...'
            : showExitedOnly
            ? `Showing ${filteredPersons.length} exited clients`
            : `Showing ${filteredPersons.length} of ${allPersons.length} clients`}
        </span>
        <Link
          href="/client/new"
          className="text-gold-600 hover:text-gold-700 font-medium"
        >
          + New Client
        </Link>
      </div>

      {/* Results List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      ) : filteredPersons.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="mt-4 text-gray-600 font-medium">No clients found</p>
          <p className="text-sm text-gray-500 mt-1">
            {searchTerm
              ? 'Try a different search term'
              : 'Get started by adding a new client'}
          </p>
          <Link
            href="/client/new"
            className="inline-block mt-4 px-4 py-2 bg-gold-600 text-charcoal-900 font-semibold rounded-lg hover:bg-gold-500 transition-colors"
          >
            Add New Client
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPersons.map((person) => (
            <div
              key={person.id}
              className={`border rounded-lg overflow-hidden transition-all ${
                person.exit_date
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-white border-gray-200'
              } ${expandedClient === person.id ? 'shadow-lg ring-2 ring-gold-500' : 'hover:shadow-md'}`}
            >
              {/* Clickable header to expand/collapse */}
              <button
                onClick={() => setExpandedClient(expandedClient === person.id ? null : person.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start gap-4">
                  {/* Client Photo */}
                  <div className="flex-shrink-0">
                    {person.photo_url ? (
                      <div className="relative w-16 h-16">
                        <Image
                          src={person.photo_url}
                          alt={`${person.first_name} ${person.last_name}`}
                          fill
                          className="rounded-full object-cover border-2 border-gray-200"
                          sizes="64px"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Client Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {person.first_name} {person.last_name}
                        {person.nickname && (
                          <span className="text-sm text-gray-600 ml-2 font-normal">
                            (aka {person.nickname})
                          </span>
                        )}
                      </h3>
                      {person.exit_date && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">
                          Exited
                        </span>
                      )}
                    </div>
                    <div className="mt-1 space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">ID:</span> {person.client_id} |{' '}
                        <span className="font-medium">Age:</span> {calculateAge(person.date_of_birth)} |{' '}
                        <span className="font-medium">DOB:</span>{' '}
                        {format(new Date(person.date_of_birth), 'MM/dd/yyyy')}
                      </p>
                      {person.phone_number && (
                        <p>
                          <span className="font-medium">Phone:</span>{' '}
                          <a
                            href={`tel:${person.phone_number}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-gold-600 hover:underline"
                          >
                            {person.phone_number}
                          </a>
                        </p>
                      )}
                      {person.exit_date ? (
                        <p className="text-amber-700">
                          <span className="font-medium">Exited:</span>{' '}
                          {format(new Date(person.exit_date), 'MM/dd/yyyy')}
                          {person.exit_destination && (
                            <span> - {person.exit_destination}</span>
                          )}
                        </p>
                      ) : person.last_encounter ? (
                        <p className="text-gray-500">
                          <span className="font-medium">Last seen:</span>{' '}
                          {format(
                            new Date(person.last_encounter.service_date),
                            'MM/dd/yyyy'
                          )}{' '}
                          at {person.last_encounter.outreach_location}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div className="flex-shrink-0 flex items-center">
                    <svg
                      className={`h-5 w-5 text-gray-400 transition-transform ${expandedClient === person.id ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded Details Section */}
              {expandedClient === person.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  {/* Case Notes */}
                  {person.case_notes && person.case_notes.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Case Notes</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {person.case_notes.map((note, index) => (
                          <p key={index} className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                            {note}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No case notes message */}
                  {(!person.case_notes || person.case_notes.length === 0) && (
                    <p className="text-sm text-gray-500 italic mb-4">No case notes recorded yet.</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Link
                      href={`/client/${person.id}`}
                      className="flex-1 px-4 py-2 bg-gold-600 text-charcoal-900 font-semibold text-center rounded-lg hover:bg-gold-500 transition-colors font-medium"
                    >
                      View Full Profile
                    </Link>
                    {!person.exit_date && (
                      <Link
                        href={`/client/${person.id}/encounter/new`}
                        className="flex-1 px-4 py-2 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        New Service Interaction
                      </Link>
                    )}
                    {person.exit_date && (
                      <Link
                        href={`/client/${person.id}`}
                        className="flex-1 px-4 py-2 bg-amber-600 text-white text-center rounded-lg hover:bg-amber-700 transition-colors font-medium"
                      >
                        Reactivate Client
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
