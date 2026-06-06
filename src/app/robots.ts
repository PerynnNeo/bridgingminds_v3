import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Authenticated pages hold personal speech data, keep them out of search.
      // /camera-check is an on-device diagnostic, also kept out of search.
      disallow: ['/home', '/practice', '/games', '/profile', '/onboarding', '/speech-profile', '/camera-check', '/api/'],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
