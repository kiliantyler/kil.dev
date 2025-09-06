import { cn } from '@/lib/utils'

type SectionLabelProps = {
  children: string
  className?: string
  as?: 'p' | 'span' | 'div' | 'h2' | 'h3'
}

export function SectionLabel({ children, className = '', as = 'p' }: SectionLabelProps) {
  const Tag = as
  return <Tag className={cn('text-primary text-lg font-semibold md:text-xl', className)}>{children}</Tag>
}
