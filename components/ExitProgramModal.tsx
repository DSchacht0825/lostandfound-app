'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { exitFormSchema, type ExitFormData, EXIT_DESTINATIONS } from '@/lib/schemas/exit-schema'
import { createClient } from '@/lib/supabase/client'

interface ExitProgramModalProps {
  isOpen: boolean
  personId: string
  personName: string
  onClose: () => void
  onSuccess: () => void
}

export default function ExitProgramModal({
  isOpen,
  personId,
  personName,
  onClose,
  onSuccess,
}: ExitProgramModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get current date in local timezone (not UTC)
  const getLocalDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ExitFormData>({
    resolver: zodResolver(exitFormSchema),
    defaultValues: {
      exit_date: getLocalDateString(),
      exit_destination: '',
      exit_notes: '',
    },
  })

  const onSubmit = async (data: ExitFormData) => {
    setIsSubmitting(true)
    const supabase = createClient()

    try {
      // Get current user for tracking who made the change
      const { data: { user } } = await supabase.auth.getUser()

      // Ensure date is in YYYY-MM-DD format without timezone conversion
      const exitDate = data.exit_date // Already in YYYY-MM-DD from date input

      // First, log the exit to status_changes
      const { error: statusError } = await supabase
        .from('status_changes')
        .insert({
          person_id: personId,
          change_type: 'exit',
          change_date: exitDate,
          exit_destination: data.exit_destination,
          notes: data.exit_notes || null,
          created_by: user?.email || 'Unknown',
        } as never)

      if (statusError) throw statusError

      // Then update the person record
      const { error } = await supabase
        .from('persons')
        .update({
          exit_date: exitDate,
          exit_destination: data.exit_destination,
          exit_notes: data.exit_notes || null,
        } as never)
        .eq('id', personId)

      if (error) throw error

      reset()
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error exiting client from program:', error)
      alert('Error exiting client from program. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Exit Program</h2>
              <p className="text-gray-600 mt-1">
                Exit <span className="font-semibold">{personName}</span> from the program
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Exit Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exit Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('exit_date')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              {errors.exit_date && (
                <p className="text-red-500 text-sm mt-1">{errors.exit_date.message}</p>
              )}
            </div>

            {/* Exit Destination */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exit Destination <span className="text-red-500">*</span>
              </label>
              <select
                {...register('exit_destination')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                <option value="">Select exit destination...</option>
                {Object.entries(EXIT_DESTINATIONS).map(([category, destinations]) => (
                  <optgroup key={category} label={category}>
                    {destinations.map((destination) => (
                      <option key={destination} value={destination}>
                        {destination}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors.exit_destination && (
                <p className="text-red-500 text-sm mt-1">{errors.exit_destination.message}</p>
              )}
            </div>

            {/* Exit Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                {...register('exit_notes')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                placeholder="Any additional notes about the exit..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Exiting...' : 'Exit from Program'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
