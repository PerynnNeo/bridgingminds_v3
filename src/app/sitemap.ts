import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, priority: 1 },
    { url: `${siteConfig.url}/signup`, priority: 0.8 },
    { url: `${siteConfig.url}/login`, priority: 0.5 },
  ];
}
