'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const returnToActiveSchema = z.object({
  return_date: z.string().min(1, 'Return date is required'),
  notes: z.string().optional(),
})

type ReturnToActiveFormData = z.infer<typeof returnToActiveSchema>

interface ReturnToActiveModalProps {
  isOpen: boolean
  personId: string
  personName: string
  onClose: () => void
  onSuccess: () => void
}

export default function ReturnToActiveModal({
  isOpen,
  personId,
  personName,
  onClose,
  onSuccess,
}: ReturnToActiveModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

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
  } = useForm<ReturnToActiveFormData>({
    resolver: zodResolver(returnToActiveSchema),
    defaultValues: {
      return_date: getLocalDateString(),
      notes: '',
    },
  })

  const onSubmit = async (data: ReturnToActiveFormData) => {
    setIsSubmitting(true)
    const supabase = createClient()

    try {
      // Get current user for tracking who made the change
      const { data: { user } } = await supabase.auth.getUser()

      // First, log the return to active in status_changes
      const { error: statusError } = await supabase
        .from('status_changes')
        .insert({
          person_id: personId,
          change_type: 'return_to_active',
          change_date: data.return_date,
          notes: data.notes || null,
          created_by: user?.email || 'Unknown',
        } as never)

      if (statusError) throw statusError

      // Then, clear the exit fields on the person record
      const { error: personError } = await supabase
        .from('persons')
        .update({
          exit_date: null,
          exit_destination: null,
          exit_notes: null,
        } as never)
        .eq('id', personId)

      if (personError) throw personError

      reset()
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error returning client to active:', error)
      alert('Error returning client to active. Please try again.')
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
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Return to Active</h2>
              <p className="text-gray-600 mt-1">
                Return <span className="font-semibold">{personName}</span> to active status
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

          <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-gold-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="ml-3 text-sm text-gold-800">
                This will clear the exit information and mark the client as active again.
                The exit history will be preserved for reporting purposes.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Return Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Return Date <span className="text-red-500">*</span>
              </label>
              <input
                {...register('return_date')}
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {errors.return_date && (
                <p className="text-red-500 text-sm mt-1">{errors.return_date.message}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Any notes about why the client is returning..."
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
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Returning...' : 'Return to Active'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
