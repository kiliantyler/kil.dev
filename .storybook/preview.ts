import type { Preview } from '@storybook/react'
import { createElement } from 'react'
import { ThemeProvider } from '../src/components/providers/theme-provider'
import '../src/styles/globals.css'

const preview: Preview = {
  decorators: [
    Story =>
      createElement(
        ThemeProvider,
        null,
        createElement('div', { className: 'min-h-screen bg-background text-foreground p-4' }, createElement(Story)),
      ),
  ],
  parameters: {
    controls: { expanded: true },
    layout: 'centered',
  },
}

export default preview
