import type { NextConfig } from 'next'

import './src/env.js'

const config: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/vibecheck/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/vibecheck/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ]
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
}

export default config
