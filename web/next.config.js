/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },   // Google avatars
      { protocol: 'https', hostname: 'pbs.twimg.com' },               // X avatars
      { protocol: 'https', hostname: 'graph.instagram.com' },         // Instagram avatars
      // Dev-only: disk-backed upload stub serves from /uploads/*
      { protocol: 'http',  hostname: 'localhost' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
    // NOTE: do not add '@tanstack/react-query' to optimizePackageImports — the
    // barrel-import rewrite can split its internal QueryClient context across
    // module copies, so the provider and the hooks end up reading different
    // contexts ("No QueryClient set" + hydration failure). The context must stay
    // a singleton.
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.infrastructureLogging = { ...config.infrastructureLogging, level: 'error' };
    }
    return config;
  },
};

module.exports = nextConfig;
