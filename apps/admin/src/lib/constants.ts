export type ServiceName =
  | 'identity'
  | 'commerce'
  | 'dining'
  | 'trip'
  | 'travel-graph'
  | 'search'
  | 'stay'
  | 'flight'
  | 'experiences'
  | 'insurance'
  | 'finance'
  | 'messaging'
  | 'luxury'
  | 'trust'
  | 'ai-orchestrator'
  | 'social'
  | 'loyalty'
  | 'business'
  | 'content'
  | 'rental'
  | 'cruise';

export const SERVICES: Record<ServiceName, { port: number; label: string }> = {
  identity: { port: 4001, label: 'Identity' },
  commerce: { port: 4002, label: 'Commerce' },
  dining: { port: 4003, label: 'Dining' },
  trip: { port: 4004, label: 'Trips' },
  'travel-graph': { port: 4005, label: 'Travel Graph' },
  search: { port: 4006, label: 'Search' },
  stay: { port: 4007, label: 'Stays' },
  flight: { port: 4008, label: 'Flights' },
  experiences: { port: 4009, label: 'Experiences' },
  insurance: { port: 4010, label: 'Insurance' },
  finance: { port: 4011, label: 'Finance' },
  messaging: { port: 4012, label: 'Messaging' },
  luxury: { port: 4013, label: 'Luxury' },
  trust: { port: 4014, label: 'Trust' },
  'ai-orchestrator': { port: 4015, label: 'AI Orchestrator' },
  social: { port: 4016, label: 'Social' },
  loyalty: { port: 4017, label: 'Loyalty' },
  business: { port: 4018, label: 'Business' },
  content: { port: 4019, label: 'Content' },
  rental: { port: 4020, label: 'Rentals' },
  cruise: { port: 4021, label: 'Cruises' },
};

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { label: 'Listings', href: '/listings', icon: 'Building2' },
  { label: 'Reviews', href: '/reviews', icon: 'Star' },
  { label: 'Analytics', href: '/analytics', icon: 'BarChart3' },
  { label: 'Bookings', href: '/bookings', icon: 'Calendar' },
  { label: 'Team', href: '/team', icon: 'Users' },
  { label: 'Advertising', href: '/advertising', icon: 'Megaphone' },
  { label: 'Special Offers', href: '/offers', icon: 'Tag' },
  { label: 'Review Express', href: '/review-express', icon: 'Mail' },
  { label: 'Supplier Console', href: '/supplier', icon: 'Crown' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
];

export const LISTING_TYPES = ['Hotel', 'Restaurant', 'Experience', 'Rental'] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const LISTING_STATUSES = ['Active', 'Pending', 'Closed'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];
