/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/cash-out',
        destination: '/cash_out',
      },
      {
        source: '/cash-in',
        destination: '/cash_in',
      },
    ];
  },
}

export default nextConfig
