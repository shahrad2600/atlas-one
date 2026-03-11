'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Trophy,
  Building2,
  UtensilsCrossed,
  Globe,
  Compass,
  Gem,
  PiggyBank,
  Home,
  Star,
  MapPin,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rating } from '@/components/ui/rating';

const categories = [
  {
    id: 'best-hotels',
    name: 'Best Hotels',
    icon: Building2,
    teaser: 'Top 25 Hotels in the World',
    color: 'bg-sky-100 text-sky-600',
  },
  {
    id: 'best-restaurants',
    name: 'Best Restaurants',
    icon: UtensilsCrossed,
    teaser: 'Top 25 Restaurants in the World',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    id: 'best-destinations',
    name: 'Best Destinations',
    icon: Globe,
    teaser: 'Top 25 Destinations in the World',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'best-experiences',
    name: 'Best Experiences',
    icon: Compass,
    teaser: 'Top 25 Experiences in the World',
    color: 'bg-violet-100 text-violet-600',
  },
  {
    id: 'best-luxury',
    name: 'Best Luxury',
    icon: Gem,
    teaser: 'Top 25 Luxury Hotels in the World',
    color: 'bg-rose-100 text-rose-600',
  },
  {
    id: 'best-value',
    name: 'Best Value',
    icon: PiggyBank,
    teaser: 'Top 25 Best Value Hotels in the World',
    color: 'bg-teal-100 text-teal-600',
  },
  {
    id: 'best-bandbs',
    name: 'Best B&Bs',
    icon: Home,
    teaser: 'Top 25 B&Bs and Inns in the World',
    color: 'bg-orange-100 text-orange-600',
  },
];

const featuredList = [
  {
    rank: 1,
    name: 'Soneva Fushi',
    location: 'Baa Atoll, Maldives',
    rating: 5.0,
    reviewCount: 1847,
    color: 'bg-sky-100',
  },
  {
    rank: 2,
    name: 'Hotel Colline de France',
    location: 'Gramado, Brazil',
    rating: 5.0,
    reviewCount: 1523,
    color: 'bg-emerald-100',
  },
  {
    rank: 3,
    name: 'Tulemar Bungalows & Villas',
    location: 'Manuel Antonio, Costa Rica',
    rating: 5.0,
    reviewCount: 2156,
    color: 'bg-amber-100',
  },
  {
    rank: 4,
    name: 'Ikos Aria',
    location: 'Kos, Greece',
    rating: 4.9,
    reviewCount: 1892,
    color: 'bg-violet-100',
  },
  {
    rank: 5,
    name: 'Capella Bangkok',
    location: 'Bangkok, Thailand',
    rating: 4.9,
    reviewCount: 1234,
    color: 'bg-rose-100',
  },
];

const years = [2024, 2025, 2026];

export default function BestOfPage() {
  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">Travelers' Choice Awards</h1>
          <p className="text-lg text-amber-100 max-w-2xl mx-auto">
            Our highest recognition, awarded to the top 1% of listings based on reviews and opinions from travelers around the world.
          </p>
          {/* Year Selector */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {years.map((year) => (
              <Link
                key={year}
                href={`/best-of?year=${year}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  year === 2026
                    ? 'bg-white text-amber-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {year}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Category Grid */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Award Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link key={cat.id} href={`/best-of/${cat.id}`}>
                  <Card className="h-full hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
                    <CardContent className="text-center py-8">
                      <div className={`h-14 w-14 rounded-full ${cat.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{cat.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{cat.teaser}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Featured List */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Top 5 Hotels in the World</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">From the 2026 Travelers' Choice Awards</p>
            </div>
            <Link href="/best-of/best-hotels">
              <Button variant="outline">View All 25</Button>
            </Link>
          </div>
          <div className="space-y-4">
            {featuredList.map((item) => (
              <Card key={item.rank} className="hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <CardContent className="py-4">
                  <div className="flex items-center gap-5">
                    {/* Rank */}
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-amber-500 text-white flex items-center justify-center text-xl font-bold">
                      {item.rank}
                    </div>

                    {/* Image Placeholder */}
                    <div className={`${item.color} h-20 w-28 rounded-lg flex-shrink-0 flex items-center justify-center`}>
                      <Building2 className="h-8 w-8 text-slate-400 opacity-50" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">{item.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {item.location}
                      </div>
                      <div className="mt-1.5">
                        <Rating value={item.rating} count={item.reviewCount} />
                      </div>
                    </div>

                    {/* Award badge */}
                    <div className="hidden sm:flex flex-shrink-0">
                      <Badge className="bg-amber-100 text-amber-700">
                        <Trophy className="h-3 w-3 mr-1" />
                        Travelers' Choice
                      </Badge>
                    </div>

                    <Link href={`/hotels/${item.rank}`} className="flex-shrink-0">
                      <Button variant="outline" size="sm">View Details</Button>
                    </Link>
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
