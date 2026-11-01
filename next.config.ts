import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Configured for optimal Vercel serverless deployment

  async redirects() {
    return [
      {
        source: '/leaderboard',
        destination: '/community-rankings',
        permanent: false,
      },
      {
        source: '/login',
        destination: '/authentication',
        permanent: false,
      },
      {
        source: '/map',
        destination: '/civic-map',
        permanent: false,
      },
      {
        source: '/profile',
        destination: '/citizen-profile',
        permanent: false,
      },
      {
        source: '/report',
        destination: '/report-issue',
        permanent: false,
      },
      {
        source: '/scorecards',
        destination: '/department-performance',
        permanent: false,
      },
      {
        source: '/worker',
        destination: '/field-operations',
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Allow the features the app actually uses (report camera, voice mic,
          // "near me" geolocation). No X-Frame-Options so /embed can be iframed.
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
