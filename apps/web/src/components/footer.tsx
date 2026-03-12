import Link from 'next/link';
import { Compass, Twitter, Facebook, Instagram, Youtube } from 'lucide-react';

const columns = [
  {
    title: 'About',
    links: [
      { label: 'About Atlas One', href: '/about' },
      { label: 'Press', href: '/press' },
      { label: 'Careers', href: '/careers' },
      { label: 'Trust & Safety', href: '/trust' },
      { label: 'Accessibility', href: '/accessibility' },
    ],
  },
  {
    title: 'Discover',
    links: [
      { label: 'Hotels', href: '/hotels' },
      { label: 'Flights', href: '/flights' },
      { label: 'Restaurants', href: '/restaurants' },
      { label: 'Experiences', href: '/experiences' },
      { label: 'Travel Guides', href: '/guides' },
    ],
  },
  {
    title: 'Business',
    links: [
      { label: 'List Your Property', href: '/business/list' },
      { label: 'Business Center', href: '/business' },
      { label: 'Advertise', href: '/business/advertise' },
      { label: 'Affiliate Program', href: '/business/affiliates' },
      { label: 'API Partners', href: '/business/api' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Community', href: '/community' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
];

const socials = [
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
];

export default function Footer() {
  return (
    <footer className="border-t border-[#EDE4D8] bg-[#F9F5EE] dark:border-[#332C22] dark:bg-[#0D0A05]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Column links */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#1C1108] dark:text-[#F8F4ED]">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#1C1108]/50 hover:text-brand-600 dark:text-[#F8F4ED]/50 dark:hover:text-brand-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#EDE4D8]/50 dark:border-[#332C22]/50 pt-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-brand-500 dark:text-brand-400" />
            <span className="font-bold text-[#1C1108] dark:text-[#F8F4ED] font-heading">
              Atlas One
            </span>
          </div>

          <div className="flex items-center gap-4">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="text-[#1C1108]/40 hover:text-brand-500 dark:text-[#F8F4ED]/40 dark:hover:text-brand-400 transition-colors"
              >
                <social.icon className="h-5 w-5" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm text-[#1C1108]/50 dark:text-[#F8F4ED]/50">
            <span>English (US)</span>
            <span>USD ($)</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-[#1C1108]/40 dark:text-[#F8F4ED]/40">
          &copy; {new Date().getFullYear()} Atlas One. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
