import * as Logos from '@/images/logos'
import type { SkillCategory, WorkExperience } from '@/types/work-experience'

export const WORK_HISTORY: WorkExperience[] = [
  {
    id: 'qgenda',
    role: 'Senior Site Reliability Engineer',
    company: 'QGenda',
    workLocation: {
      location: 'Remote',
    },
    officeLocation: {
      location: 'Atlanta, GA',
      latitude: 33.84453130355716,
      longitude: -84.37101221627069,
    },
    from: '2025-07-01',
    to: undefined,
    summary: 'QGenda bought New Innovations and I joined as a Senior Site Reliability Engineer.',
    highlights: [
      'Transitioned from New Innovations to QGenda',
    ],
    skills: [
      'Kubernetes',
      'FluxCD',
    ],
    companyUrl: 'https://www.qgenda.com',
    companyLogoSrc: Logos.QGendaLogo,
    companyLogoAlt: 'QGenda logo',
  },
  {
    id: 'newinnov',
    role: 'Senior DevOps Engineer',
    company: 'New Innovations',
    workLocation: {
      location: 'Remote',
    },
    officeLocation: {
      location: 'Uniontown, OH',
      latitude: 40.966373834303646,
      longitude: -81.47222812040836,
    },
    from: '2024-08-01',
    to: '2025-07-01',
    summary: '',
    highlights: [],
    skills: [],
    companyUrl: 'https://www.new-innov.com',
    companyLogoSrc: Logos.NewInnovationsLogo,
    companyLogoAlt: 'New Innovations logo',
  },
  {
    id: 'draftkings',
    role: 'Senior Site Reliability Engineer',
    company: 'DraftKings',
    workLocation: {
      location: 'Remote',
    },
    officeLocation: {
      location: 'Boston, MA',
      latitude: 42.3506386580534,
      longitude: -71.0731113290795,
    },
    from: '2020-04-01',
    to: '2024-06-30',
    summary:
      'Led critical infra for the Gaming vertical—designing reliable systems that kept the fun online, even on the busiest nights.',
    highlights: [
      'Built and operated on-prem Kubernetes from zero to production',
      'Rolled out AWS EKS to support scalable cloud workloads',
      'Architected the new Gaming vertical and launched a net-new Gaming Studio',
      'Grew and mentored a 7-person team for the Gaming org',
      'Owned the ELK/observability stack, tuning it for signal over noise',
      'Standardized CI/CD and kept delivery humming by running Jenkins at scale',
    ],
    skills: ['Kubernetes'],
    companyUrl: 'https://www.draftkings.com',
    companyLogoSrc: Logos.DraftKingsLogo,
    companyLogoAlt: 'DraftKings logo',
  },
  {
    id: 'unknown',
    role: 'Previous Roles',
    company: 'Various',
    workLocation: {
      location: 'Remote',
    },
    officeLocation: {
      location: 'Various',
      latitude: 39.8283, // Geographic center of contiguous US
      longitude: -98.5795,
    },
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
