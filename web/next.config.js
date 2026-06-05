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
    // The webpack persistent (filesystem) cache logs a benign
    //   "Serializing big strings (128kiB) impacts deserialization performance"
    // hint whenever it caches a string module larger than 128 KiB. In dev that
    // string is Tailwind's full utility stylesheet (every class, emitted as one
    // string) plus large vendor module-graph chunks — none of which is app code
    // we can shrink, and none of which affects runtime/browser performance. It's
    // purely a cache-serialization hint, so drop infra logging to errors in dev
    // to keep the dev console clean.
    if (dev) {
      config.infrastructureLogging = { ...config.infrastructureLogging, level: 'error' };
    }
    return config;
  },
};

module.exports = nextConfig;
