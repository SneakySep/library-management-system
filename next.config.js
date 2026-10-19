/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dev and production builds must never share one directory. Running
  // `next build` while `next dev` is active wipes the dev server's assets
  // (the site loads with no CSS/JS). `npm run dev` points NEXT_DIST_DIR at
  // `.next-dev`, so `next build` writing to `.next` can never break a
  // running dev server again.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Baseline security headers on every response. The CSP deliberately only
  // locks down directives that never need relaxing (framing, plugins, form
  // targets, base URI); a full script-src policy needs per-request nonces
  // and is a separate project.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;