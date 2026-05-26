'use client'

import {
  bulkTagPetGalleryPhotosAction,
  cleanupUploadedPetGalleryVariantFilesAction,
  cleanupUploadThingFilesAction,
  createPetGalleryAnimalAction,
  createPetGalleryPhotoDraftAction,
  deletePetGalleryPhotoAction,
  getPetGalleryAdminWorkspaceStateAction,
  hidePetGalleryAnimalAction,
  publishPetGalleryAction,
  reorderPetGalleryAnimalsAction,
  reorderPetGalleryPhotosAction,
  restorePetGalleryAnimalAction,
  updatePetGalleryAnimalAction,
  updatePetGalleryPhotoDraftAction,
} from '@/app/admin/pet-gallery/actions'
import type {
  AdminWorkspaceAnimal,
  AdminWorkspaceAnimalPatch,
  AdminWorkspacePhoto,
  AdminWorkspacePhotoPatch,
  PetGalleryAdminWorkspaceState,
  PetGalleryPublishSummary,
  PhotoFilter,
  PhotoSort,
  UploadQueueItem,
} from '@/lib/pet-gallery/admin-workspace'
import { validateNewAnimalName } from '@/lib/pet-gallery/admin-workspace'
import { uploadFiles } from '@/lib/pet-gallery/uploadthing-client'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { isCurrentAnimalMutationVersion, nextAnimalMutationVersion } from './animal-mutation-versions'
import type { AnimalsTabProps } from './animals/animals-tab'
import { flushPendingPhotoPatchState } from './pending-photo-patches'
import {
  applyPhotoPatch,
  matchesPhotoFilter,
  matchesPhotoSearch,
  normalizeDraftOrder,
  removeCompletedUploadQueueItems,
  reorderPhotosByDropTarget,
  sortAdminPhotos,
  sortByDraftOrder,
} from './pet-gallery-admin-photo-utils'
import type { PhotosTabActions, PhotosTabData } from './photos/photos-tab'
import type { PublishTabProps } from './publish/publish-tab'
import { processPetGalleryUploadBatch } from './upload-workflow'

function firstActiveAnimalId(animals: AdminWorkspaceAnimal[]) {
  return animals.find(animal => !animal.hidden)?.stableId ?? ''
}

export function usePetGalleryAdminWorkspace(initialState: PetGalleryAdminWorkspaceState) {
  const [animals, setAnimals] = useState(initialState.animals)
  const [photos, setPhotos] = useState(initialState.photos)
  const [publishedOrderBaseline, setPublishedOrderBaseline] = useState(initialState.publishedOrderBaseline)
  const [queue, setQueue] = useState<UploadQueueItem[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [animalError, setAnimalError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PhotoFilter>('all')
  const [sort, setSort] = useState<PhotoSort>('manual')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(initialState.photos[0]?.stableId ?? null)
  const [selectedBulkAnimalId, setSelectedBulkAnimalId] = useState(firstActiveAnimalId(initialState.animals))
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [publishSummary, setPublishSummary] = useState<PetGalleryPublishSummary | null>(
    initialState.publishHistory[0] ?? null,
  )
  const [publishError, setPublishError] = useState<string | null>(null)
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null)
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const animalMutationVersions = useRef(new Map<string, number>())
  const pendingPhotoPatchTimeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pendingPhotoPatches = useRef(new Map<string, AdminWorkspacePhotoPatch>())
  const pendingPhotoSavePromises = useRef(new Set<Promise<unknown>>())
  const pendingMutationPromises = useRef(new Set<Promise<unknown>>())
  const isTestBypass = initialState.mode === 'test-bypass'

  useEffect(() => {
    const photoPatchTimeouts = pendingPhotoPatchTimeouts.current
    const warnAboutPendingEdits = (event: BeforeUnloadEvent) => {
      if (pendingPhotoPatches.current.size === 0) return
      event.preventDefault()
      event.returnValue = ''
    }

    globalThis.addEventListener('beforeunload', warnAboutPendingEdits)
    return () => {
      globalThis.removeEventListener('beforeunload', warnAboutPendingEdits)
      for (const timeout of photoPatchTimeouts.values()) {
        clearTimeout(timeout)
      }
      photoPatchTimeouts.clear()
    }
  }, [])

  const trackMutation = useCallback(<T>(mutation: Promise<T>) => {
    pendingMutationPromises.current.add(mutation)
    void mutation.then(
      () => pendingMutationPromises.current.delete(mutation),
      () => pendingMutationPromises.current.delete(mutation),
    )
    return mutation
  }, [])

  const trackPhotoSaveMutation = useCallback(
    <T>(mutation: Promise<T>) => {
      pendingPhotoSavePromises.current.add(mutation)
      void mutation.then(
        () => pendingPhotoSavePromises.current.delete(mutation),
        () => pendingPhotoSavePromises.current.delete(mutation),
      )
      return trackMutation(mutation)
    },
    [trackMutation],
  )

  const waitForPendingPhotoSaves = useCallback(async () => {
    while (pendingPhotoSavePromises.current.size > 0) {
      await Promise.all(pendingPhotoSavePromises.current)
    }
  }, [])

  const clearPendingPhotoPatch = useCallback((photoDocId: string) => {
    const timeout = pendingPhotoPatchTimeouts.current.get(photoDocId)
    if (timeout) clearTimeout(timeout)
    pendingPhotoPatchTimeouts.current.delete(photoDocId)
    pendingPhotoPatches.current.delete(photoDocId)
  }, [])

  const applyState = useCallback((state: PetGalleryAdminWorkspaceState) => {
    setAnimals(state.animals)
    setPhotos(state.photos.map(photo => applyPhotoPatch(photo, pendingPhotoPatches.current.get(photo.docId))))
    setPublishedOrderBaseline(state.publishedOrderBaseline)
    setSelectedBulkAnimalId(current => {
      const currentAnimal = state.animals.find(animal => animal.stableId === current)
      return currentAnimal && !currentAnimal.hidden ? current : firstActiveAnimalId(state.animals)
    })
    setSelectedIds(current => current.filter(id => state.photos.some(photo => photo.stableId === id)))
    setSelectedPhotoId(current => {
      if (current && state.photos.some(photo => photo.stableId === current)) return current
      return state.photos[0]?.stableId ?? null
    })
  }, [])

  const flushPendingPhotoPatches = useCallback(async () => {
    await flushPendingPhotoPatchState({
      pending: {
        patches: pendingPhotoPatches.current,
        timeouts: pendingPhotoPatchTimeouts.current,
      },
      savePatch: updatePetGalleryPhotoDraftAction,
      trackMutation: trackPhotoSaveMutation,
    })
    await waitForPendingPhotoSaves()
  }, [trackPhotoSaveMutation, waitForPendingPhotoSaves])

  const visiblePhotos = useMemo(
    () =>
      sortAdminPhotos(
        photos.filter(photo => matchesPhotoFilter(photo, filter) && matchesPhotoSearch(photo, animals, search)),
        animals,
        sort,
      ),
    [animals, filter, photos, search, sort],
  )

  const selectedPhoto = photos.find(photo => photo.stableId === selectedPhotoId) ?? photos[0] ?? null

  const handleFiles = useCallback(
    (files: File[]) => {
      setUploadError(null)
      const queuedItems = files.map(file => ({
        id: `${file.name}-${file.lastModified}-${file.size}-${crypto.randomUUID()}`,
        filename: file.name,
        status: isTestBypass ? ('ready' as const) : ('queued' as const),
        message: isTestBypass ? 'Ready for UploadThing variants' : 'Queued for UploadThing variants',
      }))

      setQueue(current => [...current, ...queuedItems])

      if (isTestBypass) return

      void processPetGalleryUploadBatch({
        files,
        queuedItems,
        photos,
        deps: {
          uploadFiles,
          createPhotoDraft: createPetGalleryPhotoDraftAction,
          cleanupFiles: cleanupUploadedPetGalleryVariantFilesAction,
          refreshState: getPetGalleryAdminWorkspaceStateAction,
        },
        onQueueItemChange: (itemId, patch) => {
          setQueue(current => current.map(item => (item.id === itemId ? { ...item, ...patch } : item)))
        },
        onQueueItemsComplete: itemIds => {
          setQueue(current => removeCompletedUploadQueueItems(current, itemIds))
        },
        onUploadError: setUploadError,
        onState: applyState,
      })
    },
    [applyState, isTestBypass, photos],
  )

  const persistPhotoPatch = useCallback(
    (photo: AdminWorkspacePhoto, patch: AdminWorkspacePhotoPatch) => {
      if (isTestBypass) return

      const patchToPersist = {
        title: patch.title,
        caption: patch.caption,
        altText: patch.altText,
        internalNotes: patch.internalNotes,
        animalIds: patch.animalIds,
        draftVisible: patch.draftVisible,
        favorite: patch.favorite,
        cover: patch.cover,
        approximateDate: patch.approximateDate,
      }
      const shouldDebounce =
        patch.title !== undefined ||
        patch.caption !== undefined ||
        patch.altText !== undefined ||
        patch.internalNotes !== undefined ||
        patch.approximateDate !== undefined

      if (!shouldDebounce) {
        const mutation = trackPhotoSaveMutation(updatePetGalleryPhotoDraftAction(photo.docId, patchToPersist))
        startTransition(() => {
          void mutation.catch(error => {
            setPhotoError(error instanceof Error ? error.message : 'Unable to save photo changes')
          })
        })
        return
      }

      pendingPhotoPatches.current.set(photo.docId, {
        ...pendingPhotoPatches.current.get(photo.docId),
        ...patchToPersist,
      })

      const currentTimeout = pendingPhotoPatchTimeouts.current.get(photo.docId)
      if (currentTimeout) clearTimeout(currentTimeout)

      pendingPhotoPatchTimeouts.current.set(
        photo.docId,
        setTimeout(() => {
          const pendingPatch = pendingPhotoPatches.current.get(photo.docId)
          pendingPhotoPatchTimeouts.current.delete(photo.docId)
          if (!pendingPatch) return

          const mutation = trackPhotoSaveMutation(
            updatePetGalleryPhotoDraftAction(photo.docId, pendingPatch).then(result => {
              if (pendingPhotoPatches.current.get(photo.docId) === pendingPatch) {
                pendingPhotoPatches.current.delete(photo.docId)
              }
              return result
            }),
          )
          startTransition(() => {
            void mutation.catch(error => {
              setPhotoError(error instanceof Error ? error.message : 'Unable to save photo changes')
            })
          })
        }, 350),
      )
    },
    [isTestBypass, trackPhotoSaveMutation],
  )

  const updatePhotoDraft = useCallback(
    (photoId: string, patch: AdminWorkspacePhotoPatch) => {
      setPhotos(current => current.map(photo => (photo.stableId === photoId ? applyPhotoPatch(photo, patch) : photo)))
      const photo = photos.find(item => item.stableId === photoId)
      if (photo) persistPhotoPatch(photo, patch)
    },
    [persistPhotoPatch, photos],
  )

  const deletePhoto = useCallback(
    (photoId: string) => {
      const photo = photos.find(item => item.stableId === photoId)
      const previousPhotos = photos
      const previousSelectedIds = selectedIds
      const previousSelectedPhotoId = selectedPhotoId
      setPhotoError(null)
      setPhotos(current => normalizeDraftOrder(current.filter(photo => photo.stableId !== photoId)))
      setSelectedIds(current => current.filter(id => id !== photoId))
      if (selectedPhotoId === photoId) {
        setSelectedPhotoId(photos.find(photo => photo.stableId !== photoId)?.stableId ?? null)
      }
      if (!isTestBypass && photo) {
        const deletedPhotoPendingPatch = pendingPhotoPatches.current.get(photo.docId)
        clearPendingPhotoPatch(photo.docId)
        const deletion = flushPendingPhotoPatches()
          .then(() => deletePetGalleryPhotoAction(photo.docId))
          .then(result => {
            if (!result.ok || result.error || result.revalidationError) {
              setPhotoError(result.error ?? result.revalidationError ?? 'Photo deleted, but file cleanup needs retry')
            }
            if (result.state) applyState(result.state)
          })
          .catch(error => {
            if (deletedPhotoPendingPatch) {
              pendingPhotoPatches.current.set(photo.docId, deletedPhotoPendingPatch)
            }
            setPhotoError(error instanceof Error ? error.message : 'Unable to delete photo')
            setPhotos(previousPhotos)
            setSelectedIds(previousSelectedIds)
            setSelectedPhotoId(previousSelectedPhotoId)
            throw error
          })
        const trackedDeletion = trackMutation(deletion)
        startTransition(() => {
          void trackedDeletion.catch(() => null)
        })
      }
    },
    [
      applyState,
      clearPendingPhotoPatch,
      flushPendingPhotoPatches,
      isTestBypass,
      photos,
      selectedIds,
      selectedPhotoId,
      trackMutation,
    ],
  )

  const toggleSelected = useCallback((photoId: string, selected: boolean) => {
    setSelectedIds(current => {
      if (selected) return current.includes(photoId) ? current : [...current, photoId]
      return current.filter(id => id !== photoId)
    })
  }, [])

  const selectVisiblePhotos = useCallback(() => {
    setSelectedIds(visiblePhotos.map(photo => photo.stableId))
  }, [visiblePhotos])

  const clearSelectedPhotos = useCallback(() => {
    setSelectedIds([])
  }, [])

  const bulkTagPhotos = useCallback(() => {
    const animal = animals.find(item => item.stableId === selectedBulkAnimalId)
    if (!animal || animal.hidden || selectedIds.length === 0) {
      setBulkMessage(animal?.hidden ? `${animal.name} is hidden from new tagging` : null)
      return
    }

    setPhotos(current =>
      current.map(photo => {
        if (!selectedIds.includes(photo.stableId) || photo.animalIds.includes(animal.stableId)) return photo
        return { ...photo, animalIds: [...photo.animalIds, animal.stableId] }
      }),
    )
    setBulkMessage(`${selectedIds.length} photos tagged with ${animal.name}`)
    if (!isTestBypass) {
      const photoDocIds = photos.filter(photo => selectedIds.includes(photo.stableId)).map(photo => photo.docId)
      const mutation = trackMutation(
        (async () => {
          await flushPendingPhotoPatches()
          const result = await bulkTagPetGalleryPhotosAction(photoDocIds, [animal.docId], 'add')
          applyState(result)
          return result
        })(),
      )
      startTransition(() => {
        void mutation.catch(error => {
          setBulkMessage(error instanceof Error ? error.message : 'Unable to tag selected photos')
        })
      })
    }
  }, [
    animals,
    applyState,
    flushPendingPhotoPatches,
    isTestBypass,
    photos,
    selectedBulkAnimalId,
    selectedIds,
    trackMutation,
  ])

  const updateBulkVisibility = useCallback(
    (visible: boolean) => {
      const selectedPhotoIds = new Set(selectedIds)
      const previousVisibilityById = new Map(
        photos.filter(photo => selectedPhotoIds.has(photo.stableId)).map(photo => [photo.stableId, photo.draftVisible]),
      )
      setPhotos(current =>
        current.map(photo => (selectedPhotoIds.has(photo.stableId) ? { ...photo, draftVisible: visible } : photo)),
      )
      setBulkMessage(`${selectedIds.length} photos marked ${visible ? 'visible' : 'hidden'}`)
      if (!isTestBypass) {
        const selectedPhotos = photos.filter(photo => selectedPhotoIds.has(photo.stableId))
        const mutation = trackMutation(
          (async () => {
            await flushPendingPhotoPatches()
            await Promise.all(
              selectedPhotos.map(photo => updatePetGalleryPhotoDraftAction(photo.docId, { draftVisible: visible })),
            )
          })(),
        )
        startTransition(() => {
          void mutation.catch(async error => {
            setBulkMessage(error instanceof Error ? error.message : 'Unable to update selected photos')
            try {
              applyState(await getPetGalleryAdminWorkspaceStateAction())
            } catch {
              setPhotos(current =>
                current.map(photo => {
                  const previousVisibility = previousVisibilityById.get(photo.stableId)
                  return previousVisibility === undefined ? photo : { ...photo, draftVisible: previousVisibility }
                }),
              )
            }
          })
        })
      }
    },
    [applyState, flushPendingPhotoPatches, isTestBypass, photos, selectedIds, trackMutation],
  )

  const reorderPhotos = useCallback(
    (draggedPhotoId: string, targetPhotoId: string, position: 'before' | 'after') => {
      setPhotos(current => {
        const ordered = sortByDraftOrder(current)
        const reordered = reorderPhotosByDropTarget(ordered, draggedPhotoId, targetPhotoId, position)
        if (ordered.map(photo => photo.stableId).join('\0') === reordered.map(photo => photo.stableId).join('\0')) {
          return current
        }

        if (!isTestBypass) {
          const mutation = trackMutation(
            (async () => {
              await flushPendingPhotoPatches()
              const result = await reorderPetGalleryPhotosAction(reordered.map(photo => photo.docId))
              applyState(result)
              return result
            })(),
          )
          startTransition(() => {
            void mutation.catch(error => {
              setPhotoError(error instanceof Error ? error.message : 'Unable to reorder photos')
            })
          })
        }
        return reordered
      })
    },
    [applyState, flushPendingPhotoPatches, isTestBypass, trackMutation],
  )

  const createAnimal = useCallback(
    (name: string) => {
      try {
        const stableId = validateNewAnimalName(name, animals)
        setAnimalError(null)
        if (isTestBypass) {
          setAnimals(current => [
            ...current,
            {
              docId: `animals:${stableId}`,
              stableId,
              name,
              species: 'cat',
              order: current.length + 1,
              hidden: false,
            },
          ])
          return
        }
        const mutation = trackMutation(
          (async () => {
            await flushPendingPhotoPatches()
            const result = await createPetGalleryAnimalAction(name)
            applyState(result)
            return result
          })(),
        )
        startTransition(() => {
          void mutation.catch(error => {
            setAnimalError(error instanceof Error ? error.message : 'Unable to create animal')
          })
        })
      } catch (error) {
        setAnimalError(error instanceof Error ? error.message : 'Unable to create animal')
      }
    },
    [animals, applyState, flushPendingPhotoPatches, isTestBypass, trackMutation],
  )

  const updateAnimal = useCallback(
    (animalId: string, patch: AdminWorkspaceAnimalPatch) => {
      setAnimals(current => current.map(animal => (animal.stableId === animalId ? { ...animal, ...patch } : animal)))
      if (isTestBypass) return
      const animal = animals.find(item => item.stableId === animalId)
      if (!animal) return
      const version = nextAnimalMutationVersion(animalMutationVersions.current, animalId)
      const mutation = trackMutation(
        (async () => {
          await flushPendingPhotoPatches()
          const result = await updatePetGalleryAnimalAction(animal.docId, patch)
          if (isCurrentAnimalMutationVersion(animalMutationVersions.current, animalId, version)) applyState(result)
          return result
        })(),
      )
      startTransition(() => {
        void mutation.catch(error => {
          setAnimalError(error instanceof Error ? error.message : 'Unable to update animal')
        })
      })
    },
    [animals, applyState, flushPendingPhotoPatches, isTestBypass, trackMutation],
  )

  const reorderAnimals = useCallback(
    (orderedAnimalIds: string[]) => {
      const orderByStableId = new Map(orderedAnimalIds.map((animalId, index) => [animalId, index + 1]))
      setAnimalError(null)
      setAnimals(current =>
        current
          .map(animal => {
            const order = orderByStableId.get(animal.stableId)
            return order ? { ...animal, order } : animal
          })
          .toSorted(
            (first, second) =>
              (first.order ?? 0) - (second.order ?? 0) || first.stableId.localeCompare(second.stableId),
          ),
      )
      if (isTestBypass) return
      const mutation = trackMutation(
        (async () => {
          await flushPendingPhotoPatches()
          const result = await reorderPetGalleryAnimalsAction(orderedAnimalIds)
          applyState(result)
          return result
        })(),
      )
      startTransition(() => {
        void mutation.catch(error => {
          setAnimalError(error instanceof Error ? error.message : 'Unable to reorder animals')
        })
      })
    },
    [applyState, flushPendingPhotoPatches, isTestBypass, trackMutation],
  )

  const hideAnimal = useCallback(
    (animalId: string) => {
      setAnimals(current =>
        current.map(animal => (animal.stableId === animalId ? { ...animal, hidden: true } : animal)),
      )
      setSelectedBulkAnimalId(current =>
        current === animalId ? firstActiveAnimalId(animals.filter(animal => animal.stableId !== animalId)) : current,
      )
      if (isTestBypass) return
      const animal = animals.find(item => item.stableId === animalId)
      if (!animal) return
      const mutation = trackMutation(
        (async () => {
          await flushPendingPhotoPatches()
          const result = await hidePetGalleryAnimalAction(animal.docId)
          applyState(result)
          return result
        })(),
      )
      startTransition(() => {
        void mutation.catch(error => {
          setAnimalError(error instanceof Error ? error.message : 'Unable to hide animal')
        })
      })
    },
    [animals, applyState, flushPendingPhotoPatches, isTestBypass, trackMutation],
  )

  const restoreAnimal = useCallback(
    (animalId: string) => {
      setAnimals(current =>
        current.map(animal => (animal.stableId === animalId ? { ...animal, hidden: false } : animal)),
      )
      setSelectedBulkAnimalId(current => current || animalId)
      if (isTestBypass) return
      const animal = animals.find(item => item.stableId === animalId)
      if (!animal) return
      const mutation = trackMutation(
        (async () => {
          await flushPendingPhotoPatches()
          const result = await restorePetGalleryAnimalAction(animal.docId)
          applyState(result)
          return result
        })(),
      )
      startTransition(() => {
        void mutation.catch(error => {
          setAnimalError(error instanceof Error ? error.message : 'Unable to restore animal')
        })
      })
    },
    [animals, applyState, flushPendingPhotoPatches, isTestBypass, trackMutation],
  )

  const publishDraft = useCallback(() => {
    setPublishError(null)
    if (isPublishing) return
    if (isTestBypass) {
      setPublishSummary({
        revision: `test-${Date.now()}`,
        publishedAt: Date.now(),
        photoCount: photos.filter(photo => photo.draftVisible).length,
        animalCount: animals.filter(animal => !animal.hidden).length,
      })
      return
    }
    setIsPublishing(true)
    startTransition(() => {
      void flushPendingPhotoPatches()
        .then(publishPetGalleryAction)
        .then(result => {
          setPublishSummary(result.state.publishHistory[0] ?? result.summary)
          applyState(result.state)
        })
        .catch(error => setPublishError(error instanceof Error ? error.message : 'Unable to publish draft'))
        .finally(() => setIsPublishing(false))
    })
  }, [animals, applyState, flushPendingPhotoPatches, isPublishing, isTestBypass, photos])

  const retryFileCleanup = useCallback(() => {
    setPublishError(null)
    setCleanupMessage(null)
    if (isCleaningUp) return

    if (isTestBypass) {
      setCleanupMessage('No pending cleanup files in test mode.')
      return
    }

    setIsCleaningUp(true)
    startTransition(() => {
      void cleanupUploadThingFilesAction()
        .then(result => {
          setCleanupMessage(
            `Checked ${result.checked} cleanup records; ${result.complete} complete, ${result.failed} failed.`,
          )
        })
        .catch(error => {
          setPublishError(error instanceof Error ? error.message : 'Unable to retry file cleanup')
        })
        .finally(() => setIsCleaningUp(false))
    })
  }, [isCleaningUp, isTestBypass])

  const flushPhotoEdits: PhotosTabActions['onFlushPhoto'] = useCallback(() => {
    void flushPendingPhotoPatches().catch(error => {
      setPhotoError(error instanceof Error ? error.message : 'Unable to save photo changes')
    })
  }, [flushPendingPhotoPatches])

  const photosData: PhotosTabData = {
    animals,
    selectedPhoto,
    selectedPhotoId: selectedPhoto?.stableId ?? null,
    selectedIds,
    search,
    filter,
    sort,
    visiblePhotos,
    manualOrderCount: photos.length,
    publishedOrderCount: publishedOrderBaseline.length,
    queue,
    uploadError,
    photoError,
    selectedBulkAnimalId,
    bulkMessage,
  }

  const photosActions: PhotosTabActions = {
    onFiles: handleFiles,
    onUploadError: setUploadError,
    onSearchChange: setSearch,
    onFilterChange: setFilter,
    onSortChange: setSort,
    onSelectPhoto: setSelectedPhotoId,
    onToggleSelected: toggleSelected,
    onSelectVisible: selectVisiblePhotos,
    onClearSelection: clearSelectedPhotos,
    onReorder: reorderPhotos,
    onUpdatePhoto: updatePhotoDraft,
    onFlushPhoto: flushPhotoEdits,
    onDeletePhoto: deletePhoto,
    onSelectedBulkAnimalChange: setSelectedBulkAnimalId,
    onApplyBulkAnimal: bulkTagPhotos,
    onBulkVisibilityChange: updateBulkVisibility,
  }

  const animalsTab: AnimalsTabProps = {
    animals,
    error: animalError,
    onCreateAnimal: createAnimal,
    onUpdateAnimal: updateAnimal,
    onReorderAnimals: reorderAnimals,
    onHideAnimal: hideAnimal,
    onRestoreAnimal: restoreAnimal,
  }

  const publishTab: PublishTabProps = {
    photos,
    animals,
    summary: publishSummary,
    error: publishError,
    isPending: isPending || isPublishing,
    cleanupMessage,
    isCleaningUp,
    onPublish: publishDraft,
    onRetryCleanup: retryFileCleanup,
  }

  return {
    status: {
      photos,
      animals,
      selectedCount: selectedIds.length,
    },
    photosTab: {
      data: photosData,
      actions: photosActions,
    },
    animalsTab,
    publishTab,
  }
}
