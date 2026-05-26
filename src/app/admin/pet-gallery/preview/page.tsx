import { AdminShell } from '@/components/admin/admin-shell'
import { ClientMounted, GalleryClient } from '@/components/layout/pet-gallery/gallery-client'
import { ServerAlbum } from '@/components/layout/pet-gallery/server-album'
import { requireAdminSession } from '@/lib/admin-auth'
import { buildPublicPetGallerySnapshot } from '@/lib/pet-gallery/snapshot'
import { getPetGalleryAdminWorkspaceStateAction } from '../actions'

export default async function AdminPetGalleryPreviewPage() {
  await requireAdminSession()
  const state = await getPetGalleryAdminWorkspaceStateAction()
  const snapshot = buildPublicPetGallerySnapshot({
    photos: state.photos,
    animals: state.animals,
    now: Date.now(),
    createRevision: () => 'draft-preview',
  })
  const visiblePhotos = snapshot.photos

  return (
    <AdminShell
      title="Draft Pet Gallery Preview"
      description="Authenticated preview of the current pet gallery draft before publishing."
      className="lg:px-20">
      <section>
        {visiblePhotos.length === 0 ? (
          <p className="border-l border-border py-2 pl-3 text-sm text-muted-foreground">No visible draft photos.</p>
        ) : (
          <ClientMounted fallback={<ServerAlbum photos={visiblePhotos} />}>
            <GalleryClient photos={visiblePhotos} />
          </ClientMounted>
        )}
      </section>
    </AdminShell>
  )
}
