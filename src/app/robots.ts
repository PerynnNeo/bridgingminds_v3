import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Authenticated pages hold personal speech data, keep them out of search.
      disallow: ['/home', '/practice', '/games', '/profile', '/onboarding', '/speech-profile', '/api/'],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
