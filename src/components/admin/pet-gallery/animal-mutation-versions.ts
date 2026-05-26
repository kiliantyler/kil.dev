export function nextAnimalMutationVersion(versions: Map<string, number>, animalId: string) {
  const version = (versions.get(animalId) ?? 0) + 1
  versions.set(animalId, version)
  return version
}

export function isCurrentAnimalMutationVersion(versions: Map<string, number>, animalId: string, version: number) {
  return versions.get(animalId) === version
}
