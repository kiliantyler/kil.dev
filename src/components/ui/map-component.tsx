'use client'

type MapComponentProps = {
  center: [number, number]
  zoom?: number
  label: string
  className?: string
}

export function MapComponent({ center, zoom = 5, label, className = 'w-full h-full rounded-md' }: MapComponentProps) {
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
