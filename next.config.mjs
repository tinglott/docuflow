/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfjs-dist and @napi-rs/canvas use native bindings / Node-only code paths.
  // They must run in the Node runtime and never be bundled for the client.
  //
  // RESEARCH NOTE: the top-level `serverExternalPackages` key only exists in
  // Next.js 15+. This project pins Next.js 14, where the correct key is
  // `experimental.serverComponentsExternalPackages` (if you upgrade to
  // Next 15 later, rename it to the top-level `serverExternalPackages`).
  experimental: {
    serverComponentsExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;
