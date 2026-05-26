import { AdminShell } from '@/components/admin/admin-shell'
import { LinkButton } from '@/components/ui/link-button'
import { Images } from 'lucide-react'
import type { Route } from 'next'

export default function AdminPage() {
  return (
    <AdminShell title="Admin" description="Private tools for kil.dev.">
      <div className="flex">
        <LinkButton href={'/admin/pet-gallery' as Route}>
          <Images aria-hidden="true" />
          Edit Pet Gallery
        </LinkButton>
      </div>
    </AdminShell>
  )
}
