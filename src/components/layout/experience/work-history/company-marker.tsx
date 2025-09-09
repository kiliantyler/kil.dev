'use client'

import { captureCompanyLogoClicked } from '@/hooks/posthog'
import type { WorkExperience } from '@/lib/experience'
import Image from 'next/image'
import Link from 'next/link'

export function CompanyMarker({ item }: { item: WorkExperience }) {
  if (item.companyLogoSrc) {
    const logo = (
      <span className="relative block size-7">
        <Image
          src={item.companyLogoSrc}
          alt={item.companyLogoAlt ?? `${item.company} logo`}
          fill
          sizes="28px"
          className="object-cover"
        />
      </span>
    )

    if (item.companyUrl) {
      const href = item.companyUrl
      return (
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${item.company} homepage`}
          className="absolute -left-[14px] top-5 block rounded-md overflow-hidden ring-2 ring-background focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          onClick={() => captureCompanyLogoClicked(item.id, href)}>
          {logo}
        </Link>
      )
    }

    return (
      <span className="absolute -left-[14px] top-5 block rounded-md overflow-hidden ring-2 ring-background">
        {logo}
      </span>
    )
  }

  return (
    <span aria-hidden className="absolute -left-[5px] top-5 size-2.5 rounded-full bg-primary ring-2 ring-background" />
  )
}
