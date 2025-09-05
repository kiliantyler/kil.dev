'use client'

import Confused from '@/images/cartoon-confused.jpg'
import Headshot from '@/images/cartoon-headshot.jpg'
import { CONTENT } from '@/lib/constants'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

function ProfileImage() {
  const [useConfused, setUseConfused] = useState(false)

  const updateFromHash = useCallback(() => {
    if (typeof window === 'undefined') return
    const isConfused = window.location.hash === '#YouWereAlreadyHere'
    setUseConfused(isConfused)
  }, [])

  useEffect(() => {
    updateFromHash()
    window.addEventListener('hashchange', updateFromHash, { passive: true } as EventListenerOptions)
    return () => {
      window.removeEventListener('hashchange', updateFromHash as EventListener)
    }
  }, [updateFromHash])

  const imageSrc = useConfused ? Confused : Headshot
  const imageAlt = `${CONTENT.NAME} ${useConfused ? 'confused' : 'headshot'}`

  return (
    <div className="group relative order-1 mx-auto w-full max-w-md lg:order-2 lg:mx-0">
      <div className="border-primary absolute -top-4 -left-4 h-full w-full -rotate-3 group-hover:scale-110 group-hover:translate-y-3 group-hover:translate-x-4 rounded-lg border-4 transition-transform duration-500 group-hover:rotate-0" />
      <div className="relative h-auto w-full rounded-lg bg-cover bg-center bg-no-repeat shadow-2xl">
        <Image
          alt={imageAlt}
          src={imageSrc}
          className="rounded-lg transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105"
          loading="eager"
          priority
          width={500}
          height={500}
        />
      </div>
    </div>
  )
}

export { ProfileImage }
