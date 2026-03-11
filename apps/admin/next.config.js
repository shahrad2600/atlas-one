/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@atlas/shared-types'],
  images: {
    domains: ['localhost', 'images.unsplash.com', 'ui-avatars.com'],
  },
};

module.exports = nextConfig;
