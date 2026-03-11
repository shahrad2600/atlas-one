/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  reactStrictMode: true,
  transpilePackages: ['@atlas/shared-types'],
};

module.exports = nextConfig;
