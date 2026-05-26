import { SiteAuthKitProvider } from '@/components/providers/authkit-provider'
import { requireAdminSession } from '@/lib/admin-auth'
import { Suspense } from 'react'

export async function AdminAuthGate({ children }: { children: React.ReactNode }) {
  await requireAdminSession()

  return <SiteAuthKitProvider>{children}</SiteAuthKitProvider>
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminAuthGate>{children}</AdminAuthGate>
    </Suspense>
  )
}
