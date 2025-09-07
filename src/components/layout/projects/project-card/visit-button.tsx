import { LinkButton } from '@/components/ui/link-button'
import { captureProjectVisitClicked } from '@/hooks/posthog'

interface VisitButtonProps {
  href: string
  title: string
  id: string
}

export function VisitButton({ href, title, id }: VisitButtonProps) {
  return (
    <LinkButton
      href={href}
      external={href.startsWith('http')}
      variant="default"
      className="h-9 rounded-md px-3 text-xs font-semibold"
      aria-label={`Open ${title} website`}
      onClick={e => {
        e.stopPropagation()
        captureProjectVisitClicked(id, href)
      }}>
      Visit
    </LinkButton>
  )
}
