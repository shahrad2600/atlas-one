/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@atlas/shared-types'],
  images: {
    domains: ['localhost', 'images.unsplash.com', 'ui-avatars.com'],
  },
};

module.exports = nextConfig;
