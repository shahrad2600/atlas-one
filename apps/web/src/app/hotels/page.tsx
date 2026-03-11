'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  Star,
  SlidersHorizontal,
  Wifi,
  Car,
  UtensilsCrossed,
  Waves,
  Dumbbell,
  Sparkles,
  Calendar,
  Users,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

/* ---------- mock data ---------- */

const hotels = [
  {
    id: 'grand-hotel-barcelona',
    name: 'Grand Hotel Barcelona',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&h=350&fit=crop',
    rating: 4.7,
    reviewCount: 3245,
    stars: 5,
    location: 'La Rambla, Barcelona',
    price: 289,
    amenities: ['wifi', 'pool', 'restaurant', 'spa', 'gym', 'parking'],
    propertyType: 'Hotel',
  },
  {
    id: 'hotel-montmartre-paris',
    name: 'Hotel Montmartre',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=500&h=350&fit=crop',
    rating: 4.4,
    reviewCount: 1876,
    stars: 4,
    location: 'Montmartre, Paris',
    price: 175,
    amenities: ['wifi', 'restaurant', 'parking'],
    propertyType: 'Boutique Hotel',
  },
  {
    id: 'resort-amalfi-coast',
    name: 'Amalfi Coast Resort & Spa',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&h=350&fit=crop',
    rating: 4.9,
    reviewCount: 2104,
    stars: 5,
    location: 'Positano, Amalfi Coast',
    price: 450,
    amenities: ['wifi', 'pool', 'restaurant', 'spa', 'gym'],
    propertyType: 'Resort',
  },
  {
    id: 'santorini-cave-suites',
    name: 'Santorini Cave Suites',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500&h=350&fit=crop',
    rating: 4.8,
    reviewCount: 1432,
    stars: 5,
    location: 'Oia, Santorini',
    price: 520,
    amenities: ['wifi', 'pool', 'spa'],
    propertyType: 'Hotel',
  },
  {
    id: 'amsterdam-canal-house',
    name: 'Amsterdam Canal House',
    image: 'https://images.unsplash.com/photo-1590490360182-c33d955f4b1a?w=500&h=350&fit=crop',
    rating: 4.3,
    reviewCount: 987,
    stars: 3,
    location: 'Jordaan, Amsterdam',
    price: 145,
    amenities: ['wifi', 'parking'],
    propertyType: 'B&B',
  },
  {
    id: 'london-soho-boutique',
    name: 'Soho Boutique London',
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=500&h=350&fit=crop',
    rating: 4.5,
    reviewCount: 2341,
    stars: 4,
    location: 'Soho, London',
    price: 225,
    amenities: ['wifi', 'restaurant', 'gym'],
    propertyType: 'Boutique Hotel',
  },
  {
    id: 'prague-old-town-hostel',
    name: 'Old Town Square Hostel',
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=500&h=350&fit=crop',
    rating: 4.1,
    reviewCount: 3456,
    stars: 2,
    location: 'Old Town, Prague',
    price: 42,
    amenities: ['wifi'],
    propertyType: 'Hostel',
  },
  {
    id: 'rome-villa-borghese',
    name: 'Villa Borghese Hotel',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&h=350&fit=crop',
    rating: 4.6,
    reviewCount: 1654,
    stars: 4,
    location: 'Villa Borghese, Rome',
    price: 198,
    amenities: ['wifi', 'restaurant', 'spa', 'parking', 'gym'],
    propertyType: 'Hotel',
  },
];

const amenityIcons: Record<string, { icon: typeof Wifi; label: string }> = {
  wifi: { icon: Wifi, label: 'WiFi' },
  pool: { icon: Waves, label: 'Pool' },
  parking: { icon: Car, label: 'Parking' },
  restaurant: { icon: UtensilsCrossed, label: 'Restaurant' },
  spa: { icon: Sparkles, label: 'Spa' },
  gym: { icon: Dumbbell, label: 'Gym' },
};

const amenityFilters = ['Pool', 'WiFi', 'Parking', 'Restaurant', 'Spa', 'Gym'];
const propertyTypes = ['Hotel', 'Resort', 'B&B', 'Hostel', 'Boutique Hotel'];
const sortOptions = ['Recommended', 'Price: Low to High', 'Price: High to Low', 'Rating', 'Most Reviews'];

/* ---------- page ---------- */

export default function HotelsPage() {
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');
  const [sortBy, setSortBy] = useState('Recommended');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 600]);
  const [starFilter, setStarFilter] = useState<number[]>([]);
  const [amenityFilter, setAmenityFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const toggleStar = (s: number) =>
    setStarFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const toggleAmenity = (a: string) =>
    setAmenityFilter((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const toggleType = (t: string) =>
    setTypeFilter((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const filtered = hotels.filter((h) => {
    if (starFilter.length && !starFilter.includes(h.stars)) return false;
    if (typeFilter.length && !typeFilter.includes(h.propertyType)) return false;
    if (h.price < priceRange[0] || h.price > priceRange[1]) return false;
    if (amenityFilter.length) {
      const lower = amenityFilter.map((a) => a.toLowerCase());
      if (!lower.every((a) => h.amenities.includes(a))) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'Price: Low to High': return a.price - b.price;
      case 'Price: High to Low': return b.price - a.price;
      case 'Rating': return b.rating - a.rating;
      case 'Most Reviews': return b.reviewCount - a.reviewCount;
      default: return 0;
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Find Your Perfect Hotel</h1>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Where are you going?"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                placeholder="Check-in"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full md:w-40 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                placeholder="Check-out"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full md:w-40 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full md:w-36 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none"
              >
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="3">3 Guests</option>
                <option value="4">4 Guests</option>
                <option value="5">5+ Guests</option>
              </select>
            </div>
            <Button className="shrink-0">
              <Search className="h-4 w-4 mr-1.5" />
              Search
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter sidebar - desktop */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden lg:block w-64 shrink-0 space-y-6"
          >
            <Card>
              <CardContent className="p-5 space-y-6">
                {/* Price range */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Price per night</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      className="w-20 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-center text-sm text-slate-900 dark:text-white"
                      min={0}
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="w-20 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-center text-sm text-slate-900 dark:text-white"
                      min={0}
                    />
                  </div>
                </div>

                {/* Star rating */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Star Rating</h3>
                  <div className="flex flex-wrap gap-2">
                    {[5, 4, 3, 2, 1].map((s) => (
                      <button
                        key={s}
                        onClick={() => toggleStar(s)}
                        className={cn(
                          'flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          starFilter.includes(s)
                            ? 'border-sky-600 bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-500'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800',
                        )}
                      >
                        {s} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Amenities</h3>
                  <div className="space-y-2">
                    {amenityFilters.map((a) => (
                      <label key={a} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={amenityFilter.includes(a)}
                          onChange={() => toggleAmenity(a)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{a}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Property Type</h3>
                  <div className="space-y-2">
                    {propertyTypes.map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={typeFilter.includes(t)}
                          onChange={() => toggleType(t)}
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.aside>

          {/* Mobile filter toggle */}
          <div className="lg:hidden">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="w-full">
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              Filters
              {(starFilter.length + amenityFilter.length + typeFilter.length > 0) && (
                <Badge size="sm" className="ml-2">{starFilter.length + amenityFilter.length + typeFilter.length}</Badge>
              )}
            </Button>
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <Card className="mt-3">
                    <CardContent className="p-5 space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Star Rating</h3>
                        <div className="flex flex-wrap gap-2">
                          {[5, 4, 3, 2, 1].map((s) => (
                            <button
                              key={s}
                              onClick={() => toggleStar(s)}
                              className={cn(
                                'flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                starFilter.includes(s)
                                  ? 'border-sky-600 bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                                  : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400',
                              )}
                            >
                              {s} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Amenities</h3>
                        <div className="flex flex-wrap gap-2">
                          {amenityFilters.map((a) => (
                            <button
                              key={a}
                              onClick={() => toggleAmenity(a)}
                              className={cn(
                                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                amenityFilter.includes(a)
                                  ? 'border-sky-600 bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                                  : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400',
                              )}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Property Type</h3>
                        <div className="flex flex-wrap gap-2">
                          {propertyTypes.map((t) => (
                            <button
                              key={t}
                              onClick={() => toggleType(t)}
                              className={cn(
                                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                typeFilter.includes(t)
                                  ? 'border-sky-600 bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                                  : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400',
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Sort bar */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-white">{sorted.length}</span> hotels found
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hotel cards */}
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
            >
              {sorted.map((hotel) => (
                <motion.div key={hotel.id} variants={fadeUp}>
                  <Link href={`/hotels/${hotel.id}`} className="group">
                    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 h-full hover:-translate-y-1">
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-200 dark:bg-slate-700">
                        <Image
                          src={hotel.image}
                          alt={hotel.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          unoptimized
                        />
                        <Badge className="absolute top-3 left-3" variant="default" size="sm">
                          {hotel.propertyType}
                        </Badge>
                        <div className="absolute top-3 right-3 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2 py-1 text-xs font-bold text-slate-900 dark:text-white">
                          {formatCurrency(hotel.price)}<span className="font-normal text-slate-500 dark:text-slate-400">/night</span>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({ length: hotel.stars }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                          {hotel.name}
                        </h3>
                        <div className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                          <MapPin className="h-3.5 w-3.5" />
                          {hotel.location}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-sm">
                          <span className="flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            {hotel.rating}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">({hotel.reviewCount.toLocaleString()} reviews)</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {hotel.amenities.slice(0, 4).map((a) => {
                            const info = amenityIcons[a];
                            if (!info) return null;
                            const Icon = info.icon;
                            return (
                              <span key={a} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400" title={info.label}>
                                <Icon className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">{info.label}</span>
                              </span>
                            );
                          })}
                          {hotel.amenities.length > 4 && (
                            <span className="text-xs text-slate-400 dark:text-slate-500">+{hotel.amenities.length - 4} more</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {sorted.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Search className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-lg font-medium text-slate-900 dark:text-white">No hotels match your filters</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters to see more results</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
