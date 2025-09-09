import { GitHubIcon } from '@/components/icons/github'
import { LinkButton } from '@/components/ui/link-button'
import { captureProjectSourceClicked } from '@/hooks/posthog'
import type { Route } from 'next'

interface RepoButtonProps {
  repo: Route
  title: string
  id: string
}

export function RepoButton({ repo, title, id }: RepoButtonProps) {
  return (
    <LinkButton
      href={repo}
      external
      variant="secondary"
      className="h-9 rounded-md px-3 text-xs font-semibold"
      aria-label={`Open ${title} repository on GitHub`}
      onClick={e => {
        e.stopPropagation()
        captureProjectSourceClicked(id, repo)
      }}>
      <GitHubIcon />
    </LinkButton>
  )
}
