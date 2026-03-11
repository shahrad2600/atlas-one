'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import {
  Ship,
  Search,
  MapPin,
  Calendar,
  Clock,
  Anchor,
  Navigation,
  Waves,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Rating } from '@/components/ui/rating';
import { formatCurrency } from '@/lib/utils';

interface Cruise {
  id: string;
  cruiseLine: string;
  shipName: string;
  destination: string;
  duration: string;
  ports: string[];
  priceFrom: number;
  rating: number;
  reviewCount: number;
  color: string;
  departurePort: string;
  nextSailing: string;
}

const mockCruises: Cruise[] = [
  {
    id: 'cr1',
    cruiseLine: 'Royal Caribbean',
    shipName: 'Wonder of the Seas',
    destination: 'Western Caribbean',
    duration: '7 Night Caribbean',
    ports: ['Miami', 'Cozumel', 'Roatan', 'Costa Maya', 'CocoCay'],
    priceFrom: 899,
    rating: 4.5,
    reviewCount: 2847,
    color: 'bg-sky-200',
    departurePort: 'Miami, FL',
    nextSailing: 'Mar 22, 2026',
  },
  {
    id: 'cr2',
    cruiseLine: 'MSC Cruises',
    shipName: 'MSC World Europa',
    destination: 'Mediterranean',
    duration: '10 Night Mediterranean',
    ports: ['Barcelona', 'Marseille', 'Genoa', 'Naples', 'Valletta', 'Palermo'],
    priceFrom: 1249,
    rating: 4.3,
    reviewCount: 1563,
    color: 'bg-indigo-200',
    departurePort: 'Barcelona, Spain',
    nextSailing: 'Apr 5, 2026',
  },
  {
    id: 'cr3',
    cruiseLine: 'Norwegian Cruise Line',
    shipName: 'Norwegian Prima',
    destination: 'Alaska',
    duration: '7 Night Alaska',
    ports: ['Seattle', 'Juneau', 'Skagway', 'Glacier Bay', 'Ketchikan'],
    priceFrom: 1099,
    rating: 4.6,
    reviewCount: 1892,
    color: 'bg-emerald-200',
    departurePort: 'Seattle, WA',
    nextSailing: 'May 15, 2026',
  },
  {
    id: 'cr4',
    cruiseLine: 'Celebrity Cruises',
    shipName: 'Celebrity Beyond',
    destination: 'Greek Isles',
    duration: '9 Night Greek Isles',
    ports: ['Rome', 'Santorini', 'Mykonos', 'Rhodes', 'Athens', 'Naples'],
    priceFrom: 1449,
    rating: 4.7,
    reviewCount: 1234,
    color: 'bg-amber-200',
    departurePort: 'Rome (Civitavecchia), Italy',
    nextSailing: 'Apr 18, 2026',
  },
  {
    id: 'cr5',
    cruiseLine: 'Disney Cruise Line',
    shipName: 'Disney Wish',
    destination: 'Bahamas',
    duration: '4 Night Bahamas',
    ports: ['Port Canaveral', 'Nassau', 'Castaway Cay'],
    priceFrom: 749,
    rating: 4.8,
    reviewCount: 3421,
    color: 'bg-rose-200',
    departurePort: 'Port Canaveral, FL',
    nextSailing: 'Mar 19, 2026',
  },
  {
    id: 'cr6',
    cruiseLine: 'Princess Cruises',
    shipName: 'Sun Princess',
    destination: 'Northern Europe',
    duration: '12 Night Northern Europe',
    ports: ['Southampton', 'Bergen', 'Geiranger', 'Flam', 'Stavanger', 'Copenhagen', 'Tallinn', 'Stockholm'],
    priceFrom: 1899,
    rating: 4.4,
    reviewCount: 987,
    color: 'bg-violet-200',
    departurePort: 'Southampton, UK',
    nextSailing: 'Jun 1, 2026',
  },
];

const cruiseLines = [
  'Royal Caribbean', 'MSC Cruises', 'Norwegian', 'Celebrity', 'Disney',
  'Princess', 'Carnival', 'Holland America', 'Viking', 'Cunard',
];

const destinations = [
  'Caribbean', 'Mediterranean', 'Alaska', 'Northern Europe', 'Greek Isles',
  'Bahamas', 'Mexican Riviera', 'Transatlantic', 'Asia', 'South Pacific',
];

const popularItineraries = [
  { name: 'Eastern Caribbean from Miami', duration: '7 nights', from: 699 },
  { name: 'Western Mediterranean from Barcelona', duration: '10 nights', from: 1149 },
  { name: 'Alaska Inside Passage from Seattle', duration: '7 nights', from: 999 },
  { name: 'Greek Isles from Athens', duration: '7 nights', from: 1299 },
];

export default function CruisesPage() {
  const [departurePort, setDeparturePort] = useState('');
  const [destination, setDestination] = useState('');
  const [month, setMonth] = useState('');
  const [duration, setDuration] = useState('');

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-700 via-sky-700 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Ship className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Explore the World by Sea</h1>
            <p className="text-lg text-sky-100">
              Find and compare cruises from the world's top cruise lines
            </p>
          </div>

          {/* Search */}
          <Card className="bg-white text-slate-900 max-w-4xl mx-auto">
            <CardContent className="py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Departure Port</label>
                  <select
                    value={departurePort}
                    onChange={(e) => setDeparturePort(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Any port</option>
                    <option value="miami">Miami, FL</option>
                    <option value="canaveral">Port Canaveral, FL</option>
                    <option value="seattle">Seattle, WA</option>
                    <option value="barcelona">Barcelona, Spain</option>
                    <option value="rome">Rome, Italy</option>
                    <option value="southampton">Southampton, UK</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Destination</label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Any destination</option>
                    {destinations.map((d) => (
                      <option key={d} value={d.toLowerCase()}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Any month</option>
                    {['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                      <option key={m} value={m.toLowerCase()}>{m} 2026</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Any length</option>
                    <option value="3-5">3-5 Nights</option>
                    <option value="6-8">6-8 Nights</option>
                    <option value="9-12">9-12 Nights</option>
                    <option value="13+">13+ Nights</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button size="lg" className="w-full">
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Featured Cruises */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Featured Cruises</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockCruises.map((cruise) => (
              <Card key={cruise.id} className="hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                {/* Image Placeholder */}
                <div className={`${cruise.color} h-48 relative flex items-center justify-center`}>
                  <Ship className="h-20 w-20 text-slate-500 opacity-30" />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-white/90 text-slate-700">{cruise.cruiseLine}</Badge>
                  </div>
                </div>
                <CardContent>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{cruise.shipName}</h3>
                  <p className="text-sm text-sky-600 font-medium mb-2">{cruise.duration}</p>

                  <div className="flex items-center gap-2 mb-3">
                    <Rating value={cruise.rating} count={cruise.reviewCount} />
                  </div>

                  {/* Ports */}
                  <div className="mb-4">
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                      <Anchor className="h-3.5 w-3.5" />
                      <span className="font-medium">Ports of Call</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cruise.ports.slice(0, 4).map((port) => (
                        <Badge key={port} variant="outline" className="text-[10px]">{port}</Badge>
                      ))}
                      {cruise.ports.length > 4 && (
                        <Badge variant="outline" className="text-[10px]">+{cruise.ports.length - 4} more</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Departs: {cruise.departurePort}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Next sailing: {cruise.nextSailing}</span>
                  </div>

                  <div className="flex items-end justify-between pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">From</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(cruise.priceFrom)}
                        <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/person</span>
                      </p>
                    </div>
                    <Button>View Sailings</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Cruise Lines */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Browse by Cruise Line</h2>
          <div className="flex flex-wrap gap-2">
            {cruiseLines.map((line) => (
              <button
                key={line}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-colors"
              >
                {line}
              </button>
            ))}
          </div>
        </section>

        {/* Popular Itineraries */}
        <section>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Popular Itineraries</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularItineraries.map((itin) => (
              <Card key={itin.name} className="hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <Navigation className="h-4 w-4 text-sky-500" />
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{itin.name}</h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {itin.duration}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      From {formatCurrency(itin.from)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom spacer */}
      <div className="h-12" />
    </motion.main>
  );
}
