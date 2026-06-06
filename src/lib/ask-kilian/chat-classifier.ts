import type { AskKilianKnowledgeCategory, AskKilianTier } from './types'

export type AskKilianClassificationScope =
  | 'allowed'
  | 'general_ai_misuse'
  | 'private_fact_fishing'
  | 'achievement_spoiler_request'
  | 'ambiguous_valid'
  | 'ambiguous_risky'

export type AskKilianClassificationBehavior = 'answer' | 'clarify' | 'refuse' | 'redirect' | 'fake_lore'
export type AskKilianClassificationSource = 'deterministic' | 'llm' | 'fail_closed'

export type AskKilianClassificationDecision = {
  scope: AskKilianClassificationScope
  behavior: AskKilianClassificationBehavior
  topic: AskKilianKnowledgeCategory | 'safety' | 'unknown'
  reason: string
  source: AskKilianClassificationSource
}

export type AskKilianLlmClassifier = (input: {
  prompt: string
  tier: AskKilianTier
}) => Promise<AskKilianClassificationDecision>

export type ClassifyAskKilianPromptInput = {
  prompt: string
  tier: AskKilianTier
  llmClassify?: AskKilianLlmClassifier
}

type DeterministicRule = {
  topic: AskKilianClassificationDecision['topic']
  patterns: readonly RegExp[]
}

const PRIVATE_FACT_PATTERNS = [
  /\b(home|house|apartment|street|mailing)\s+address\b/u,
  /\bwhere\s+(does|is)\s+kilian\s+(live|located|staying)\b/u,
  /\b(?:personal|private)\s+(?:phone|email|address|contact)\b/u,
  /\b(?:phone|cell|mobile)\s+number\b/u,
  /\bdate\s+of\s+birth\b/u,
  /\bsocial\s+security\b/u,
  /\bssn\b/u,
  /\bpassword\b/u,
] as const

const GENERAL_AI_MISUSE_PATTERNS = [
  /\b(?:make|create|build|write|generate)\s+(?:my|me|a|an|the|this)\b.*\b(?:app|website|component|code|script|api|essay|homework)\b/u,
  /\b(?:make|create|build|write|generate)\b.*\b(?:app|website|component|code|script|api|essay|homework)\b.*\bfor\s+me\b/u,
  /\bfix\s+(?:my|this)\b.*\b(?:code|bug|app|website|component)\b/u,
  /\bdebug\s+(?:my|this)\b.*\b(?:code|bug|app|website|component)\b/u,
  /\b(?:generate|draft|summarize|rewrite|translate)\s+(?:this|my|me|a|an|the)\b/u,
] as const

const ACHIEVEMENT_SPOILER_PATTERNS = [
  /\b(?:exact|all|full|complete)\b.*\b(?:achievement|achievements|badge|badges|secret|secrets)\b/u,
  /\b(?:achievement|achievements|badge|badges|secret|secrets)\b.*\b(?:answers|spoilers|unlock|hidden|exact)\b/u,
  /\bhow\s+(?:do|can)\s+i\s+unlock\b.*\b(?:achievement|achievements|badge|badges|secret|secrets)\b/u,
] as const

const TOPIC_RULES: readonly DeterministicRule[] = [
  {
    topic: 'projects',
    patterns: [/\b(?:project|projects|convex|vercel|kil\.dev|github)\b/u],
  },
  {
    topic: 'career',
    patterns: [/\b(?:career|work|job|role|roles|experience|resume|background|company|companies)\b/u],
  },
  {
    topic: 'pets',
    patterns: [/\b(?:pet|pets|cat|cats|dog|dogs|animal|animals)\b/u],
  },
  {
    topic: 'site',
    patterns: [/\b(?:site|website|kil\.dev|page|pages|blog|portfolio)\b/u],
  },
  {
    topic: 'achievements',
    patterns: [/\b(?:achievement|achievements|badge|badges|hint|hints)\b/u],
  },
  {
    topic: 'themes',
    patterns: [/\b(?:theme|themes|color|colors|palette|palettes|dark\s+mode|light\s+mode)\b/u],
  },
  {
    topic: 'persona',
    patterns: [/\b(?:kilian|voice|tone|personality|opinions|style)\b/u],
  },
  {
    topic: 'quickfacts',
    patterns: [/\b(?:quick\s*fact|quickfacts|fact|facts|where\s+is\s+kilian\s+from|who\s+is\s+kilian)\b/u],
  },
  {
    topic: 'fun',
    patterns: [/\b(?:favorite|favourite|fun|joke|music|hobby|hobbies|games?)\b/u],
  },
] as const

export async function classifyAskKilianPrompt(
  input: ClassifyAskKilianPromptInput,
): Promise<AskKilianClassificationDecision> {
  const prompt = input.prompt.trim()
  const normalizedPrompt = normalizePrompt(prompt)

  const privateFactDecision = classifyPrivateFactFishing(normalizedPrompt, input.tier)
  if (privateFactDecision !== undefined) {
    return privateFactDecision
  }

  if (matchesAny(normalizedPrompt, GENERAL_AI_MISUSE_PATTERNS)) {
    return {
      scope: 'general_ai_misuse',
      behavior: 'redirect',
      topic: 'safety',
      reason: 'Ask Kilian answers questions about Kilian and kil.dev, not general-purpose AI work.',
      source: 'deterministic',
    }
  }

  if (matchesAny(normalizedPrompt, ACHIEVEMENT_SPOILER_PATTERNS)) {
    return {
      scope: 'achievement_spoiler_request',
      behavior: 'redirect',
      topic: 'achievements',
      reason: 'The prompt asks for achievement spoilers or exact unlock instructions.',
      source: 'deterministic',
    }
  }

  const supportedTopic = classifySupportedTopic(normalizedPrompt)
  if (supportedTopic !== undefined) {
    return {
      scope: 'allowed',
      behavior: 'answer',
      topic: supportedTopic,
      reason: `The prompt matches the supported Ask Kilian ${supportedTopic} topic.`,
      source: 'deterministic',
    }
  }

  if (input.llmClassify !== undefined) {
    return input.llmClassify({ prompt, tier: input.tier })
  }

  return {
    scope: 'ambiguous_valid',
    behavior: 'clarify',
    topic: 'unknown',
    reason: 'The prompt is not clearly unsafe, but deterministic rules could not map it to a supported topic.',
    source: 'fail_closed',
  }
}

function classifyPrivateFactFishing(
  normalizedPrompt: string,
  tier: AskKilianTier,
): AskKilianClassificationDecision | undefined {
  if (!matchesAny(normalizedPrompt, PRIVATE_FACT_PATTERNS)) {
    return undefined
  }

  return {
    scope: 'private_fact_fishing',
    behavior: tier === 2 ? 'fake_lore' : 'refuse',
    topic: 'safety',
    reason:
      tier === 2
        ? 'Tier 2 turns private-fact fishing into obvious fake lore.'
        : 'Private facts are not available below Tier 2.',
    source: 'deterministic',
  }
}

function classifySupportedTopic(normalizedPrompt: string): AskKilianKnowledgeCategory | undefined {
  const rule = TOPIC_RULES.find(rule => matchesAny(normalizedPrompt, rule.patterns))

  return rule?.topic === 'safety' || rule?.topic === 'unknown' ? undefined : rule?.topic
}

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(value))
}

function normalizePrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036F]/gu, '')
    .replaceAll(/[’‘]/gu, "'")
}
