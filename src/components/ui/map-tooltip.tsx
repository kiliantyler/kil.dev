'use client'

import {
  BottomDrawer,
  BottomDrawerContent,
  BottomDrawerDescription,
  BottomDrawerHeader,
  BottomDrawerTitle,
  BottomDrawerTrigger,
} from '@/components/ui/bottom-drawer'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HOME_CONTENT } from '@/lib/content'
import { useMemo } from 'react'

type MapTooltipProps = {
  locationLabel?: string
  latitude?: number
  longitude?: number
}

export function MapTooltip({
  locationLabel = HOME_CONTENT.LOCATION,
  latitude = HOME_CONTENT.MAP_LATITUDE,
  longitude = HOME_CONTENT.MAP_LONGITUDE,
}: MapTooltipProps) {
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
    <div className="w-full">
      <div className="md:hidden">
        <BottomDrawer>
          <BottomDrawerTrigger asChild>
            <button
              type="button"
              className="text-primary text-lg font-semibold cursor-pointer inline-flex items-center w-fit self-center text-center"
              aria-label={`Open map of ${locationLabel}`}>
              {locationLabel}
            </button>
          </BottomDrawerTrigger>
          <BottomDrawerContent className="pb-4">
            <BottomDrawerHeader className="p-0 mt-3">
              <BottomDrawerTitle className="sr-only">Map of {locationLabel}</BottomDrawerTitle>
              <BottomDrawerDescription className="sr-only">
                Embedded map centered on {locationLabel}. Use two fingers to pan and zoom.
              </BottomDrawerDescription>
            </BottomDrawerHeader>
            <div className="p-0">
              <iframe
                src={embedMapSrc}
                title={`Map of ${locationLabel}`}
                className="relative z-10 h-[240px] w-full rounded-md border border-border shadow-md"
              />
            </div>
          </BottomDrawerContent>
        </BottomDrawer>
      </div>
      <div className="hidden md:block">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="text-primary text-lg md:text-xl font-semibold cursor-help inline-flex items-center w-fit self-start md:self-start"
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
      </div>
    </div>
  )
}
