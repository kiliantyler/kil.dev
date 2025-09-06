'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CONTENT } from '@/lib/constants'
import { useMemo } from 'react'

type LocationWithMapTooltipProps = {
  locationLabel?: string
  latitude?: number
  longitude?: number
}

function LocationWithMapTooltip({
  locationLabel = CONTENT.LOCATION,
  latitude = 41.4993,
  longitude = -81.6944,
}: LocationWithMapTooltipProps) {
  const embedMapSrc = useMemo(() => {
    const deltaLat = 2.0
    const deltaLon = 1
    const left = (longitude - deltaLon).toFixed(6)
    const bottom = (latitude - deltaLat).toFixed(6)
    const right = (longitude + deltaLon).toFixed(6)
    const top = (latitude + deltaLat).toFixed(6)
    const bbox = `${left},${bottom},${right},${top}`
    const layer = 'mapnik'
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=${layer}&marker=${latitude},${longitude}`
  }, [latitude, longitude])

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="text-primary text-lg font-semibold md:text-xl cursor-help inline-flex items-center w-fit self-start"
            aria-label={`Show map of ${locationLabel}`}
            tabIndex={0}
            role="button">
            {locationLabel}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" align="start" sideOffset={0} className="p-1">
          <iframe
            src={embedMapSrc}
            title={`Map of ${locationLabel}`}
            width={320}
            height={200}
            className="relative z-10 h-[200px] w-[320px] rounded-md border border-border shadow-md"
          />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { LocationWithMapTooltip }
