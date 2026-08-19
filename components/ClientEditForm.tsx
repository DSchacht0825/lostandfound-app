'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  intakeFormSchema,
  type IntakeFormData,
  LIVING_SITUATIONS,
  GENDER_OPTIONS,
  RACE_OPTIONS,
  DISABILITY_TYPES,
  REFERRAL_SOURCES,
  TIME_HOMELESS_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  ADDICTION_OPTIONS,
} from '@/lib/schemas/intake-schema'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface PersonData {
  id: string
  client_id: string
  first_name: string
  last_name: string
  nickname?: string | null
  phone_number?: string | null
  photo_url?: string | null
  date_of_birth: string
  gender: string
  race: string
  ethnicity: string
  sexual_orientation?: string | null
  preferred_language?: string | null
  cultural_lived_experience?: string | null
  veteran_status: boolean
  disability_status: boolean
  disability_type?: string | null
  chronic_homeless: boolean
  domestic_violence_victim?: boolean
  chronic_health?: boolean
  mental_health?: boolean
  addiction?: string | null
  living_situation: string
  length_of_time_homeless?: string | null
  evictions?: number | null
  income?: string | null
  income_amount?: number | null
  support_system?: string | null
  enrollment_date: string
  case_manager?: string | null
  referral_source?: string | null
  release_of_information?: boolean
}

interface ClientEditFormProps {
  person: PersonData
}

export default function ClientEditForm({ person }: ClientEditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(person.photo_url || null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      photo_url: person.photo_url || null,
      first_name: person.first_name,
      last_name: person.last_name,
      nickname: person.nickname || '',
      phone_number: person.phone_number || '',
      date_of_birth: person.date_of_birth,
      gender: person.gender,
      race: person.race,
      ethnicity: person.ethnicity,
      sexual_orientation: person.sexual_orientation || '',
      preferred_language: person.preferred_language || '',
      cultural_lived_experience: person.cultural_lived_experience || '',
      veteran_status: person.veteran_status,
      disability_status: person.disability_status,
      disability_types: person.disability_type ? person.disability_type.split(',') : [],
      chronic_homeless: person.chronic_homeless,
      domestic_violence_victim: person.domestic_violence_victim || false,
      chronic_health: person.chronic_health || false,
      mental_health: person.mental_health || false,
      addictions: person.addiction ? person.addiction.split(',') : [],
      living_situation: person.living_situation,
      length_of_time_homeless: person.length_of_time_homeless || '',
      evictions: person.evictions || 0,
      income: person.income || '',
      income_amount: person.income_amount || undefined,
      support_system: person.support_system || '',
      enrollment_date: person.enrollment_date,
      case_manager: person.case_manager || '',
      referral_source: person.referral_source || '',
      release_of_information: person.release_of_information || false,
    },
  })

  const disabilityStatus = watch('disability_status')

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      if (videoElement) {
        videoElement.srcObject = stream
        videoElement.play()
        setIsCameraActive(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Unable to access camera. Please check permissions or use file upload.')
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (videoElement?.srcObject) {
      const stream = videoElement.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoElement.srcObject = null
      setIsCameraActive(false)
    }
  }

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoElement) {
      const canvas = document.createElement('canvas')
      canvas.width = videoElement.videoWidth
      canvas.height = videoElement.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'client-photo.jpg', { type: 'image/jpeg' })
            setPhotoFile(file)
            setPhotoPreview(canvas.toDataURL('image/jpeg'))
            stopCamera()
          }
        }, 'image/jpeg', 0.8)
      }
    }
  }

  // Remove photo
  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setValue('photo_url', null)
    stopCamera()
  }

  // Upload photo to Supabase storage
  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingPhoto(true)
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        alert('Photo upload failed.')
        return null
      }

      const { data: { publicUrl } } = supabase.storage
        .from('client-photos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Photo upload failed.')
      return null
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const onSubmit = async (data: IntakeFormData) => {
    setIsSubmitting(true)
    const supabase = createClient()

    try {
      // Upload new photo if exists
      let photoUrl = photoPreview
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile)
      }

      const { error } = await supabase
        .from('persons')
        .update({
          photo_url: photoUrl || null,
          first_name: data.first_name,
          last_name: data.last_name,
          nickname: data.nickname || null,
          phone_number: data.phone_number || null,
          date_of_birth: data.date_of_birth || null,
          gender: data.gender,
          race: data.race,
          ethnicity: data.ethnicity,
          sexual_orientation: data.sexual_orientation || null,
          veteran_status: data.veteran_status,
          disability_status: data.disability_status,
          disability_type: data.disability_types?.length ? data.disability_types.join(',') : null,
          chronic_homeless: data.chronic_homeless,
          domestic_violence_victim: data.domestic_violence_victim,
          chronic_health: data.chronic_health,
          mental_health: data.mental_health,
          addiction: data.addictions?.length ? data.addictions.join(',') : null,
          living_situation: data.living_situation,
          length_of_time_homeless: data.length_of_time_homeless || null,
          evictions: data.evictions || 0,
          income: data.income || null,
          income_amount: data.income_amount || null,
          support_system: data.support_system || null,
          enrollment_date: data.enrollment_date,
          case_manager: data.case_manager || null,
          referral_source: data.referral_source || null,
          release_of_information: data.release_of_information,
          preferred_language: data.preferred_language || null,
          cultural_lived_experience: data.cultural_lived_experience || null,
        } as never)
        .eq('id', person.id)

      if (error) throw error

      // Success! Navigate back to the person's profile
      router.push(`/client/${person.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error updating person:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Error updating person: ${errorMessage}. Please try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Photo Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Client Photo</h2>
        <div className="space-y-4">
          {!photoPreview && !isCameraActive && (
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={startCamera}
                className="flex-1 px-4 py-3 bg-gold-600 text-charcoal-900 font-semibold rounded-lg hover:bg-gold-500 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Photo
              </button>
              <label className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {isCameraActive && (
            <div className="space-y-4">
              <video
                ref={setVideoElement}
                className="w-full max-w-md mx-auto rounded-lg border-2 border-gray-300"
                autoPlay
                playsInline
              />
              <div className="flex gap-4 justify-center">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Capture
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {photoPreview && (
            <div className="space-y-4">
              <div className="relative w-full max-w-md mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Client photo preview"
                  className="w-full rounded-lg border-2 border-gray-300"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {isUploadingPhoto && (
            <div className="text-center">
              <p className="text-sm text-gray-600">Uploading photo...</p>
            </div>
          )}
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('first_name')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            {errors.first_name && (
              <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register('last_name')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            {errors.last_name && (
              <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nickname / AKA
            </label>
            <input
              {...register('nickname')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              {...register('phone_number')}
              type="tel"
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              {...register('date_of_birth')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              {...register('gender')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="">Select gender...</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.gender && (
              <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Race <span className="text-red-500">*</span>
            </label>
            <select
              {...register('race')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="">Select race...</option>
              {RACE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.race && (
              <p className="text-red-500 text-sm mt-1">{errors.race.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sexual Orientation
            </label>
            <select
              {...register('sexual_orientation')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="">Select sexual orientation...</option>
              {SEXUAL_ORIENTATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Language
            </label>
            <input
              {...register('preferred_language')}
              type="text"
              placeholder="e.g., English, Spanish"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cultural / Lived Experience Notes
            </label>
            <textarea
              {...register('cultural_lived_experience')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
              placeholder="Any relevant cultural considerations or lived experience..."
            />
          </div>
        </div>
      </div>

      {/* Status Information Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Status Information</h2>
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              {...register('veteran_status')}
              type="checkbox"
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Veteran
            </label>
          </div>

          <div>
            <div className="flex items-center mb-2">
              <input
                {...register('disability_status')}
                type="checkbox"
                className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Has Disability
              </label>
            </div>
            {disabilityStatus && (
              <div className="ml-6 space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type of Disability (select all that apply)
                </label>
                {DISABILITY_TYPES.map((option) => (
                  <div key={option} className="flex items-center">
                    <input
                      {...register('disability_types')}
                      type="checkbox"
                      value={option}
                      className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              {...register('chronic_homeless')}
              type="checkbox"
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Chronically Homeless
            </label>
          </div>

          <div className="flex items-center">
            <input
              {...register('domestic_violence_victim')}
              type="checkbox"
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Domestic Violence Victim
            </label>
          </div>

          <div className="flex items-center">
            <input
              {...register('chronic_health')}
              type="checkbox"
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Chronic Health Condition
            </label>
          </div>

          <div className="flex items-center">
            <input
              {...register('mental_health')}
              type="checkbox"
              className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Mental Health Condition
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Addiction / Substance Use (select all that apply)
            </label>
            <div className="space-y-2">
              {ADDICTION_OPTIONS.map((option) => (
                <div key={option} className="flex items-center">
                  <input
                    {...register('addictions')}
                    type="checkbox"
                    value={option}
                    className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Living Situation <span className="text-red-500">*</span>
            </label>
            <select
              {...register('living_situation')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="">Select living situation...</option>
              {LIVING_SITUATIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.living_situation && (
              <p className="text-red-500 text-sm mt-1">{errors.living_situation.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Length of Time Homeless
            </label>
            <select
              {...register('length_of_time_homeless')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="">Select timeframe...</option>
              {TIME_HOMELESS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Evictions
            </label>
            <input
              {...register('evictions', { valueAsNumber: true })}
              type="number"
              min="0"
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Income Source
            </label>
            <input
              {...register('income')}
              type="text"
              placeholder="e.g., SSI, Employment, None"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Income Amount
            </label>
            <input
              {...register('income_amount', { valueAsNumber: true })}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <p className="text-xs text-gray-500 mt-1">Enter amount in dollars (e.g., 1200.00)</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Support System
            </label>
            <textarea
              {...register('support_system')}
              rows={3}
              placeholder="Describe family, friends, or community support..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        </div>
      </div>

      {/* Program Information Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Program Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enrollment Date <span className="text-red-500">*</span>
            </label>
            <input
              {...register('enrollment_date')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            {errors.enrollment_date && (
              <p className="text-red-500 text-sm mt-1">{errors.enrollment_date.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Case Manager
            </label>
            <input
              {...register('case_manager')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referral Source
            </label>
            <select
              {...register('referral_source')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="">Select referral source...</option>
              {REFERRAL_SOURCES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center">
              <input
                {...register('release_of_information')}
                type="checkbox"
                className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Verbal ROI Approved
              </label>
            </div>
            <p className="text-sm text-gray-500 mt-1 ml-6">
              Check if client has given verbal authorization to share information
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-gold-600 text-charcoal-900 font-semibold rounded-lg hover:bg-gold-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
