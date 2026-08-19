'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ExitProgramModal from './ExitProgramModal'
import ReturnToActiveModal from './ReturnToActiveModal'

interface ExitProgramButtonProps {
  personId: string
  personName: string
  hasExited: boolean
  exitDate?: string | null
  exitDestination?: string | null
}

export default function ExitProgramButton({
  personId,
  personName,
  hasExited,
  exitDate,
  exitDestination,
}: ExitProgramButtonProps) {
  const [showExitModal, setShowExitModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const router = useRouter()

  const handleExitSuccess = () => {
    router.refresh()
  }

  const handleReturnSuccess = () => {
    router.refresh()
  }

  if (hasExited) {
    return (
      <div className="space-y-3">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Exited from Program
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Exit Date: {exitDate ? new Date(exitDate).toLocaleDateString() : 'Not recorded'}</p>
                {exitDestination && <p className="mt-1">Destination: {exitDestination}</p>}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowReturnModal(true)}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium inline-flex items-center justify-center"
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
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
          Return to Active
        </button>
        <ReturnToActiveModal
          isOpen={showReturnModal}
          personId={personId}
          personName={personName}
          onClose={() => setShowReturnModal(false)}
          onSuccess={handleReturnSuccess}
        />
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowExitModal(true)}
        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium inline-flex items-center"
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
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        Exit Program
      </button>

      <ExitProgramModal
        isOpen={showExitModal}
        personId={personId}
        personName={personName}
        onClose={() => setShowExitModal(false)}
        onSuccess={handleExitSuccess}
      />
    </>
  )
}
