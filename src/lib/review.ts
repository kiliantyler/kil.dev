import type { AchievementId } from '@/lib/achievements'
import type { ReviewConfig } from '@/types/review'

export const REVIEW_CONFIG: ReviewConfig = {
  enabled: true,
  achievementsThreshold: 7,
  storageKey: 'kil.dev/review/v1',
  achievementIdOnSubmit: 'FIVE_STAR_FAN' as AchievementId,
  copy: {
    title: 'Rate your experience',
    intro: "This definitely isn't a desperate plea for validation.",
    submitCta: 'Submit totally-real rating',
    snarkOnReturn: [
      'Welcome back. We saved you a front-row seat to the rating.',
      'Still waiting on that perfect 5. No pressure. Lots of pressure.',
      "It's okay. You can do it. Five is just a very round number.",
    ],
    ratingText: {
      1: 'Ouch. What if we pretend you meant 5 and your finger slipped?',
      2: 'So close to average. Is your mouse allergic to stars 3–5?',
      3: 'Respectable. Now imagine it… but two better.',
      4: 'We both know you want to press one more star.',
      5: 'There it is. Glorious perfection. Hit submit to lock it in.',
    },
  },
}
