import Link from 'next/link';
import { MapPin, Twitter, Facebook, Instagram, Youtube } from 'lucide-react';

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
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Column links */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
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
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-sky-500 dark:text-sky-400" />
            <span className="font-bold text-slate-900 dark:text-white">
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
                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                <social.icon className="h-5 w-5" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>English (US)</span>
            <span>USD ($)</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          &copy; {new Date().getFullYear()} Atlas One. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
