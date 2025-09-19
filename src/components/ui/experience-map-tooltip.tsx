'use client'

import {
  BottomDrawer,
  BottomDrawerContent,
  BottomDrawerDescription,
  BottomDrawerHeader,
  BottomDrawerTitle,
  BottomDrawerTrigger,
} from '@/components/ui/bottom-drawer'
import { MultiMapComponent } from '@/components/ui/map-component'
import type { WorkExperience } from '@/types/work-experience'

type ExperienceMapTooltipProps = {
  workExperience: WorkExperience
  children: React.ReactNode
}

// Mentor, OH City Hall coordinates as fallback
const MENTOR_LAT = 41.6662
const MENTOR_LON = -81.3395

export function ExperienceMapTooltip({ workExperience, children }: ExperienceMapTooltipProps) {
  const { workLocation, officeLocation } = workExperience

  // Determine locations to show on the map
  const locations: { latitude: number; longitude: number; label: string }[] = [
    {
      latitude: workLocation.latitude ?? MENTOR_LAT,
      longitude: workLocation.longitude ?? MENTOR_LON,
      label: workLocation.location,
    },
    ...(officeLocation
      ? [
          {
            latitude: officeLocation.latitude ?? MENTOR_LAT,
            longitude: officeLocation.longitude ?? MENTOR_LON,
            label: officeLocation.location,
          },
        ]
      : []),
  ]

  return (
    <BottomDrawer>
      <BottomDrawerTrigger asChild>{children}</BottomDrawerTrigger>
      <BottomDrawerContent className="pb-4">
        <BottomDrawerHeader className="p-0 mt-3">
          <BottomDrawerTitle className="sr-only">
            Work Locations Map: {workLocation.location} and {officeLocation?.location}
          </BottomDrawerTitle>
          <BottomDrawerDescription className="sr-only">
            Interactive map showing work and office locations. Use two fingers to pan and zoom.
          </BottomDrawerDescription>
        </BottomDrawerHeader>
        <div className="p-0 h-[400px] md:h-[500px]">
          <MultiMapComponent locations={locations} zoom={6} className="w-full h-full rounded-md" />
        </div>
        <div className="px-6 py-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Work Location: {workLocation.location}</span>
            </div>
            {officeLocation && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Office Location: {officeLocation.location}</span>
              </div>
            )}
          </div>
        </div>
      </BottomDrawerContent>
    </BottomDrawer>
  )
}
