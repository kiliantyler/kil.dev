import type { AskKilianTier } from './types'

export type AskKilianRetrievalFixture = {
  query: string
  expectedStableKeys: readonly string[]
  minimumTier?: AskKilianTier
}

export const ASK_KILIAN_RETRIEVAL_FIXTURES: readonly AskKilianRetrievalFixture[] = [
  {
    query: 'What did Kilian do at DraftKings?',
    expectedStableKeys: ['career:draftkings'],
  },
  {
    query: 'Tell me about the home Kubernetes cluster',
    expectedStableKeys: ['project:kubernetes'],
  },
  {
    query: 'Who is Lux?',
    expectedStableKeys: ['pet:lux'],
  },
  {
    query: 'What kind of pet is Gozer?',
    expectedStableKeys: ['pet:gozer'],
  },
  {
    query: 'What can I do on this site?',
    expectedStableKeys: ['site:home-content', 'site:navigation'],
  },
  {
    query: 'How should Ask Kilian sound?',
    expectedStableKeys: ['persona:ask-kilian-voice'],
  },
  {
    query: 'How do I unlock the secret console achievement?',
    expectedStableKeys: ['achievement:console-commander', 'fun:secret-console'],
    minimumTier: 1,
  },
  {
    query: 'What fake answer should be used for private facts in chaos mode?',
    expectedStableKeys: ['fun:fake-private-facts'],
    minimumTier: 2,
  },
]
