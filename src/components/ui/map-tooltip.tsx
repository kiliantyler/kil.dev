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
import { MapComponent } from '@/components/ui/map-component'

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

  return (
    <div className="w-full">
      <BottomDrawer>
        <BottomDrawerTrigger asChild>
          <button
            type="button"
            className="text-primary text-lg md:text-xl font-semibold cursor-pointer inline-flex items-center w-fit self-start md:self-start text-center"
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
          <div className="p-0 h-[400px] md:h-[500px]">
            <MapComponent
              center={[latitude, longitude]}
              zoom={5}
              label={locationLabel}
              className="w-full h-full rounded-md"
            />
          </div>
        </BottomDrawerContent>
      </BottomDrawer>
    </div>
  )
}
