/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase body size limit for audio uploads (up to 25 MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
