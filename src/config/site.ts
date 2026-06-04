/**
 * Central site configuration: brand identity, SEO defaults, and primary navigation.
 * Sourced from the MVP spec (§3 Branding, §6 Homepage, §11 SEO).
 */
export const siteConfig = {
  name: 'BridgingMinds',
  shortName: 'BridgingMinds',
  tagline: 'AI Speech Confidence Coach',
  description:
    'A youth-friendly AI platform that helps you practise speaking, presentations, and pronunciation with personalised feedback.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bridgingminds.app',
  themeColor: '#3f9268',
  ogImage: '/og-cover.png',
} as const;

export type NavIcon = 'home' | 'practice' | 'games' | 'profile';

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

/** Bottom navigation (§6.2.6). */
export const mainNav: NavItem[] = [
  { href: '/home', label: 'Home', icon: 'home' },
  { href: '/practice', label: 'Practice', icon: 'practice' },
  { href: '/games', label: 'Games', icon: 'games' },
  { href: '/profile', label: 'Profile', icon: 'profile' },
];
