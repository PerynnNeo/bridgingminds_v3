/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Authenticated pages must never be indexed (they hold personal speech data).
  // noindex is applied per-route via Metadata `robots` in the (app)/onboarding layouts.
};

export default nextConfig;
