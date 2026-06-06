import { AdminShell } from '@/components/admin/admin-shell'
import { LinkButton } from '@/components/ui/link-button'
import { Bot, Images } from 'lucide-react'
import type { Route } from 'next'
import { connection } from 'next/server'

export default async function AdminPage() {
  await connection()

  return (
    <AdminShell title="Admin" description="Private tools for kil.dev.">
      <div className="flex flex-wrap gap-3">
        <LinkButton href={'/admin/pet-gallery' as Route}>
          <Images aria-hidden="true" />
          Edit Pet Gallery
        </LinkButton>
        <LinkButton href={'/admin/ask-kilian' as Route}>
          <Bot aria-hidden="true" />
          Ask Kilian Admin
        </LinkButton>
      </div>
    </AdminShell>
  )
}
