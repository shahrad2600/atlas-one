'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Trophy,
  MapPin,
  Building2,
  Share2,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rating } from '@/components/ui/rating';

const otherLists = [
  { id: 'best-hotels', name: 'Best Hotels' },
  { id: 'best-restaurants', name: 'Best Restaurants' },
  { id: 'best-destinations', name: 'Best Destinations' },
  { id: 'best-experiences', name: 'Best Experiences' },
  { id: 'best-luxury', name: 'Best Luxury' },
  { id: 'best-value', name: 'Best Value' },
  { id: 'best-bandbs', name: 'Best B&Bs' },
];

const topHotels = [
  { rank: 1, name: 'Soneva Fushi', location: 'Baa Atoll, Maldives', rating: 5.0, reviewCount: 1847, color: 'bg-sky-100' },
  { rank: 2, name: 'Hotel Colline de France', location: 'Gramado, Brazil', rating: 5.0, reviewCount: 1523, color: 'bg-emerald-100' },
  { rank: 3, name: 'Tulemar Bungalows & Villas', location: 'Manuel Antonio, Costa Rica', rating: 5.0, reviewCount: 2156, color: 'bg-amber-100' },
  { rank: 4, name: 'Ikos Aria', location: 'Kos, Greece', rating: 4.9, reviewCount: 1892, color: 'bg-violet-100' },
  { rank: 5, name: 'Capella Bangkok', location: 'Bangkok, Thailand', rating: 4.9, reviewCount: 1234, color: 'bg-rose-100' },
  { rank: 6, name: 'The Brando', location: 'Tetiaroa, French Polynesia', rating: 4.9, reviewCount: 987, color: 'bg-teal-100' },
  { rank: 7, name: 'Giardino Ascona', location: 'Ascona, Switzerland', rating: 4.9, reviewCount: 1156, color: 'bg-indigo-100' },
  { rank: 8, name: 'Nayara Tented Camp', location: 'Arenal, Costa Rica', rating: 4.9, reviewCount: 876, color: 'bg-pink-100' },
  { rank: 9, name: 'Four Seasons Resort Bora Bora', location: 'Bora Bora, French Polynesia', rating: 4.8, reviewCount: 2534, color: 'bg-cyan-100' },
  { rank: 10, name: 'Mandarin Oriental Bangkok', location: 'Bangkok, Thailand', rating: 4.8, reviewCount: 3245, color: 'bg-lime-100' },
  { rank: 11, name: 'Raffles Singapore', location: 'Singapore', rating: 4.8, reviewCount: 2876, color: 'bg-fuchsia-100' },
  { rank: 12, name: 'Belmond Hotel Caruso', location: 'Ravello, Italy', rating: 4.8, reviewCount: 1567, color: 'bg-sky-100' },
  { rank: 13, name: 'The Peninsula Tokyo', location: 'Tokyo, Japan', rating: 4.8, reviewCount: 1923, color: 'bg-amber-100' },
  { rank: 14, name: 'Rosewood London', location: 'London, United Kingdom', rating: 4.8, reviewCount: 2134, color: 'bg-emerald-100' },
  { rank: 15, name: 'Park Hyatt Sydney', location: 'Sydney, Australia', rating: 4.8, reviewCount: 1876, color: 'bg-violet-100' },
  { rank: 16, name: 'Ritz Paris', location: 'Paris, France', rating: 4.8, reviewCount: 3421, color: 'bg-rose-100' },
  { rank: 17, name: 'Aman Tokyo', location: 'Tokyo, Japan', rating: 4.7, reviewCount: 1245, color: 'bg-teal-100' },
  { rank: 18, name: 'Hotel Hassler Roma', location: 'Rome, Italy', rating: 4.7, reviewCount: 2567, color: 'bg-indigo-100' },
  { rank: 19, name: 'Claridge\'s', location: 'London, United Kingdom', rating: 4.7, reviewCount: 2987, color: 'bg-pink-100' },
  { rank: 20, name: 'The Oberoi Udaivilas', location: 'Udaipur, India', rating: 4.7, reviewCount: 1876, color: 'bg-cyan-100' },
  { rank: 21, name: 'Singita Sabi Sand', location: 'Sabi Sand, South Africa', rating: 4.7, reviewCount: 654, color: 'bg-lime-100' },
  { rank: 22, name: 'One&Only Reethi Rah', location: 'North Male Atoll, Maldives', rating: 4.7, reviewCount: 1432, color: 'bg-fuchsia-100' },
  { rank: 23, name: 'Hotel Kamp', location: 'Helsinki, Finland', rating: 4.7, reviewCount: 1876, color: 'bg-sky-100' },
  { rank: 24, name: 'The Siam', location: 'Bangkok, Thailand', rating: 4.7, reviewCount: 1123, color: 'bg-amber-100' },
  { rank: 25, name: 'Alvear Palace Hotel', location: 'Buenos Aires, Argentina', rating: 4.7, reviewCount: 2345, color: 'bg-emerald-100' },
];

export default function BestOfDetailPage() {
  const params = useParams();
  const listId = params.id as string;
  const [shared, setShared] = useState(false);

  const currentList = otherLists.find((l) => l.id === listId);
  const listName = currentList?.name ?? 'Best Hotels';

  function handleShare() {
    setShared(true);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
    setTimeout(() => setShared(false), 2000);
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link href="/best-of" className="inline-flex items-center gap-1 text-sm text-amber-100 hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to All Awards
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-6 w-6" />
                <Badge className="bg-white/20 text-white">2026 Travelers' Choice</Badge>
              </div>
              <h1 className="text-3xl font-bold">Top 25 {listName} in the World</h1>
              <p className="text-amber-100 mt-2 max-w-2xl">
                These award-winning {listName.toLowerCase()} are recognized based on exceptional reviews and ratings from travelers on Atlas One over the past year.
              </p>
            </div>
            <Button
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 flex-shrink-0"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              {shared ? 'Link Copied!' : 'Share this List'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Main List */}
          <div className="flex-1 min-w-0 space-y-3">
            {topHotels.map((hotel) => (
              <Card key={hotel.rank} className="hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold ${
                      hotel.rank <= 3
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {hotel.rank}
                    </div>

                    {/* Image Placeholder */}
                    <div className={`${hotel.color} h-16 w-24 rounded-lg flex-shrink-0 flex items-center justify-center`}>
                      <Building2 className="h-6 w-6 text-slate-400 opacity-40" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{hotel.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{hotel.location}</span>
                      </div>
                      <div className="mt-1">
                        <Rating value={hotel.rating} count={hotel.reviewCount} />
                      </div>
                    </div>

                    {/* Action */}
                    <Link href={`/hotels/${hotel.rank}`} className="flex-shrink-0">
                      <Button variant="outline" size="sm">
                        View Details
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-4">
              <Card>
                <CardContent>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Other Best-Of Lists</h3>
                  <div className="space-y-1">
                    {otherLists.map((list) => (
                      <Link
                        key={list.id}
                        href={`/best-of/${list.id}`}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                          list.id === listId
                            ? 'bg-amber-50 text-amber-700 font-medium'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {list.name}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-12" />
    </motion.main>
  );
}
