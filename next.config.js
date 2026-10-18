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
};

module.exports = nextConfig;