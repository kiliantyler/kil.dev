import ConfusedAchievement from '@/images/achievements/confused-click.webp'
import GrumpyAchievement from '@/images/achievements/grumpy-glimpse.webp'
import LadybirdAchievement from '@/images/achievements/ladybird-landing.webp'
import PlaceholderAchievement from '@/images/achievements/placeholder.webp'
import RecursiveRewardAchievement from '@/images/achievements/recursive-reward.webp'
import ThemeTapdanceAchievement from '@/images/achievements/theme-tapdance.webp'
import type { AchievementDefinition } from '@/types/achievements'

export const ACHIEVEMENTS_COOKIE_NAME = 'kil.dev_achievements_v1'

export const ACHIEVEMENTS = {
  ABOUT_AMBLER: {
    id: 'ABOUT_AMBLER',
    title: 'About Ambler',
    description: 'You clicked on the About page.',
    icon: '👋',
    imageSrc: PlaceholderAchievement, // TODO: Add pet parade achievement image
    imageAlt: 'About Ambler',
    cardDescription:
      "You met the person behind the pixels. Turns out I'm a pretty cool guy, at least my mom thinks so.",
    unlockHint: 'You should try learning something about me.',
  },
  EXPERIENCE_EXPLORER: {
    id: 'EXPERIENCE_EXPLORER',
    title: 'Experience Explorer',
    description: 'You clicked on the Experience page.',
    icon: '💼',
    imageSrc: PlaceholderAchievement, // TODO: Add pet parade achievement image
    imageAlt: 'Experience Explorer',
    cardDescription: 'You donned a safari hat and trekked through my career jungle. Mind the buzzwords — they bite.',
    unlockHint: 'Maybe if you had more experience, you would have more to explore.',
  },
  PROJECTS_PERUSER: {
    id: 'PROJECTS_PERUSER',
    title: 'Projects Peruser',
    description: 'You clicked on the Projects page.',
    icon: '💻',
    imageSrc: PlaceholderAchievement, // TODO: Add pet parade achievement image
    imageAlt: 'Projects Peruser',
    cardDescription:
      'You wandered the gallery of half-baked ideas and fully-caffeinated builds, nodding like a true critic.',
    unlockHint: 'A quiet stroll through the builds can be rewarding.',
  },
  GRUMPY_GLIMPSE: {
    id: 'GRUMPY_GLIMPSE',
    title: 'Grumpy Glimpse',
    description: "He's not a fan of being clicked on.",
    icon: '😠',
    imageSrc: GrumpyAchievement,
    imageAlt: 'Grumpy Glimpse',
    cardDescription: 'A fleeting look at the grumpiest timeline. No smiles here. Why did you click on him?',
    unlockHint: "I don't think he likes to be clicked on.",
  },
  CONFUSED_CLICK: {
    id: 'CONFUSED_CLICK',
    title: 'But why?',
    description: 'You clicked on the same site again.',
    icon: '🤔',
    imageSrc: ConfusedAchievement,
    imageAlt: 'Confused Glimpse',
    cardDescription:
      'Even though you were already on this site, you clicked to visit it again. Why? Oh well, you got an achievement for it.',
    unlockHint: 'Have you ever been so confused you clicked on the same site again?',
  },
  PET_PARADE: {
    id: 'PET_PARADE',
    title: 'Pet Parade',
    description: 'Ohhh, you like pets? Check out the pet gallery up above!',
    icon: '🐾',
    imageSrc: PlaceholderAchievement, // TODO: Add pet parade achievement image
    imageAlt: 'Pet Parade',
    cardDescription: 'I have a lot of pets and I love them all. This is a celebration of them. Thanks for looking!',
    unlockHint: 'How much do you love pets? Enough to learn about them all?',
  },
  RECURSIVE_REWARD: {
    id: 'RECURSIVE_REWARD',
    title: 'Recursive Reward',
    description: 'You got an achievement for getting an achievement. How meta!',
    icon: '🎉',
    imageSrc: RecursiveRewardAchievement,
    imageAlt: 'Recursive Reward',
    cardDescription:
      'You unlocked three achievements and got a fourth one as a reward! An achievement collectors dream!',
    unlockHint: 'How are you even viewing this page without having unlocked this? Did you look at the source code?',
  },
  LADYBIRD_LANDING: {
    id: 'LADYBIRD_LANDING',
    title: 'Ladybird Landing',
    description: 'You landed on the site using Ladybird!',
    icon: '🦅',
    imageSrc: LadybirdAchievement,
    imageAlt: 'Ladybird Landing',
    cardDescription: "We love an open web and independent browsers! I'm aware this site looks bad in Ladybird.",
    unlockHint: 'You should browse this site on a truly independent web browser.',
  },
  THEME_TAPDANCE: {
    id: 'THEME_TAPDANCE',
    title: 'Theme Tapdance',
    description: 'Open close, open close... Open that menu one more time and see what goodies you find!',
    icon: '🎨',
    imageSrc: ThemeTapdanceAchievement,
    imageAlt: 'Theme Tapdance',
    cardDescription:
      'Curiosity got the better of you! You discovered that some themes are hidden behind seasonal dates, and now you have access to all of them anytime you want. Neat!',
    unlockHint:
      "That theme menu is a lot of fun to play with, really cool animation when it opens. I'd probably get sick of it after 5 or 6 times.",
  },
} as const satisfies Record<string, AchievementDefinition>

export type AchievementId = keyof typeof ACHIEVEMENTS
