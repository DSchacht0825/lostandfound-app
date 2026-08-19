'use client'

import { useState } from 'react'
import { calculateSimilarity } from '@/lib/utils/duplicate-detection'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

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
  living_situation: string
  veteran_status: boolean
  chronic_homeless: boolean
  enrollment_date: string
  case_manager?: string | null
}

interface DuplicateGroup {
  persons: Person[]
  similarity_score: number
  encounter_counts: Record<string, number>  // UUID keys
}

interface DuplicateManagerProps {
  persons: Person[]
}

export default function DuplicateManager({ persons }: DuplicateManagerProps) {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [encounterCounts, setEncounterCounts] = useState<Record<string, number>>({})
  const [showResults, setShowResults] = useState(false)

  const scanForDuplicates = async () => {
    setIsScanning(true)
    setShowResults(false)
    const supabase = createClient()

    try {
      // Get encounter counts for all persons
      const { data: encounters } = await supabase
        .from('encounters')
        .select('person_id')

      const counts: Record<string, number> = {}
      if (encounters) {
        encounters.forEach((e: { person_id: string }) => {
          counts[e.person_id] = (counts[e.person_id] || 0) + 1
        })
      }
      setEncounterCounts(counts)

      // Find potential duplicates using fuzzy matching
      const groups: DuplicateGroup[] = []
      const processed = new Set<string>()

      for (let i = 0; i < persons.length; i++) {
        if (processed.has(persons[i].id)) continue

        const person1 = persons[i]
        const potentialMatches: Person[] = [person1]

        for (let j = i + 1; j < persons.length; j++) {
          if (processed.has(persons[j].id)) continue

          const person2 = persons[j]

          // Calculate name similarity
          const firstNameSim = calculateSimilarity(person1.first_name, person2.first_name)
          const lastNameSim = calculateSimilarity(person1.last_name, person2.last_name)
          const avgSimilarity = (firstNameSim + lastNameSim) / 2

          // Check for exact DOB match or high name similarity
          const isDuplicate =
            (person1.date_of_birth === person2.date_of_birth && avgSimilarity > 0.6) ||
            avgSimilarity > 0.85

          if (isDuplicate) {
            potentialMatches.push(person2)
            processed.add(persons[j].id)
          }
        }

        if (potentialMatches.length > 1) {
          processed.add(persons[i].id)
          groups.push({
            persons: potentialMatches,
            similarity_score: 0.9, // Placeholder
            encounter_counts: counts,
          })
        }
      }

      setDuplicateGroups(groups)
      setShowResults(true)
    } catch (error) {
      console.error('Error scanning for duplicates:', error)
      alert('Error scanning for duplicates. Please try again.')
    } finally {
      setIsScanning(false)
    }
  }

  const mergeDuplicates = async (keepPersonId: string, deletePersonId: string) => {
    if (!confirm('Are you sure you want to merge these records? This action cannot be undone.')) {
      return
    }

    setIsProcessing(true)
    const supabase = createClient()

    try {
      // Transfer all encounters from deleted person to kept person
      const { error: updateError } = await supabase
        .from('encounters')
        .update({ person_id: keepPersonId } as never)
        .eq('person_id', deletePersonId)

      if (updateError) throw updateError

      // Delete the duplicate person
      const { error: deleteError } = await supabase
        .from('persons')
        .delete()
        .eq('id', deletePersonId)

      if (deleteError) throw deleteError

      alert('Records merged successfully!')

      // Refresh the duplicate list
      await scanForDuplicates()
    } catch (error) {
      console.error('Error merging duplicates:', error)
      alert('Error merging records. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const deletePerson = async (personId: string) => {
    if (!confirm('Are you sure you want to DELETE this record? All associated encounters will also be deleted. This action cannot be undone.')) {
      return
    }

    setIsProcessing(true)
    const supabase = createClient()

    try {
      // Delete encounters first (foreign key constraint)
      const { error: encountersError } = await supabase
        .from('encounters')
        .delete()
        .eq('person_id', personId)

      if (encountersError) throw encountersError

      // Delete the person
      const { error: personError } = await supabase
        .from('persons')
        .delete()
        .eq('id', personId)

      if (personError) throw personError

      alert('Record deleted successfully!')

      // Refresh the duplicate list
      await scanForDuplicates()
    } catch (error) {
      console.error('Error deleting person:', error)
      alert('Error deleting record. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

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
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg shadow-lg p-6 border-2 border-orange-200">
      <div className="flex items-center mb-4">
        <svg
          className="w-6 h-6 text-orange-600 mr-2"
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
        <h3 className="text-xl font-bold text-gray-900">
          Duplicate Detection & Management
        </h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Scan the by-name list for potential duplicate clients. You can merge duplicates (combining their service history) or delete records.
      </p>

      {/* Scan Button */}
      {!showResults && (
        <button
          onClick={scanForDuplicates}
          disabled={isScanning || isProcessing}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {isScanning ? 'Scanning...' : 'Scan for Duplicates'}
        </button>
      )}

      {/* Results */}
      {showResults && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-semibold text-gray-800">
              Found {duplicateGroups.length} potential duplicate group{duplicateGroups.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={scanForDuplicates}
              disabled={isScanning || isProcessing}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Re-scan
            </button>
          </div>

          {duplicateGroups.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                No duplicates found! Your by-name list is clean.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicateGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="bg-white rounded-lg border-2 border-orange-300 p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">
                    Duplicate Group #{groupIndex + 1}
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {group.persons.map((person) => (
                      <div key={person.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-lg text-gray-900">
                              {person.first_name} {person.last_name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {person.nickname ? `"${person.nickname}"` : ''}
                            </p>
                            <p className="text-xs text-gold-600 font-mono">
                              {person.client_id}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="inline-block px-2 py-1 bg-gold-100 text-gold-800 text-xs font-semibold rounded">
                              {encounterCounts[person.id] || 0} encounters
                            </span>
                          </div>
                        </div>

                        <dl className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <dt className="text-gray-600">DOB:</dt>
                            <dd className="font-medium">{format(new Date(person.date_of_birth), 'MMM dd, yyyy')} (Age {calculateAge(person.date_of_birth)})</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Gender:</dt>
                            <dd className="font-medium">{person.gender}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Enrolled:</dt>
                            <dd className="font-medium">{format(new Date(person.enrollment_date), 'MMM dd, yyyy')}</dd>
                          </div>
                          {person.case_manager && (
                            <div className="flex justify-between">
                              <dt className="text-gray-600">Case Manager:</dt>
                              <dd className="font-medium">{person.case_manager}</dd>
                            </div>
                          )}
                        </dl>

                        {/* Action Buttons */}
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                          {group.persons.length > 1 && (
                            <>
                              {group.persons.filter(p => p.id !== person.id).map(otherPerson => (
                                <button
                                  key={otherPerson.id}
                                  onClick={() => mergeDuplicates(person.id, otherPerson.id)}
                                  disabled={isProcessing}
                                  className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Keep this, merge with {otherPerson.first_name}
                                </button>
                              ))}
                            </>
                          )}
                          <button
                            onClick={() => deletePerson(person.id)}
                            disabled={isProcessing}
                            className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Delete this record
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="mt-4 bg-gold-50 border border-gold-200 rounded-lg p-4">
          <p className="text-gold-800 font-medium">
            Processing... Please wait.
          </p>
        </div>
      )}
    </div>
  )
}
