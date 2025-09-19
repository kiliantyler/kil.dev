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
    id: 'kaseya',
    role: 'Senior DevOps Engineer',
    company: 'Kaseya',
    workLocation: {
      location: 'Las Vegas, NV',
      latitude: 36.169941,
      longitude: -115.139832,
    },
    from: '2019-06-01',
    to: '2020-04-01',
    summary:
      'Turned a manual-heavy DevOps setup into code-driven automation with a bias for speed, repeatability, and fewer 2 a.m. surprises.',
    highlights: [
      'Introduced Chef and codified formerly manual ops',
      'Rebuilt Jenkins pipelines for consistency and much faster runtimes',
      'Added Packer to tame long-running Windows server builds',
    ],
    companyUrl: 'https://www.kaseya.com',
    companyLogoSrc: Logos.KaseyaLogo,
    companyLogoAlt: 'Kaseya logo',
  },
  {
    id: 'ge',
    role: 'Cloud Engineer | DevOps Engineer',
    company: 'General Electric',
    workLocation: {
      location: 'Cleveland, OH',
      latitude: 41.49932,
      longitude: -81.69436,
    },
    from: '2016-05-01',
    to: '2019-06-01',
    summary:
      'Contributed to large-scale cloud migration and automation, keeping a globe-spanning fleet of servers healthy and moving to AWS and Azure.',
    highlights: [
      'Created and maintained Chef recipes and Ansible roles for AWS and Azure migrations',
      'Wrote Jenkins pipelines using Packer to create and deploy servers to AWS and Azure',
      'Designed autoscaling Kubernetes clusters',
      'Built full CI/CD workflows to support cloud migration',
      'Owned and maintained 1,000+ Linux/Unix servers across global sites',
      'Fleet distributed across 5 continents, 80% virtual / 20% physical',
      'Supported and maintained SAP environments',
      'Introduced new patching and control solutions',
      'Supported 100+ applications and their owners',
    ],
    companyUrl: 'https://www.ge.com',
    companyLogoSrc: Logos.GELogo,
    companyLogoAlt: 'General Electric logo',
  },
  {
    id: 'pnc',
    role: 'Linux Server Administrator',
    company: 'PNC Bank',
    workLocation: {
      location: 'Cleveland, OH',
    },
    from: '2015-04-01',
    to: '2016-05-01',
    summary:
      'Supported a major datacenter migration by leveling up server infrastructure and automating deployments to improve efficiency.',
    highlights: [
      'Created and provisioned Linux servers for a datacenter migration',
      'Established best practices for the whole team',
      'Built deployment automations that wrapped the contract early',
    ],
    companyUrl: 'https://www.pnc.com',
    companyLogoSrc: Logos.PNCLogo,
    companyLogoAlt: 'PNC Bank logo',
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
    to: '2015-03-31',
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
