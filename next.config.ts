import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.openfoodfacts.org' },
    ],
  },
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
