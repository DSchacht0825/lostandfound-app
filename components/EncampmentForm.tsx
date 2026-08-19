'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { encampmentFormSchema, type EncampmentFormData } from '@/lib/schemas/encampment-schema'
import { useGeolocation } from '@/lib/hooks/useGeolocation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import MapPicker from './MapPicker'

interface EncampmentFormProps {
  personId?: string
  personName?: string
}

export default function EncampmentForm({ personId, personName }: EncampmentFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [manualLocation, setManualLocation] = useState<{ lat: number; lng: number } | null>(null)
  const { latitude, longitude, accuracy, error: gpsError, loading: gpsLoading, refreshLocation } = useGeolocation()

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EncampmentFormData>({
    resolver: zodResolver(encampmentFormSchema),
  })

  // Set GPS coordinates when available (auto GPS takes priority)
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setValue('latitude', latitude)
      setValue('longitude', longitude)
      setManualLocation(null)
    }
  }, [latitude, longitude, setValue])

  const handleManualLocationSelect = (lat: number, lng: number) => {
    setManualLocation({ lat, lng })
    setValue('latitude', lat)
    setValue('longitude', lng)
  }

  const currentLatitude = manualLocation?.lat ?? latitude
  const currentLongitude = manualLocation?.lng ?? longitude
  const isManuallySet = manualLocation !== null

  // Photo: file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  // Photo: camera capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
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

  const stopCamera = () => {
    if (videoElement?.srcObject) {
      const stream = videoElement.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoElement.srcObject = null
      setIsCameraActive(false)
    }
  }

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
            const file = new File([blob], 'encampment-photo.jpg', { type: 'image/jpeg' })
            setPhotoFile(file)
            setPhotoPreview(canvas.toDataURL('image/jpeg'))
            stopCamera()
          }
        }, 'image/jpeg', 0.8)
      }
    }
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    stopCamera()
  }

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('encampment-photos')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      alert('Photo upload failed. Encampment will be saved without a photo.')
      return null
    }

    const { data: { publicUrl } } = supabase.storage
      .from('encampment-photos')
      .getPublicUrl(fileName)

    return publicUrl
  }

  const onSubmit = async (data: EncampmentFormData) => {
    if (currentLatitude === null || currentLongitude === null) {
      alert('GPS location is required. Please enable location services or manually select a location on the map.')
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()

    try {
      let photoUrl: string | null = null
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile)
      }

      const { error } = await supabase.from('encampments').insert([
        {
          latitude: data.latitude,
          longitude: data.longitude,
          location_description: data.location_description || null,
          estimated_population: data.estimated_population || null,
          notes: data.notes || null,
          reported_by: data.reported_by,
          photo_url: photoUrl,
          person_id: personId || null,
        } as never,
      ])

      if (error) throw error

      router.push(personId ? `/client/${personId}` : '/')
    } catch (error) {
      console.error('Error saving encampment report:', error)
      alert('Error saving encampment report. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {showMapPicker && (
        <MapPicker
          initialLatitude={currentLatitude || undefined}
          initialLongitude={currentLongitude || undefined}
          onLocationSelect={handleManualLocationSelect}
          onClose={() => setShowMapPicker(false)}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {personName && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-orange-900 text-sm">
              Logged while trying to locate <span className="font-semibold">{personName}</span>. This report is not
              tied to their file — it just records the site.
            </p>
          </div>
        )}

        {/* GPS Location Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            GPS Location (Required)
          </h2>

          {gpsLoading && !isManuallySet && (
            <div className="flex items-center text-orange-600 mb-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600 mr-2"></div>
              Getting your location...
            </div>
          )}

          {gpsError && !isManuallySet && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 font-medium">❌ {gpsError}</p>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={refreshLocation} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Try Again
                </button>
                <button type="button" onClick={() => setShowMapPicker(true)} className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors">
                  Select Location on Map
                </button>
              </div>
            </div>
          )}

          {isManuallySet && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-orange-700 font-medium">📍 Location set manually from map</p>
              <p className="text-sm text-orange-600 mt-1">
                Coordinates: {currentLatitude!.toFixed(6)}, {currentLongitude!.toFixed(6)}
              </p>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setShowMapPicker(true)} className="text-sm text-orange-700 underline hover:text-orange-800">
                  Change Location
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualLocation(null)
                    refreshLocation()
                  }}
                  className="text-sm text-orange-700 underline hover:text-orange-800"
                >
                  Use Auto GPS Instead
                </button>
              </div>
            </div>
          )}

          {latitude !== null && longitude !== null && !isManuallySet && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 font-medium">✓ Location captured successfully (Auto GPS)</p>
              <p className="text-sm text-green-600 mt-1">
                Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                {accuracy && ` (±${Math.round(accuracy)}m)`}
              </p>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={refreshLocation} className="text-sm text-green-700 underline hover:text-green-800">
                  Refresh Location
                </button>
                <button type="button" onClick={() => setShowMapPicker(true)} className="text-sm text-green-700 underline hover:text-green-800">
                  Use Map Instead
                </button>
              </div>
            </div>
          )}

          {!isManuallySet && latitude === null && !gpsLoading && !gpsError && (
            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              className="w-full px-4 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
            >
              Select Location on Map
            </button>
          )}
        </div>

        {/* Site Details */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Site Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reported By <span className="text-red-500">*</span>
              </label>
              <input
                {...register('reported_by')}
                type="text"
                placeholder="Your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {errors.reported_by && <p className="text-red-500 text-sm mt-1">{errors.reported_by.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Description</label>
              <input
                {...register('location_description')}
                type="text"
                placeholder="e.g., Under the I-5 overpass near Main St"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Number of People</label>
              <input
                {...register('estimated_population', { valueAsNumber: true })}
                type="number"
                min="0"
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                {...register('notes')}
                rows={5}
                placeholder="What you observed, needs seen, safety concerns, follow-up needed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Photo */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Photo</h2>

          {photoPreview ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="Encampment" className="w-full max-w-sm rounded-lg border border-gray-300" />
              <button type="button" onClick={removePhoto} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                Remove Photo
              </button>
            </div>
          ) : isCameraActive ? (
            <div className="space-y-3">
              <video
                ref={setVideoElement}
                autoPlay
                playsInline
                className="w-full max-w-sm rounded-lg border border-gray-300"
              />
              <div className="flex gap-2">
                <button type="button" onClick={capturePhoto} className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors">
                  Capture
                </button>
                <button type="button" onClick={stopCamera} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={startCamera} className="px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors">
                Take Photo
              </button>
              <label className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer">
                Upload Photo
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-3">Optional, but helpful for identifying the site later.</p>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || currentLatitude === null || currentLongitude === null}
            className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Encampment Report'}
          </button>
        </div>
      </form>
    </>
  )
}
