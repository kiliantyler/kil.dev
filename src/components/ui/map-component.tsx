'use client'

type MapLocation = {
  latitude: number
  longitude: number
  label: string
}

type SingleMapProps = {
  center: [number, number]
  zoom?: number
  label: string
  className?: string
}

type MultiMapProps = {
  locations: MapLocation[]
  zoom?: number
  className?: string
}

export function MapComponent({ center, zoom = 5, label, className = 'w-full h-full rounded-md' }: SingleMapProps) {
  const [latitude, longitude] = center

  // Google Maps embed with built-in marker (no API key needed)
  const embedMapUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=${zoom}&output=embed`

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Embedded Google Maps with built-in marker */}
      <iframe
        src={embedMapUrl}
        title={`Map of ${label}`}
        className="w-full h-full rounded-md border-0"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}

export function MultiMapComponent({ locations, zoom = 5, className = 'w-full h-full rounded-md' }: MultiMapProps) {
  // Create a search query with all locations
  const locationLabels = locations.map(loc => `${loc.latitude},${loc.longitude}`).join(' to ')
  const embedMapUrl = `https://maps.google.com/maps?q=${locationLabels}&z=${zoom}&output=embed`

  return (
    <div className={`relative w-full h-full ${className}`}>
      <iframe
        src={embedMapUrl}
        title={`Map showing ${locations.length} locations`}
        className="w-full h-full rounded-md border-0"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
