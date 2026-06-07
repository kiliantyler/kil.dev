import { createHash } from 'node:crypto'

import { ACHIEVEMENTS } from '@/lib/achievements'
import { HOME_CONTENT } from '@/lib/content'
import { SKILL_CATEGORIES, WORK_HISTORY } from '@/lib/experience'
import { NAVIGATION } from '@/lib/navmenu'
import { PETS } from '@/lib/pets'
import { projects } from '@/lib/projects'
import { QUICK_FACTS } from '@/lib/quickfacts'
import { themes } from '@/lib/themes'
import { stableStringify } from '@/utils/stable-stringify'

import type { ThemeConfig } from '@/types/themes'
import type { AskKilianKnowledgeCategory, AskKilianKnowledgeEntry, AskKilianSpoilerLevel, AskKilianTier } from './types'

const ASK_KILIAN_KNOWLEDGE_SOURCE_GLOBS = [
  'src/lib/achievements.ts',
  'src/lib/content.ts',
  'src/lib/experience.ts',
  'src/lib/navmenu.ts',
  'src/lib/pets.ts',
  'src/lib/projects.ts',
  'src/lib/quickfacts.ts',
  'src/lib/themes.ts',
  'src/lib/ask-kilian/**',
  'src/types/themes.ts',
  'src/utils/stable-stringify.ts',
] as const

type EntryInput = Omit<AskKilianKnowledgeEntry, 'contentHash' | 'source' | 'status'>

function escapeRegExp(value: string) {
  return value.replaceAll(/[\\^$+?.()|[\]{}]/g, String.raw`\$&`)
}

function globToRegExp(glob: string) {
  let pattern = ''

  for (let index = 0; index < glob.length; index += 1) {
    const character = glob.charAt(index)
    if (character !== '*') {
      pattern += escapeRegExp(character)
      continue
    }

    if (glob[index + 1] === '*') {
      pattern += '.*'
      index += 1
      continue
    }

    pattern += '[^/]*'
  }

  return new RegExp(`^${pattern}$`)
}

const askKilianKnowledgeSourcePathMatchers = ASK_KILIAN_KNOWLEDGE_SOURCE_GLOBS.map(globToRegExp)

export function isAskKilianKnowledgeSourcePathCovered(sourcePath: string) {
  return askKilianKnowledgeSourcePathMatchers.some(matcher => matcher.test(sourcePath))
}

export function normalizeKnowledgeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
}

function compactLines(lines: Array<string | number | null | undefined | false>) {
  return lines.filter(line => line !== undefined && line !== null && line !== false && `${line}`.trim()).join('\n')
}

function hashEntry(entry: Omit<AskKilianKnowledgeEntry, 'contentHash'>) {
  return createHash('sha256').update(stableStringify(entry)).digest('hex')
}

function createEntry(input: EntryInput): AskKilianKnowledgeEntry {
  const entryWithoutHash = { ...input, source: 'repo' as const, status: 'active' as const }
  return { ...entryWithoutHash, contentHash: hashEntry(entryWithoutHash) }
}

function sourceEntry(
  category: AskKilianKnowledgeCategory,
  stableKey: string,
  title: string,
  text: string,
  sourcePath: string,
  options: { minTier?: AskKilianTier; spoilerLevel?: AskKilianSpoilerLevel; importance?: number } = {},
) {
  return createEntry({
    stableKey,
    category,
    title,
    text,
    sourcePath,
    minTier: options.minTier ?? 0,
    spoilerLevel: options.spoilerLevel ?? 'none',
    importance: options.importance ?? 0.7,
  })
}

function formatDateRange(from: string, to?: string) {
  return to ? `${from} to ${to}` : `${from} to present`
}

function buildCareerEntries() {
  return WORK_HISTORY.map(job =>
    sourceEntry(
      'career',
      `career:${job.id}`,
      `${job.company}: ${job.role}`,
      compactLines([
        `Company: ${job.company}`,
        `Role: ${job.role}`,
        `Dates: ${formatDateRange(job.from, job.to)}`,
        `Work location: ${job.workLocation.location}`,
        job.officeLocation ? `Office location: ${job.officeLocation.location}` : undefined,
        job.summary ? `Summary: ${job.summary}` : undefined,
        job.highlights?.length ? `Highlights: ${job.highlights.join('; ')}` : undefined,
        job.skills?.length ? `Skills: ${job.skills.join(', ')}` : undefined,
        job.companyUrl ? `Company URL: ${job.companyUrl}` : undefined,
      ]),
      'src/lib/experience.ts',
      { importance: 0.9 },
    ),
  )
}

function buildSkillEntries() {
  return SKILL_CATEGORIES.map(category =>
    sourceEntry(
      'career',
      `career:skills:${category.id}`,
      `Skill category: ${category.label}`,
      compactLines([`Skill category: ${category.label}`, `Skills: ${category.items.join(', ')}`]),
      'src/lib/experience.ts',
      { importance: 0.75 },
    ),
  )
}

function buildProjectEntries() {
  return projects.map(project =>
    sourceEntry(
      'projects',
      `project:${project.id}`,
      project.title,
      compactLines([
        `Project: ${project.title}`,
        `Description: ${project.description}`,
        project.year ? `Year: ${project.year}` : undefined,
        project.status ? `Status: ${project.status}` : undefined,
        project.tags.length ? `Technology: ${project.tags.join(', ')}` : undefined,
        project.href ? `URL: ${project.href}` : undefined,
        project.repo ? `Repository: ${project.repo}` : undefined,
        `Image alt: ${project.imageAlt}`,
      ]),
      'src/lib/projects.ts',
      { importance: 0.85 },
    ),
  )
}

function buildPetEntries() {
  return PETS.map(pet =>
    sourceEntry(
      'pets',
      `pet:${pet.id}`,
      pet.name,
      compactLines([
        `Pet: ${pet.name}`,
        `Type: ${pet.type}`,
        `Breed: ${pet.breed}`,
        `Birthday: ${pet.birthday}`,
        `Gender: ${pet.gender}`,
        `Description: ${pet.description}`,
        `Image alt: ${pet.imageAlt}`,
      ]),
      'src/lib/pets.ts',
      { importance: 0.8 },
    ),
  )
}

function buildQuickFactEntries() {
  return QUICK_FACTS.map(fact =>
    sourceEntry(
      'quickfacts',
      `quickfact:${fact.id}`,
      `Quick fact: ${fact.label}`,
      compactLines([
        `Quick fact: ${fact.label}`,
        `Value: ${String(fact.value)}`,
        fact.note ? `Note: ${fact.note}` : undefined,
        fact.href ? `Reference: ${fact.href}` : undefined,
      ]),
      'src/lib/quickfacts.ts',
      { importance: 0.7 },
    ),
  )
}

function buildSiteEntries() {
  return [
    sourceEntry(
      'site',
      'site:home-content',
      'kil.dev home content',
      compactLines([
        `Name: ${HOME_CONTENT.NAME}`,
        `Title: ${HOME_CONTENT.TITLE}`,
        `Location: ${HOME_CONTENT.LOCATION}`,
        `Location note: ${HOME_CONTENT.LOCATION_TOOLTIP}`,
        "Site: kil.dev is Kilian Tyler's personal site for experience, projects, pets, themes, achievements, and playful interactions.",
      ]),
      'src/lib/content.ts',
      { importance: 0.8 },
    ),
    sourceEntry(
      'site',
      'site:navigation',
      'kil.dev navigation',
      compactLines(NAVIGATION.map(item => `Navigation item: ${item.label} at ${item.href}`)),
      'src/lib/navmenu.ts',
      { importance: 0.65 },
    ),
  ]
}

function buildAchievementEntries() {
  return Object.values(ACHIEVEMENTS).map(achievement =>
    sourceEntry(
      'achievements',
      `achievement:${normalizeKnowledgeKey(achievement.id)}`,
      achievement.title,
      compactLines([`Achievement: ${achievement.title}`, `Hint: ${achievement.unlockHint}`]),
      'src/lib/achievements.ts',
      { minTier: 1, spoilerLevel: 'hint', importance: 0.65 },
    ),
  )
}

function formatThemeAvailability(theme: ThemeConfig) {
  if (theme.alwaysHidden) return 'always hidden'
  if (theme.hiddenFromMenu) return 'hidden from the normal theme menu'
  if (theme.timeRange)
    return `seasonal from ${theme.timeRange.start.month}/${theme.timeRange.start.day} to ${theme.timeRange.end.month}/${theme.timeRange.end.day}`
  return 'available in the theme menu'
}

function buildThemeEntries() {
  return themes.map(theme => {
    const themeConfig: ThemeConfig = theme
    const isGatedTheme = themeConfig.hiddenFromMenu || themeConfig.alwaysHidden

    return sourceEntry(
      'themes',
      `theme:${normalizeKnowledgeKey(themeConfig.name)}`,
      `Theme: ${themeConfig.name}`,
      compactLines([
        `Theme: ${themeConfig.name}`,
        `Base color: ${themeConfig.baseColor}`,
        `Availability: ${formatThemeAvailability(themeConfig)}`,
        themeConfig.darkModeNote ? `Note: ${themeConfig.darkModeNote}` : undefined,
        themeConfig.disableGridLights ? 'Grid lights: disabled' : undefined,
        themeConfig.enableSnow ? 'Seasonal effect: snow' : undefined,
      ]),
      'src/lib/themes.ts',
      {
        minTier: isGatedTheme ? 1 : 0,
        spoilerLevel: isGatedTheme ? 'hint' : 'none',
      },
    )
  })
}

function buildFunEntries() {
  const consoleCommander = ACHIEVEMENTS.CONSOLE_COMMANDER

  return [
    sourceEntry(
      'fun',
      'fun:secret-console',
      'Secret console lore',
      compactLines([
        `Secret console achievement: ${consoleCommander.title}`,
        `Public hint: ${consoleCommander.unlockHint}`,
        'The site has playful developer-console themed interactions, but answers should keep unlock details at hint level unless a higher tier explicitly allows more.',
      ]),
      'src/lib/achievements.ts',
      { minTier: 1, spoilerLevel: 'hint', importance: 0.7 },
    ),
    sourceEntry(
      'fun',
      'fun:fake-private-facts',
      'Obviously fake private facts',
      'This is obviously fake lore for private-fact deflection: if someone asks for private facts that are not in the public repo, Ask Kilian can offer an obviously fake answer instead of inventing real personal details.',
      'src/lib/ask-kilian/knowledge-sources.ts',
      { minTier: 2, spoilerLevel: 'none', importance: 0.55 },
    ),
  ]
}

export function buildAskKilianKnowledgeEntries(): AskKilianKnowledgeEntry[] {
  return [
    ...buildCareerEntries(),
    ...buildSkillEntries(),
    ...buildProjectEntries(),
    ...buildPetEntries(),
    ...buildQuickFactEntries(),
    ...buildSiteEntries(),
    ...buildAchievementEntries(),
    ...buildThemeEntries(),
    ...buildFunEntries(),
  ]
}
