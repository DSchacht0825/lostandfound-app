'use client'

import { useState, useEffect } from 'react'
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
import { checkForDuplicates, SimilarPerson } from '@/lib/utils/duplicate-detection'
import DuplicateWarningModal from './DuplicateWarningModal'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function IntakeForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [similarPersons, setSimilarPersons] = useState<SimilarPerson[]>([])
  const [pendingFormData, setPendingFormData] = useState<IntakeFormData | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)

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
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      photo_url: null,
      veteran_status: false,
      disability_status: false,
      disability_types: [] as string[],
      chronic_homeless: false,
      domestic_violence_victim: false,
      chronic_health: false,
      mental_health: false,
      addictions: [] as string[],
      release_of_information: false,
      evictions: 0,
      income_amount: undefined,
      enrollment_date: getLocalDateString(),
    },
  })

  const firstName = watch('first_name')
  const lastName = watch('last_name')
  const dateOfBirth = watch('date_of_birth')
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
        alert('Photo upload failed. Client will be created without photo.')
        return null
      }

      const { data: { publicUrl } } = supabase.storage
        .from('client-photos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Photo upload failed. Client will be created without photo.')
      return null
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  // Check for duplicates when name or DOB changes
  useEffect(() => {
    const checkDuplicates = async () => {
      if (firstName && lastName && firstName.length > 2 && lastName.length > 2) {
        const result = await checkForDuplicates(firstName, lastName, dateOfBirth || undefined)
        if (result.hasPotentialDuplicates) {
          // Store similar persons but don't show modal yet
          setSimilarPersons(result.similarPersons)
        } else {
          setSimilarPersons([])
        }
      }
    }

    const timeoutId = setTimeout(checkDuplicates, 500)
    return () => clearTimeout(timeoutId)
  }, [firstName, lastName, dateOfBirth])

  const onSubmit = async (data: IntakeFormData) => {
    // If there are similar persons, show the modal first
    if (similarPersons.length > 0) {
      setPendingFormData(data)
      setShowDuplicateModal(true)
      return
    }

    // No duplicates, proceed with creation
    await createPerson(data)
  }

  const createPerson = async (data: IntakeFormData) => {
    setIsSubmitting(true)
    const supabase = createClient()

    try {
      // Upload photo if exists
      let photoUrl = data.photo_url
      if (photoFile && !photoUrl) {
        photoUrl = await uploadPhoto(photoFile)
      }

      // Ensure dates are in YYYY-MM-DD format without timezone conversion
      const dateOfBirth = data.date_of_birth || null
      const enrollmentDate = data.enrollment_date // Already in YYYY-MM-DD from date input

      const { data: result, error } = await supabase
        .from('persons')
        .insert([
          {
            photo_url: photoUrl || null,
            first_name: data.first_name,
            last_name: data.last_name,
            nickname: data.nickname || null,
            phone_number: data.phone_number || null,
            date_of_birth: dateOfBirth,
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
            enrollment_date: enrollmentDate,
            case_manager: data.case_manager || null,
            referral_source: data.referral_source || null,
            release_of_information: data.release_of_information,
            preferred_language: data.preferred_language || null,
            cultural_lived_experience: data.cultural_lived_experience || null,
          } as never,
        ])
        .select()
        .single()

      if (error) throw error

      // Type assertion for returned person data
      const newPerson = result as { id: string }

      // Success! Navigate to the person's profile
      router.push(`/client/${newPerson.id}`)
    } catch (error) {
      console.error('Error creating person:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Error creating person: ${errorMessage}. Please check all fields and try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectExisting = (personId: string) => {
    setShowDuplicateModal(false)
    router.push(`/client/${personId}`)
  }

  const handleCreateNew = async () => {
    setShowDuplicateModal(false)
    if (pendingFormData) {
      await createPerson(pendingFormData)
    }
  }

  const handleCancelDuplicate = () => {
    setShowDuplicateModal(false)
    setPendingFormData(null)
  }

  return (
    <>
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
                <p className="text-sm text-gray-600 text-center">
                  Photo ready to upload
                </p>
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
              {errors.date_of_birth && (
                <p className="text-red-500 text-sm mt-1">{errors.date_of_birth.message}</p>
              )}
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
                  Verbal ROI for Encinitas Approved
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-1 ml-6">
                Check if client has given verbal authorization to share information
              </p>
            </div>
          </div>
        </div>

        {/* Warning if similar persons found */}
        {similarPersons.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Similar person(s) found
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  We found {similarPersons.length} person(s) with similar names. When you
                  submit, you&apos;ll be asked to confirm if this is a new person.
                </p>
              </div>
            </div>
          </div>
        )}

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
            {isSubmitting ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </form>

      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        similarPersons={similarPersons}
        enteredName={`${firstName} ${lastName}`}
        onSelectExisting={handleSelectExisting}
        onCreateNew={handleCreateNew}
        onCancel={handleCancelDuplicate}
      />
    </>
  )
}
