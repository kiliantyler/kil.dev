import type { AskKilianKnowledgeCategory, AskKilianTier } from './types'

export type AskKilianAdminRetrievedContext = {
  stableKey: string
  title: string
  category: AskKilianKnowledgeCategory
  score: number
  text: string
}

export type AskKilianAdminContextPreviewInput = {
  prompt: string
  tier: AskKilianTier
  includeSpoilers: boolean
  categories: AskKilianKnowledgeCategory[]
  results: AskKilianAdminRetrievedContext[]
}

export function buildAskKilianAdminContextPreview(input: AskKilianAdminContextPreviewInput) {
  const categories = input.categories.length > 0 ? input.categories.join(', ') : 'all'
  const entries =
    input.results.length > 0
      ? input.results
          .map(
            (entry, index) =>
              `${index + 1}. [${entry.stableKey}] ${entry.title}\nCategory: ${entry.category}\nScore: ${entry.score.toFixed(3)}\n${entry.text}`,
          )
          .join('\n\n')
      : 'No retrieved entries.'

  return [
    'Ask Kilian admin context preview',
    '',
    `User prompt: ${input.prompt.trim()}`,
    `Tier: Tier ${input.tier}`,
    `Spoilers: ${input.includeSpoilers ? 'included' : 'excluded'}`,
    `Categories: ${categories}`,
    '',
    'Retrieved context:',
    entries,
    '',
    'KTY-66 will assemble the final system/persona/chat prompt.',
  ].join('\n')
}
