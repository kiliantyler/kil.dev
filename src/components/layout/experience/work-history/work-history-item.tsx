import { ExperienceMapTooltip } from '@/components/ui/experience-map-tooltip'
import type { WorkExperience } from '@/types/work-experience'
import { resolveSkills } from '@/utils/skillicons'
import { formatMonthYear } from '@/utils/utils'
import { CollapsibleHighlights } from './collapsible-highlights'
import { CompanyMarker } from './company-marker'

function formatDate(value: string | undefined) {
  if (!value) return 'Present'
  return formatMonthYear(value, 'en-US')
}

export function WorkHistoryItem({ item }: { item: WorkExperience }) {
  const when = `${formatDate(item.from)} - ${formatDate(item.to)}`
  const skillsEntries = item.skills ? resolveSkills(item.skills) : []

  return (
    <li className="relative pl-6 py-4 last:pb-0">
      <CompanyMarker item={item} />
      <div className="relative overflow-hidden rounded-3xl bg-transparent p-6 shadow-none backdrop-blur-2xs">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-2 -mt-2">
            <h3 className="text-sm md:text-base font-semibold">{item.role}</h3>
            <span className="text-muted-foreground text-sm">@ {item.company}</span>
          </div>
          <div className="text-muted-foreground text-xs md:text-sm flex flex-col md:flex-row md:items-center">
            <span>{when}</span>
            <ExperienceMapTooltip workExperience={item}>
              <button
                type="button"
                className="md:ml-2 md:before:content-['·'] md:before:mx-2 md:before:text-inherit text-primary"
                aria-label={`Open map of ${item.workLocation.location} and ${item.officeLocation.location}`}
                title={`View map: ${item.workLocation.location} and ${item.officeLocation.location}`}>
                {item.workLocation.location} [{item.officeLocation.location}]
              </button>
            </ExperienceMapTooltip>
          </div>
          <p className="text-sm md:text-base leading-relaxed">{item.summary}</p>

          {(item.highlights && item.highlights.length > 0) || skillsEntries.length > 0 ? (
            <CollapsibleHighlights item={item} skillsEntries={skillsEntries} />
          ) : null}
        </div>
      </div>
    </li>
  )
}
