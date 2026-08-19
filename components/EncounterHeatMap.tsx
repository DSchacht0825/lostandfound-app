'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface Location {
  latitude: number
  longitude: number
  date: string
}

interface EncounterHeatMapProps {
  locations: Location[]
}

export default function EncounterHeatMap({ locations }: EncounterHeatMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
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

    // Initialize map
    try {
      // Default center to Encinitas, CA
      const defaultCenter: [number, number] = [-117.2915, 33.0370]
      const defaultZoom = 12

      // If we have locations, center on the first one
      const center: [number, number] =
        locations.length > 0
          ? [locations[0].longitude, locations[0].latitude]
          : defaultCenter

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: defaultZoom,
      })

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // Add markers for each location
      map.current.on('load', () => {
        if (!map.current) return

        // Create GeoJSON from locations
        const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
          type: 'FeatureCollection',
          features: locations.map((loc) => ({
            type: 'Feature',
            properties: {
              date: loc.date,
            },
            geometry: {
              type: 'Point',
              coordinates: [loc.longitude, loc.latitude],
            },
          })),
        }

        // Add source
        map.current?.addSource('encounters', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        })

        // Add clustered circles
        map.current?.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'encounters',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#51bbd6',
              10,
              '#f1f075',
              30,
              '#f28cb1',
            ],
            'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40],
          },
        })

        // Add cluster count labels
        map.current?.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'encounters',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
          },
        })

        // Add unclustered points
        map.current?.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'encounters',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#b8860b',
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        })

        // Add click handlers for clusters
        map.current?.on('click', 'clusters', (e) => {
          if (!map.current) return
          const features = map.current.queryRenderedFeatures(e.point, {
            layers: ['clusters'],
          })
          const clusterId = features[0].properties?.cluster_id
          const source = map.current.getSource('encounters') as mapboxgl.GeoJSONSource

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || !map.current) return

            const geometry = features[0].geometry
            if (geometry.type === 'Point') {
              map.current.easeTo({
                center: geometry.coordinates as [number, number],
                zoom: zoom || undefined,
              })
            }
          })
        })

        // Add popup on click for unclustered points
        map.current?.on('click', 'unclustered-point', (e) => {
          if (!map.current || !e.features || e.features.length === 0) return

          const coordinates = (e.features[0].geometry as GeoJSON.Point)
            .coordinates as [number, number]
          const date = e.features[0].properties?.date

          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`<p class="font-medium">Service Interaction</p><p class="text-sm text-gray-600">Date: ${date}</p>`)
            .addTo(map.current)
        })

        // Change cursor on hover
        map.current?.on('mouseenter', 'clusters', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer'
        })
        map.current?.on('mouseleave', 'clusters', () => {
          if (map.current) map.current.getCanvas().style.cursor = ''
        })
        map.current?.on('mouseenter', 'unclustered-point', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer'
        })
        map.current?.on('mouseleave', 'unclustered-point', () => {
          if (map.current) map.current.getCanvas().style.cursor = ''
        })
      })
    } catch (error) {
      console.error('Map initialization error:', error)
      setMapError('Failed to initialize map. Please check your Mapbox configuration.')
    }

    return () => {
      map.current?.remove()
    }
  }, [locations])

  if (mapError) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center px-6">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-gray-600">{mapError}</p>
          <p className="text-sm text-gray-500 mt-2">
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
        </div>
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-gray-600">No service interactions with GPS data yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Locations will appear here as you record service interactions
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div ref={mapContainer} className="h-96 rounded-lg" />
      <p className="text-sm text-gray-600 mt-3">
        Showing {locations.length} service interaction{locations.length !== 1 ? 's' : ''}{' '}
        on map. Click clusters to expand, click individual points for details.
      </p>
    </div>
  )
}
