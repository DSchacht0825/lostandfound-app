'use client'

import { useState } from 'react'

interface DetailItem {
  id: string
  name: string
  date?: string
  location?: string
  details?: string
  photoUrl?: string
}

interface MetricCardProps {
  title: string
  value: number | string
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'yellow' | 'indigo' | 'teal'
  icon: React.ReactNode
  detailItems?: DetailItem[]
  detailTitle?: string
  breakdown?: Record<string, number>
}

const colorClasses = {
  blue: {
    text: 'text-gold-600',
    bg: 'bg-gold-100',
    border: 'border-gold-200',
    hover: 'hover:bg-gold-50',
  },
  green: {
    text: 'text-green-600',
    bg: 'bg-green-100',
    border: 'border-green-200',
    hover: 'hover:bg-green-50',
  },
  red: {
    text: 'text-red-600',
    bg: 'bg-red-100',
    border: 'border-red-200',
    hover: 'hover:bg-red-50',
  },
  purple: {
    text: 'text-purple-600',
    bg: 'bg-purple-100',
    border: 'border-purple-200',
    hover: 'hover:bg-purple-50',
  },
  orange: {
    text: 'text-orange-600',
    bg: 'bg-orange-100',
    border: 'border-orange-200',
    hover: 'hover:bg-orange-50',
  },
  yellow: {
    text: 'text-yellow-600',
    bg: 'bg-yellow-100',
    border: 'border-yellow-200',
    hover: 'hover:bg-yellow-50',
  },
  indigo: {
    text: 'text-indigo-600',
    bg: 'bg-indigo-100',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-50',
  },
  teal: {
    text: 'text-teal-600',
    bg: 'bg-teal-100',
    border: 'border-teal-200',
    hover: 'hover:bg-teal-50',
  },
}

export default function MetricCard({
  title,
  value,
  color,
  icon,
  detailItems = [],
  detailTitle,
  breakdown,
}: MetricCardProps) {
  const [showModal, setShowModal] = useState(false)
  const colors = colorClasses[color]
  const hasDetails = detailItems.length > 0 || (breakdown && Object.keys(breakdown).length > 0)

  return (
    <>
      <div
        className={`bg-white rounded-lg shadow p-6 transition-all ${
          hasDetails ? `cursor-pointer ${colors.hover} border-2 border-transparent hover:${colors.border} hover:shadow-lg` : ''
        }`}
        onClick={() => hasDetails && setShowModal(true)}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className={`text-3xl font-bold ${colors.text} mt-1`}>{value}</p>
          </div>
          <div className={`${colors.bg} p-3 rounded-full`}>{icon}</div>
        </div>
        {hasDetails && (
          <p className="text-xs text-gray-400 mt-2">Click for details</p>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className={`${colors.bg} px-6 py-4 border-b`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-xl font-bold ${colors.text}`}>
                  {detailTitle || title}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className={`text-2xl font-bold ${colors.text} mt-1`}>{value} total</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* Breakdown section */}
              {breakdown && Object.keys(breakdown).length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-3">Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(breakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([key, count]) => (
                        <div key={key} className={`flex justify-between items-center ${colors.bg} px-3 py-2 rounded`}>
                          <span className="text-gray-700">{key}</span>
                          <span className={`font-semibold ${colors.text}`}>{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Detail items list */}
              {detailItems.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">Details</h4>
                  <div className="space-y-3">
                    {detailItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3 hover:bg-gray-50 flex gap-3">
                        {item.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.photoUrl}
                            alt=""
                            className="w-16 h-16 rounded object-cover flex-shrink-0 border border-gray-200"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {item.date && (
                            <p className="text-sm text-gray-500">Date: {item.date}</p>
                          )}
                          {item.location && (
                            <p className="text-sm text-gray-500">Location: {item.location}</p>
                          )}
                          {item.details && (
                            <p className="text-sm text-gray-600 mt-1">{item.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!hasDetails && (
                <p className="text-gray-500 text-center py-4">No detailed data available</p>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className={`w-full py-2 px-4 rounded-lg ${colors.bg} ${colors.text} font-medium hover:opacity-80 transition-opacity`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
