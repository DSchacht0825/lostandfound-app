'use client'

import { SimilarPerson } from '@/lib/utils/duplicate-detection'
import { format } from 'date-fns'

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

interface DuplicateWarningModalProps {
  isOpen: boolean
  similarPersons: SimilarPerson[]
  enteredName: string
  onSelectExisting: (personId: string) => void
  onCreateNew: () => void
  onCancel: () => void
}

export default function DuplicateWarningModal({
  isOpen,
  similarPersons,
  enteredName,
  onSelectExisting,
  onCreateNew,
  onCancel,
}: DuplicateWarningModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Possible Duplicate Found
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                You entered: <span className="font-medium">{enteredName}</span>
              </p>
            </div>
          </div>

          {/* Similar Persons List */}
          <div className="mb-6">
            <p className="text-sm text-gray-700 mb-3">
              The following person(s) in the system have similar names:
            </p>
            <div className="space-y-3">
              {similarPersons.map((person) => (
                <div
                  key={person.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gold-500 hover:bg-gold-50 cursor-pointer transition-colors"
                  onClick={() => onSelectExisting(person.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {person.first_name} {person.last_name}
                        {person.nickname && (
                          <span className="text-sm text-gray-600 ml-2">
                            (aka {person.nickname})
                          </span>
                        )}
                      </h4>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Client ID:</span>{' '}
                          {person.client_id}
                        </p>
                        <p>
                          <span className="font-medium">DOB:</span>{' '}
                          {format(new Date(person.date_of_birth), 'MM/dd/yyyy')}{' '}
                          (Age: {calculateAge(person.date_of_birth)})
                        </p>
                        {person.last_encounter_date && (
                          <p>
                            <span className="font-medium">Last seen:</span>{' '}
                            {format(
                              new Date(person.last_encounter_date),
                              'MM/dd/yyyy'
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold-100 text-gold-800">
                        {Math.round(person.similarity_score * 100)}% match
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onCreateNew}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              No, Create New Person
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Click on a person card above to use their existing record, or create
            a new person if this is someone different.
          </p>
        </div>
      </div>
    </div>
  )
}
