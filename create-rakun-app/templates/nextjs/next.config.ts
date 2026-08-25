import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: [
    '@rakun-kit/core',
    'bcrypt',
    'mongodb',
    'sharp',
    'yjs',
  ],
}

export default nextConfig
