import * as React from 'react'

export function DownloadIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 256 256"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}>
      <path d="M213.66,122.34a8,8,0,0,1-11.32,0L136,56,68.66,122.34a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,213.66,122.34Zm-99.32,29.32a8,8,0,0,0-11.32,0L36.66,218.34a8,8,0,0,0,11.32,11.32L128,153.31l79.31,76.35a8,8,0,0,0,11.32-11.32Z" />
    </svg>
  )
}
