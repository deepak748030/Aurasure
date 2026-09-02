/**
 * Aurasure Admin - Next.js configuration.
 *
 * The browser never talks to the Node API directly: every request goes to a
 * same-origin path (`/api/backend/...`) which Next rewrites to the Express
 * server. That keeps the panel working behind any proxy/preview host and
 * avoids CORS entirely.
 */
const API_URL = (process.env.ADMIN_API_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Sandbox / preview hosts that may proxy the dev server.
  allowedDevOrigins: ['*.e2b.app', '*.vercel.app', 'localhost'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: '**' }],
  },
  async rewrites() {
    return [{ source: '/api/backend/:path*', destination: `${API_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;
