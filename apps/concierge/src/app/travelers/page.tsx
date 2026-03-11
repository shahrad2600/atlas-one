'use client';

import { useState } from 'react';
import {
  Search,
  Eye,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  Shield,
  Plane,
  Hotel,
  UtensilsCrossed,
  Compass,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { TabGroup, TabList, Tab, TabPanel } from '@/components/ui/tabs';
import { cn, formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';

type TravelerTier = 'Standard' | 'Premium' | 'Luxury';

interface Traveler {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: TravelerTier;
  trips: number;
  reviews: number;
  trustScore: number;
  lastActive: string;
  memberSince: string;
  tripsList: { destination: string; dates: string; status: string }[];
  bookingsList: { type: string; property: string; dates: string; status: string; amount: number }[];
  reviewsList: { listing: string; rating: number; date: string; snippet: string }[];
  notes: string[];
}

const travelers: Traveler[] = [
  {
    id: 'T-001',
    name: 'James Morrison',
    email: 'james.morrison@email.com',
    phone: '+1 (212) 555-0147',
    tier: 'Luxury',
    trips: 28,
    reviews: 15,
    trustScore: 98,
    lastActive: '2026-03-08T10:30:00Z',
    memberSince: '2023-04-12T00:00:00Z',
    tripsList: [
      { destination: 'London to New York', dates: 'Mar 9-14, 2026', status: 'Upcoming' },
      { destination: 'Tokyo, Japan', dates: 'Jan 5-15, 2026', status: 'Completed' },
      { destination: 'Maldives', dates: 'Dec 20-28, 2025', status: 'Completed' },
    ],
    bookingsList: [
      { type: 'Flight', property: 'Virgin Atlantic VS003', dates: 'Mar 9', status: 'Confirmed', amount: 4200 },
      { type: 'Hotel', property: 'The Langham, NYC', dates: 'Mar 9-14', status: 'Confirmed', amount: 3850 },
    ],
    reviewsList: [
      { listing: 'Park Hyatt Tokyo', rating: 5, date: 'Jan 2026', snippet: 'Impeccable service and stunning views of Mt. Fuji from the suite...' },
      { listing: 'Soneva Fushi, Maldives', rating: 5, date: 'Dec 2025', snippet: 'The overwater villa exceeded all expectations...' },
    ],
    notes: ['VIP client - prioritize all requests', 'Prefers business class aisle seat', 'Nut allergy - flag with all restaurants'],
  },
  {
    id: 'T-002',
    name: 'Mei Lin Wu',
    email: 'meilin.wu@email.com',
    phone: '+86 138-0013-8000',
    tier: 'Premium',
    trips: 12,
    reviews: 8,
    trustScore: 92,
    lastActive: '2026-03-08T09:15:00Z',
    memberSince: '2023-09-20T00:00:00Z',
    tripsList: [
      { destination: 'Paris, France', dates: 'Mar 20-25, 2026', status: 'Upcoming' },
      { destination: 'Bali, Indonesia', dates: 'Nov 10-18, 2025', status: 'Completed' },
    ],
    bookingsList: [
      { type: 'Hotel', property: 'The Ritz Paris', dates: 'Mar 20-25', status: 'Pending Change', amount: 6200 },
    ],
    reviewsList: [
      { listing: 'Alila Villas Uluwatu', rating: 4, date: 'Nov 2025', snippet: 'Beautiful cliffside location but room service was slow...' },
    ],
    notes: ['Anniversary trip coming up - ensure special arrangements', 'Speaks Mandarin and English'],
  },
  {
    id: 'T-003',
    name: 'Alessandro Ricci',
    email: 'alessandro.ricci@email.com',
    phone: '+39 333-456-7890',
    tier: 'Luxury',
    trips: 34,
    reviews: 22,
    trustScore: 97,
    lastActive: '2026-03-08T08:45:00Z',
    memberSince: '2022-01-15T00:00:00Z',
    tripsList: [
      { destination: 'Florence, Italy', dates: 'Mar 8-14, 2026', status: 'Active' },
      { destination: 'Swiss Alps', dates: 'Feb 1-8, 2026', status: 'Completed' },
    ],
    bookingsList: [
      { type: 'Hotel', property: 'Four Seasons Florence', dates: 'Mar 8-14', status: 'Modified', amount: 5600 },
      { type: 'Experience', property: 'Tuscan Wine Tour', dates: 'Mar 11', status: 'Confirmed', amount: 380 },
    ],
    reviewsList: [
      { listing: 'The Chedi Andermatt', rating: 5, date: 'Feb 2026', snippet: 'World-class spa and the alpine setting is unmatched...' },
    ],
    notes: ['Delta Diamond Medallion member', 'Prefers Italian-speaking staff when available'],
  },
  {
    id: 'T-004',
    name: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    phone: '+91 98765-43210',
    tier: 'Standard',
    trips: 3,
    reviews: 2,
    trustScore: 78,
    lastActive: '2026-03-07T14:20:00Z',
    memberSince: '2025-11-05T00:00:00Z',
    tripsList: [
      { destination: 'Japan-Korea-Thailand', dates: 'Apr 5-20, 2026', status: 'Planning' },
      { destination: 'Goa, India', dates: 'Dec 15-20, 2025', status: 'Completed' },
    ],
    bookingsList: [],
    reviewsList: [
      { listing: 'Taj Exotica Goa', rating: 4, date: 'Dec 2025', snippet: 'Great beachfront property with excellent breakfast buffet...' },
    ],
    notes: ['New member - nurture relationship', 'Vegetarian - flag for all dining'],
  },
  {
    id: 'T-005',
    name: 'Emma Thompson',
    email: 'emma.thompson@email.com',
    phone: '+44 7911-123456',
    tier: 'Premium',
    trips: 16,
    reviews: 11,
    trustScore: 91,
    lastActive: '2026-03-08T07:30:00Z',
    memberSince: '2024-02-28T00:00:00Z',
    tripsList: [
      { destination: 'Barcelona, Spain', dates: 'Mar 13-18, 2026', status: 'Upcoming' },
      { destination: 'Cape Town, South Africa', dates: 'Jan 20-28, 2026', status: 'Completed' },
    ],
    bookingsList: [
      { type: 'Hotel', property: 'Hotel Arts Barcelona', dates: 'Mar 13-18', status: 'Confirmed', amount: 2800 },
      { type: 'Dining', property: 'Tickets Barcelona', dates: 'Mar 15', status: 'Confirmed', amount: 220 },
    ],
    reviewsList: [
      { listing: 'One&Only Cape Town', rating: 5, date: 'Jan 2026', snippet: 'Stunning waterfront location and impeccable service...' },
    ],
    notes: ['Frequently travels with groups', 'Prefers Mediterranean cuisine'],
  },
  {
    id: 'T-006',
    name: 'David Park',
    email: 'david.park@email.com',
    phone: '+82 10-9876-5432',
    tier: 'Standard',
    trips: 5,
    reviews: 4,
    trustScore: 82,
    lastActive: '2026-03-07T11:00:00Z',
    memberSince: '2025-06-10T00:00:00Z',
    tripsList: [
      { destination: 'Japan', dates: 'Mar 18-28, 2026', status: 'Upcoming' },
    ],
    bookingsList: [
      { type: 'Hotel', property: 'Kyoto Ryokan (Cancelled)', dates: 'Mar 22-24', status: 'Cancelled', amount: 0 },
    ],
    reviewsList: [
      { listing: 'Lotte Hotel Seoul', rating: 4, date: 'Aug 2025', snippet: 'Good location in Myeongdong but rooms are slightly dated...' },
    ],
    notes: ['Budget-conscious traveler', 'Speaks Korean and English'],
  },
  {
    id: 'T-007',
    name: 'Sofia Martinez',
    email: 'sofia.martinez@email.com',
    phone: '+34 612-345-678',
    tier: 'Luxury',
    trips: 22,
    reviews: 14,
    trustScore: 96,
    lastActive: '2026-03-08T06:00:00Z',
    memberSince: '2023-03-01T00:00:00Z',
    tripsList: [
      { destination: 'Santorini, Greece', dates: 'Jun 8-15, 2026', status: 'Planning' },
      { destination: 'Amalfi Coast, Italy', dates: 'Sep 1-8, 2025', status: 'Completed' },
    ],
    bookingsList: [
      { type: 'Hotel', property: 'Canaves Oia Santorini', dates: 'Jun 8-15', status: 'Confirmed', amount: 8400 },
    ],
    reviewsList: [
      { listing: 'Belmond Caruso, Amalfi', rating: 5, date: 'Sep 2025', snippet: 'The infinity pool overlooking the coast is breathtaking...' },
    ],
    notes: ['High-value client - avg booking $12k+', 'Interested in yacht charters and unique experiences'],
  },
  {
    id: 'T-008',
    name: 'Robert Kim',
    email: 'robert.kim@email.com',
    phone: '+1 (310) 555-0198',
    tier: 'Premium',
    trips: 9,
    reviews: 7,
    trustScore: 88,
    lastActive: '2026-03-07T16:45:00Z',
    memberSince: '2024-08-15T00:00:00Z',
    tripsList: [
      { destination: 'Bali, Indonesia', dates: 'May 1-10, 2026', status: 'Upcoming' },
    ],
    bookingsList: [
      { type: 'Hotel', property: 'COMO Uma Canggu', dates: 'May 1-10', status: 'Confirmed', amount: 3200 },
    ],
    reviewsList: [
      { listing: 'Aman Tokyo', rating: 5, date: 'May 2025', snippet: 'Minimalist luxury at its finest...' },
    ],
    notes: ['Level 4 contributor', 'Trip Cash balance: 12,450 pts', 'Active reviewer'],
  },
  {
    id: 'T-009',
    name: 'Hannah Weber',
    email: 'hannah.weber@email.com',
    phone: '+49 176-1234-5678',
    tier: 'Standard',
    trips: 4,
    reviews: 3,
    trustScore: 75,
    lastActive: '2026-03-08T05:15:00Z',
    memberSince: '2025-07-20T00:00:00Z',
    tripsList: [
      { destination: 'Singapore', dates: 'Mar 5-10, 2026', status: 'Active' },
    ],
    bookingsList: [
      { type: 'Hotel', property: 'Marina Bay Hotel', dates: 'Mar 5-10', status: 'Issue Reported', amount: 1450 },
    ],
    reviewsList: [
      { listing: 'Park Royal Pickering', rating: 3, date: 'Oct 2025', snippet: 'The gardens are beautiful but soundproofing is poor...' },
    ],
    notes: ['Currently has an active complaint', 'Photos submitted as evidence'],
  },
  {
    id: 'T-010',
    name: 'Carlos Gutierrez',
    email: 'carlos.gutierrez@email.com',
    phone: '+52 55-1234-5678',
    tier: 'Premium',
    trips: 11,
    reviews: 6,
    trustScore: 90,
    lastActive: '2026-03-07T20:30:00Z',
    memberSince: '2024-05-10T00:00:00Z',
    tripsList: [
      { destination: 'Cancun, Mexico', dates: 'Mar 20-27, 2026', status: 'Upcoming' },
    ],
    bookingsList: [
      { type: 'Hotel', property: 'Rosewood Mayakoba', dates: 'Mar 20-27', status: 'Confirmed', amount: 4100 },
      { type: 'Experience', property: 'Cenote Diving Tour', dates: 'Mar 23', status: 'Confirmed', amount: 180 },
    ],
    reviewsList: [
      { listing: 'Banyan Tree Mayakoba', rating: 4, date: 'Mar 2025', snippet: 'Excellent lagoon setting and great spa treatments...' },
    ],
    notes: ['Prefers private transfers', 'Repeat visitor to Mexican Riviera'],
  },
];

const tierConfig: Record<TravelerTier, { color: string }> = {
  Standard: { color: 'bg-slate-100 text-slate-700' },
  Premium: { color: 'bg-amber-100 text-amber-800' },
  Luxury: { color: 'bg-purple-100 text-purple-800' },
};

const statusConfig: Record<string, string> = {
  Upcoming: 'bg-sky-100 text-sky-800',
  Active: 'bg-green-100 text-green-800',
  Completed: 'bg-slate-100 text-slate-700',
  Planning: 'bg-purple-100 text-purple-800',
  Confirmed: 'bg-green-100 text-green-800',
  'Pending Change': 'bg-amber-100 text-amber-800',
  Modified: 'bg-sky-100 text-sky-800',
  Cancelled: 'bg-red-100 text-red-800',
  'Issue Reported': 'bg-red-100 text-red-800',
};

const typeIcons: Record<string, React.ElementType> = {
  Flight: Plane,
  Hotel: Hotel,
  Dining: UtensilsCrossed,
  Experience: Compass,
};

export default function TravelersPage() {
  const [search, setSearch] = useState('');
  const [selectedTraveler, setSelectedTraveler] = useState<Traveler | null>(null);

  const filtered = travelers.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-full">
      {/* Main Table */}
      <div className={cn('flex-1 flex flex-col min-w-0', selectedTraveler && 'max-w-[60%]')}>
        <div className="p-6 pb-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Travelers</h1>
          <Input
            placeholder="Search by name, email, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        <div className="flex-1 overflow-auto px-6 pb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
                <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Name</th>
                <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Email</th>
                <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Tier</th>
                <th className="pb-3 font-medium text-slate-500 dark:text-slate-400 text-center">Trips</th>
                <th className="pb-3 font-medium text-slate-500 dark:text-slate-400 text-center">Reviews</th>
                <th className="pb-3 font-medium text-slate-500 dark:text-slate-400 text-center">Trust</th>
                <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Last Active</th>
                <th className="pb-3 font-medium text-slate-500 dark:text-slate-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={t.name} size="sm" />
                      <span className="font-medium text-slate-900 dark:text-slate-100">{t.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">{t.email}</td>
                  <td className="py-3">
                    <Badge className={tierConfig[t.tier].color}>{t.tier}</Badge>
                  </td>
                  <td className="py-3 text-center text-slate-700 dark:text-slate-300">{t.trips}</td>
                  <td className="py-3 text-center text-slate-700 dark:text-slate-300">{t.reviews}</td>
                  <td className="py-3 text-center">
                    <span className={cn(
                      'font-medium',
                      t.trustScore >= 90 ? 'text-green-600' : t.trustScore >= 80 ? 'text-amber-600' : 'text-slate-600',
                    )}>
                      {t.trustScore}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500 dark:text-slate-400 text-xs">{formatDate(t.lastActive, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                  <td className="py-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTraveler(t)}>
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedTraveler && (
        <div className="w-[40%] border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Traveler Profile</h2>
            <button onClick={() => setSelectedTraveler(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Profile Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-4 mb-4">
                <Avatar name={selectedTraveler.name} size="xl" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedTraveler.name}</h3>
                  <Badge className={cn(tierConfig[selectedTraveler.tier].color, 'mt-1')}>{selectedTraveler.tier} Member</Badge>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Mail className="h-4 w-4 text-slate-400" /> {selectedTraveler.email}
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Phone className="h-4 w-4 text-slate-400" /> {selectedTraveler.phone}
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar className="h-4 w-4 text-slate-400" /> Member since {formatDate(selectedTraveler.memberSince)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <Card className="text-center">
                  <CardContent className="py-3 px-2">
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedTraveler.trips}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Trips</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="py-3 px-2">
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedTraveler.reviews}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Reviews</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="py-3 px-2">
                    <p className="text-lg font-bold text-emerald-600">{selectedTraveler.trustScore}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Trust Score</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tabs */}
            <TabGroup>
              <TabList className="px-5">
                <Tab index={0}>Trips</Tab>
                <Tab index={1}>Bookings</Tab>
                <Tab index={2}>Reviews</Tab>
                <Tab index={3}>Notes</Tab>
              </TabList>

              <TabPanel index={0} className="px-5 pb-5">
                <div className="space-y-3">
                  {selectedTraveler.tripsList.map((trip, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <MapPin className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{trip.destination}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{trip.dates}</p>
                      </div>
                      <Badge className={statusConfig[trip.status] ?? 'bg-slate-100 text-slate-700'}>{trip.status}</Badge>
                    </div>
                  ))}
                  {selectedTraveler.tripsList.length === 0 && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No trips recorded</p>
                  )}
                </div>
              </TabPanel>

              <TabPanel index={1} className="px-5 pb-5">
                <div className="space-y-3">
                  {selectedTraveler.bookingsList.map((booking, i) => {
                    const Icon = typeIcons[booking.type] ?? Calendar;
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <Icon className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{booking.property}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{booking.type} &middot; {booking.dates}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge className={statusConfig[booking.status] ?? 'bg-slate-100 text-slate-700'}>{booking.status}</Badge>
                          {booking.amount > 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">${booking.amount.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {selectedTraveler.bookingsList.length === 0 && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No bookings</p>
                  )}
                </div>
              </TabPanel>

              <TabPanel index={2} className="px-5 pb-5">
                <div className="space-y-3">
                  {selectedTraveler.reviewsList.map((review, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{review.listing}</p>
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{review.snippet}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{review.date}</p>
                    </div>
                  ))}
                  {selectedTraveler.reviewsList.length === 0 && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No reviews</p>
                  )}
                </div>
              </TabPanel>

              <TabPanel index={3} className="px-5 pb-5">
                <div className="space-y-2">
                  {selectedTraveler.notes.map((note, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                      <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-900 dark:text-amber-300">{note}</p>
                    </div>
                  ))}
                </div>
              </TabPanel>
            </TabGroup>
          </div>
        </div>
      )}
    </div>
  );
}
