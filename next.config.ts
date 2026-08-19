import type { NextConfig } from "next";
// @ts-ignore - next-pwa doesn't have TypeScript types
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // TODO: replace with your Lost & Found Outreach Supabase project's storage hostname
        // once that project is created (Project Settings > API > Project URL).
        protocol: 'https',
        hostname: 'your-project-ref.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
