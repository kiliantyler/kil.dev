import { AdminShell } from '@/components/admin/admin-shell'
import { LinkButton } from '@/components/ui/link-button'
import { requireAdminSession } from '@/lib/admin-auth'
import { Images } from 'lucide-react'
import type { Route } from 'next'

export default async function AdminPage() {
  await requireAdminSession()

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
