import { SectionLabel } from '@/components/ui/section-label'
import { SkillIcons } from '@/components/ui/skill-icons'
import { SKILL_CATEGORIES } from '@/lib/experience'
import { resolveSkills } from '@/utils/skillicons'

export function ExperienceSkills() {
  return (
    <section className="flex-1">
      <div className="flex flex-col gap-4">
        <SectionLabel as="p">Things I reach for</SectionLabel>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {SKILL_CATEGORIES.map(category => {
            const entries = resolveSkills(category.items)
            return (
              <div key={category.id} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground">{category.label}</h3>
                <SkillIcons skills={entries} />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
