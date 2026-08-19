'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface MapPickerProps {
  initialLatitude?: number
  initialLongitude?: number
  onLocationSelect: (latitude: number, longitude: number) => void
  onClose: () => void
}

export default function MapPicker({
  initialLatitude,
  initialLongitude,
  onLocationSelect,
  onClose,
}: MapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN

    if (!accessToken || accessToken === 'your-mapbox-token-here') {
      setMapError(
        'Mapbox access token not configured. Please add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env.local file.'
      )
      return
    }

    mapboxgl.accessToken = accessToken

    // Initialize map centered on San Diego or provided coordinates
    const center: [number, number] = initialLatitude && initialLongitude
      ? [initialLongitude, initialLatitude]
      : [-117.1611, 32.7157] // San Diego, CA

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: 14,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Add a marker that can be dragged
    marker.current = new mapboxgl.Marker({
      draggable: true,
      color: '#b8860b',
    })
      .setLngLat(center)
      .addTo(map.current)

    // Set initial selected location
    setSelectedLocation({ lat: center[1], lng: center[0] })

    // Update location when marker is dragged
    marker.current.on('dragend', () => {
      if (!marker.current) return
      const lngLat = marker.current.getLngLat()
      setSelectedLocation({ lat: lngLat.lat, lng: lngLat.lng })
    })

    // Allow clicking on map to move marker
    map.current.on('click', (e) => {
      if (!marker.current) return
      marker.current.setLngLat(e.lngLat)
      setSelectedLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng })
    })

    return () => {
      map.current?.remove()
    }
  }, [initialLatitude, initialLongitude])

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation.lat, selectedLocation.lng)
      onClose()
    }
  }

  if (mapError) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4">Map Configuration Error</h3>
          <p className="text-gray-600 mb-4">{mapError}</p>
          <p className="text-sm text-gray-500 mb-4">
            Get a free token at{' '}
            <a
              href="https://www.mapbox.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-600 hover:underline"
            >
              mapbox.com
            </a>
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold">Select Location on Map</h3>
              <p className="text-sm text-gray-600 mt-1">
                Click on the map or drag the blue marker to select the exact location
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
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
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <div ref={mapContainer} className="absolute inset-0" />
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {selectedLocation && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Selected coordinates:</span>
                <br />
                Latitude: {selectedLocation.lat.toFixed(6)}
                <br />
                Longitude: {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedLocation}
              className="flex-1 px-6 py-3 bg-gold-600 text-charcoal-900 font-semibold rounded-lg hover:bg-gold-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
