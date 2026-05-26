import { AdminShell } from '@/components/admin/admin-shell'
import { PetGalleryAdminClient } from '@/components/admin/pet-gallery/pet-gallery-admin-client'
import { connection } from 'next/server'
import { getPetGalleryAdminWorkspaceStateAction } from './actions'

export default async function AdminPetGalleryPage() {
  await connection()
  const initialState = await getPetGalleryAdminWorkspaceStateAction()

  return (
    <AdminShell
      title="Pet Gallery Admin"
      description="Draft photo, animal, upload, and publish controls for the private pet gallery."
      className="lg:px-20">
      <PetGalleryAdminClient initialState={initialState} />
    </AdminShell>
  )
}
