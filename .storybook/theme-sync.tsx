import * as React from 'react'
import { useTheme } from '../src/components/providers/theme-provider'
import type { Theme } from '../src/lib/themes'

export default function ThemeSync({ selected }: { selected: Theme }) {
  const { setTheme } = useTheme()
  React.useEffect(() => {
    setTheme(selected)
  }, [selected, setTheme])
  return null
}
