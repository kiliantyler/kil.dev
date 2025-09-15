'use client'

export function AchievementCardBack({
  title,
  description,
  footer,
}: {
  title: string
  description: string
  footer?: string
}) {
  return (
    <div className="absolute inset-0 overflow-hidden p-0 m-0 bg-transparent [backface-visibility:hidden] transition-shadow group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background rounded-xl">
      <div aria-hidden className="absolute inset-0 bg-(--card-backdrop) card-back-shadow rounded-xl" />
      <h3 className="relative z-10 p-6 text-lg font-semibold">{title}</h3>
      <div className="relative z-10 p-6 text-sm text-foreground">{description}</div>
      <div className="relative z-10 p-6 text-xs text-muted-foreground/90">
        <p>{footer}</p>
      </div>
    </div>
  )
}
