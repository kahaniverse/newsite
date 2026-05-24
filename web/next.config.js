/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },   // Google avatars
      { protocol: 'https', hostname: 'pbs.twimg.com' },               // X avatars
      { protocol: 'https', hostname: 'graph.instagram.com' },         // Instagram avatars
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },
};

module.exports = nextConfig;
