/** @type {import('next').NextConfig} */

// Load environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: API_URL,
  },
};

module.exports = nextConfig;
