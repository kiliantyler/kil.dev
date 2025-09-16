import draftKingsLogo from '@/images/logos/draftkings.webp'
import newInnovationsLogo from '@/images/logos/newinnov.webp'
import qgendaLogo from '@/images/logos/qgenda.webp'
import type { SkillCategory, WorkExperience } from '@/types/work-experience'

export const WORK_HISTORY: WorkExperience[] = [
  {
    id: 'qgenda',
    role: 'Senior Site Reliability Engineer',
    company: 'QGenda',
    location: 'Remote [Atlanta, GA]',
    from: '2025-07-01',
    to: undefined,
    summary: 'Qgenda bought New Innovations and I joined as a Senior Site Reliability Engineer.',
    highlights: [
      'Transitioned from New Innovations to QGenda',
    ],
    skills: [
      'Kubernetes',
      'FluxCD',
    ],
    companyUrl: 'https://www.qgenda.com',
    companyLogoSrc: qgendaLogo,
    companyLogoAlt: 'QGenda logo',
  },
  {
    id: 'newinnov',
    role: 'Senior DevOps Engineer',
    company: 'New Innovations',
    location: 'Remote [Akron, OH]',
    from: '2024-08-01',
    to: '2025-07-01',
    summary: '',
    highlights: [],
    skills: [],
    companyUrl: 'https://www.new-innov.com',
    companyLogoSrc: newInnovationsLogo,
    companyLogoAlt: 'New Innovations logo',
  },
  {
    id: 'draftkings',
    role: 'Senior Site Reliability Engineer',
    company: 'DraftKings',
    location: 'Remote [Boston, MA]',
    from: '2020-04-28',
    to: '2024-07-15',
    summary: '',
    highlights: [],
    skills: [],
    companyUrl: 'https://www.draftkings.com',
    companyLogoSrc: draftKingsLogo,
    companyLogoAlt: 'DraftKings logo',
  },
  {
    id: 'unknown',
    role: 'Previous Roles',
    company: 'Various',
    from: '2013-04-01',
    to: '2020-04-27',
    summary: "I'll fill the rest in later.",
  },
]

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'craft',
    label: 'The craft',
    items: ['TypeScript', 'JavaScript', 'React', 'Next', 'Tailwind', 'shadcn'],
  },
]
