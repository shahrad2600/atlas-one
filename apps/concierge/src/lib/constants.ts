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
  badge?: number;
}

export const CONCIERGE_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { label: 'Queue', href: '/queue', icon: 'Inbox', badge: 7 },
  { label: 'Chat', href: '/chat', icon: 'MessageSquare' },
  { label: 'Travelers', href: '/travelers', icon: 'Users' },
  { label: 'Bookings', href: '/bookings', icon: 'Calendar' },
  { label: 'Moderation', href: '/moderation', icon: 'Shield' },
  { label: 'Knowledge Base', href: '/knowledge', icon: 'BookOpen' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
];
