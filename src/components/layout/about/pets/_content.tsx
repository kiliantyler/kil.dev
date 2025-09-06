import { Card } from '@/components/ui/card'
import { SectionLabel } from '@/components/ui/section-label'

export function PetsContent() {
  return (
    <div className="mt-12">
      <SectionLabel>These are my pets</SectionLabel>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(num => (
          <Card key={num} aria-label={`Pet photo placeholder ${num}`} className="overflow-hidden">
            <div className="bg-muted flex aspect-square items-center justify-center">
              <span className="text-muted-foreground text-sm">Pet photo {num}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
