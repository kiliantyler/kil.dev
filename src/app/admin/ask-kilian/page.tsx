import { AdminShell } from '@/components/admin/admin-shell'
import { AskKilianAdminClient } from '@/components/admin/ask-kilian/ask-kilian-admin-client'
import { connection } from 'next/server'
import { getAskKilianAdminWorkspaceStateAction } from './actions'

export default async function AdminAskKilianPage() {
  await connection()
  const initialState = await getAskKilianAdminWorkspaceStateAction()

  return (
    <AdminShell
      title="Ask Kilian Admin"
      description="Knowledge cockpit for RAG operations, retrieval tests, and pre-chat context inspection."
      className="lg:px-20">
      <AskKilianAdminClient initialState={initialState} />
    </AdminShell>
  )
}
