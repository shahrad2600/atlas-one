'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Star,
  MapPin,
  Wifi,
  Car,
  UtensilsCrossed,
  Waves,
  Dumbbell,
  Sparkles,
  ChevronRight,
  Clock,
  Users,
  BedDouble,
  Coffee,
  Tv,
  AirVent,
  Bath,
  Mountain,
  Check,
  X,
  ThumbsUp,
  Share2,
  Heart,
  Camera,
  PenLine,
  Calendar,
  Shield,
  Info,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ---------- mock data ---------- */

const hotel = {
  id: 'grand-hotel-barcelona',
  name: 'Grand Hotel Barcelona',
  stars: 5,
  rating: 4.7,
  reviewCount: 3245,
  address: 'La Rambla 111, 08002 Barcelona, Spain',
  description:
    'The Grand Hotel Barcelona is a landmark five-star property situated on La Rambla, the city\'s most famous boulevard. Originally built in 1892, the hotel beautifully combines Modernista architecture with contemporary luxury. Guests enjoy panoramic rooftop views of the city skyline and the Mediterranean, an award-winning restaurant, a full-service spa, and an outdoor infinity pool. Each room and suite has been individually designed with curated artwork and premium furnishings to provide an unparalleled Barcelona experience.',
  photos: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=500&fit=crop',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1590490360182-c33d955f4b1a?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop',
  ],
  amenities: [
    { icon: Wifi, label: 'Free WiFi' },
    { icon: Waves, label: 'Rooftop Pool' },
    { icon: UtensilsCrossed, label: 'Restaurant & Bar' },
    { icon: Sparkles, label: 'Full-Service Spa' },
    { icon: Dumbbell, label: 'Fitness Center' },
    { icon: Car, label: 'Valet Parking' },
    { icon: Coffee, label: 'Room Service' },
    { icon: AirVent, label: 'Air Conditioning' },
    { icon: Tv, label: 'Smart TV' },
    { icon: Shield, label: '24/7 Concierge' },
  ],
  policies: {
    checkIn: '3:00 PM',
    checkOut: '11:00 AM',
    cancellation: 'Free cancellation up to 48 hours before check-in. After that, the first night is non-refundable.',
    children: 'Children of all ages are welcome. Cribs available on request.',
    pets: 'Pets are not allowed.',
  },
  ratingBreakdown: { 5: 1782, 4: 876, 3: 387, 2: 132, 1: 68 },
};

const rooms = [
  {
    id: 'classic-double',
    name: 'Classic Double Room',
    image: 'https://images.unsplash.com/photo-1590490360182-c33d955f4b1a?w=500&h=350&fit=crop',
    size: '28 m\u00B2',
    maxGuests: 2,
    bedType: '1 Queen Bed',
    price: 289,
    features: ['City view', 'Free WiFi', 'Air conditioning', 'Smart TV', 'Minibar', 'Safe'],
  },
  {
    id: 'superior-double',
    name: 'Superior Double Room',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500&h=350&fit=crop',
    size: '35 m\u00B2',
    maxGuests: 2,
    bedType: '1 King Bed',
    price: 369,
    features: ['Balcony', 'Sea view', 'Free WiFi', 'Air conditioning', 'Smart TV', 'Minibar', 'Nespresso machine', 'Bathrobe & slippers'],
  },
  {
    id: 'junior-suite',
    name: 'Junior Suite',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&h=350&fit=crop',
    size: '48 m\u00B2',
    maxGuests: 3,
    bedType: '1 King Bed + Sofa Bed',
    price: 489,
    features: ['Living area', 'Panoramic balcony', 'Sea view', 'Free WiFi', 'Air conditioning', 'Smart TV', 'Minibar', 'Nespresso machine', 'Bathrobe & slippers', 'Complimentary breakfast'],
  },
  {
    id: 'presidential-suite',
    name: 'Presidential Suite',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&h=350&fit=crop',
    size: '95 m\u00B2',
    maxGuests: 4,
    bedType: '1 King Bed + 2 Single Beds',
    price: 1250,
    features: ['Separate living & dining', 'Private terrace', '360\u00B0 views', 'Jacuzzi bathtub', 'Butler service', 'Free WiFi', 'Air conditioning', 'Smart TV', 'Full bar', 'Nespresso machine', 'Complimentary breakfast & lounge access'],
  },
];

const reviews = [
  {
    id: 'rv1',
    author: 'Caroline D.',
    date: '2026-02-20',
    rating: 5,
    title: 'Stunning hotel in the heart of Barcelona',
    text: 'We stayed in the Junior Suite for four nights and loved every moment. The room was spacious with a beautiful balcony overlooking the city. The spa was incredible and the rooftop pool has the best sunset views. Breakfast buffet was extensive with both local and international options. Staff went above and beyond to make our anniversary special.',
    helpful: 34,
    tripType: 'Couple',
  },
  {
    id: 'rv2',
    author: 'Michael K.',
    date: '2026-01-14',
    rating: 4,
    title: 'Great location, excellent service',
    text: 'Perfect location right on La Rambla with easy access to all the sights. The Classic Double was comfortable and well-appointed. Only downside was some street noise at night, but earplugs were thoughtfully provided. The concierge team were brilliant at securing restaurant reservations and recommending hidden gems.',
    helpful: 19,
    tripType: 'Business',
  },
  {
    id: 'rv3',
    author: 'Akiko T.',
    date: '2025-12-28',
    rating: 5,
    title: 'The best hotel experience in Europe',
    text: 'From the moment we walked in, we knew this was special. The lobby is breathtaking with the original Modernista details. Our Superior Double had an amazing sea view and the bathroom was luxurious. The restaurant on site deserves its own review as the food is Michelin-quality. Would return in a heartbeat.',
    helpful: 42,
    tripType: 'Family',
  },
];

const nearbyAttractions = [
  { name: 'La Boqueria Market', distance: '200m', type: 'Market' },
  { name: 'Placa de Catalunya', distance: '350m', type: 'Square' },
  { name: 'Gothic Quarter', distance: '500m', type: 'Neighborhood' },
  { name: 'Palau de la Musica', distance: '700m', type: 'Concert Hall' },
  { name: 'Casa Batllo', distance: '1.2 km', type: 'Landmark' },
  { name: 'Barcelona Cathedral', distance: '600m', type: 'Landmark' },
];

/* ---------- tabs ---------- */
const tabOptions = ['Overview', 'Rooms', 'Reviews', 'Location', 'Q&A'] as const;
type TabId = (typeof tabOptions)[number];

/* ---------- helpers ---------- */

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 text-right text-slate-600 dark:text-slate-400">{star} star</span>
      <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-slate-500 dark:text-slate-400">{count}</span>
    </div>
  );
}

/* ---------- page ---------- */

export default function HotelDetailPage() {
  const [activeTab, setActiveTab] = useState<TabId>('Overview');
  const [saved, setSaved] = useState(false);
  const [checkIn, setCheckIn] = useState('2026-03-20');
  const [checkOut, setCheckOut] = useState('2026-03-23');

  const totalReviews = Object.values(hotel.ratingBreakdown).reduce((a, b) => a + b, 0);
  const nights = 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
    >
      {/* Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-sky-600">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/hotels" className="hover:text-sky-600">Hotels</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/destinations/barcelona" className="hover:text-sky-600">Barcelona</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900 dark:text-white">{hotel.name}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Photo Gallery */}
        <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-xl overflow-hidden h-[400px]">
          <div className="col-span-2 row-span-2 relative">
            <Image src={hotel.photos[0]} alt={hotel.name} fill className="object-cover" sizes="50vw" unoptimized />
          </div>
          {hotel.photos.slice(1).map((photo, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={photo} alt={`${hotel.name} photo ${i + 2}`} fill className="object-cover" sizes="25vw" unoptimized />
              {i === 3 && (
                <button className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-semibold text-sm hover:bg-black/60 transition-colors">
                  <Camera className="mr-2 h-5 w-5" />
                  See all photos
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Hotel header */}
        <div className="mt-6">
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: hotel.stars }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{hotel.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-sm font-bold text-emerald-700">
                {hotel.rating}
              </span>
              <span className="text-slate-500 dark:text-slate-400">({hotel.reviewCount.toLocaleString()} reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
              <MapPin className="h-4 w-4 text-slate-400" />
              {hotel.address}
            </div>
          </div>

          {/* Amenity icons row */}
          <div className="mt-4 flex flex-wrap gap-4">
            {hotel.amenities.slice(0, 6).map((a) => {
              const Icon = a.icon;
              return (
                <span key={a.label} className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <Icon className="h-4 w-4 text-sky-600" />
                  {a.label}
                </span>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex gap-3">
            <Button variant={saved ? 'default' : 'outline'} size="sm" onClick={() => setSaved(!saved)}>
              <Heart className={cn('h-4 w-4 mr-1.5', saved && 'fill-current')} />
              {saved ? 'Saved' : 'Save'}
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-1.5" />
              Share
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-slate-200 dark:border-slate-700">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Tabs">
            {tabOptions.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                  activeTab === tab
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
                )}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6 flex flex-col lg:flex-row gap-8">
          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Overview */}
            {activeTab === 'Overview' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">About This Hotel</h2>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{hotel.description}</p>
                </div>

                {/* Highlights grid */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Hotel Highlights</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {hotel.amenities.map((a) => {
                      const Icon = a.icon;
                      return (
                        <div key={a.label} className="flex flex-col items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-center">
                          <Icon className="h-6 w-6 text-sky-600 mb-2" />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{a.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Policies */}
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Hotel Policies</h2>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">Check-in: {hotel.policies.checkIn}</p>
                        <p className="text-sm font-medium text-slate-900">Check-out: {hotel.policies.checkOut}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Cancellation Policy</p>
                        <p className="text-sm text-slate-500">{hotel.policies.cancellation}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Children</p>
                        <p className="text-sm text-slate-500">{hotel.policies.children}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Pets</p>
                        <p className="text-sm text-slate-500">{hotel.policies.pets}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Rooms Tab */}
            {activeTab === 'Rooms' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Available Rooms</h2>
                {rooms.map((room) => (
                  <Card key={room.id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      <div className="relative md:w-72 shrink-0 h-48 md:h-auto">
                        <Image src={room.image} alt={room.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 288px" unoptimized />
                      </div>
                      <CardContent className="flex-1 p-5">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{room.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <BedDouble className="h-4 w-4 text-slate-400" />
                            {room.bedType}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-slate-400" />
                            Up to {room.maxGuests} guests
                          </span>
                          <span className="flex items-center gap-1">
                            <Mountain className="h-4 w-4 text-slate-400" />
                            {room.size}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {room.features.map((f) => (
                            <span key={f} className="flex items-center gap-1 text-xs text-slate-600">
                              <Check className="h-3 w-3 text-emerald-500" />
                              {f}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div>
                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(room.price)}</p>
                            <p className="text-xs text-slate-500">per night (taxes included)</p>
                          </div>
                          <Button>Book This Room</Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'Reviews' && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="text-center sm:text-left shrink-0">
                        <p className="text-5xl font-bold text-slate-900">{hotel.rating}</p>
                        <div className="mt-1 flex items-center justify-center sm:justify-start gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn('h-4 w-4', i < Math.round(hotel.rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')} />
                          ))}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{totalReviews.toLocaleString()} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((star) => (
                          <RatingBar key={star} star={star} count={hotel.ratingBreakdown[star as keyof typeof hotel.ratingBreakdown]} total={totalReviews} />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-semibold text-sm">
                              {review.author[0]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{review.author}</p>
                              <p className="text-xs text-slate-500">{formatDate(review.date)}</p>
                            </div>
                          </div>
                          <Badge variant="outline" size="sm">{review.tripType}</Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn('h-4 w-4', i < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')} />
                          ))}
                        </div>
                        <h4 className="mt-2 font-semibold text-slate-900">{review.title}</h4>
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{review.text}</p>
                        <div className="mt-4 flex items-center gap-4">
                          <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-600 transition-colors">
                            <ThumbsUp className="h-4 w-4" />
                            Helpful ({review.helpful})
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Location Tab */}
            {activeTab === 'Location' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-slate-200 h-80 flex items-center justify-center">
                  <div className="text-center text-slate-500">
                    <MapPin className="mx-auto h-10 w-10 mb-2 text-slate-400" />
                    <p className="font-medium">Location Map</p>
                    <p className="text-sm text-slate-400 mt-1">{hotel.address}</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Nearby Attractions</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {nearbyAttractions.map((a) => (
                      <div key={a.name} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{a.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{a.type}</p>
                        </div>
                        <Badge variant="outline" size="sm">{a.distance}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Q&A Tab */}
            {activeTab === 'Q&A' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Questions & Answers</h2>
                  <Button>Ask a Question</Button>
                </div>
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-sm">Q</div>
                      <div>
                        <p className="font-medium text-slate-900">Is the rooftop pool heated?</p>
                        <p className="text-xs text-slate-500 mt-1">Asked by TravelerJohn &middot; Feb 2026</p>
                      </div>
                    </div>
                    <div className="ml-11 rounded-lg bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">A</div>
                        <div>
                          <p className="text-sm text-slate-700">Yes, the rooftop pool is heated year-round and maintained at a comfortable 28 degrees Celsius. It is open from 7 AM to 10 PM daily.</p>
                          <p className="text-xs text-slate-500 mt-2">Answered by Hotel Staff &middot; Feb 2026</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-sm">Q</div>
                      <div>
                        <p className="font-medium text-slate-900">How far is the hotel from the airport?</p>
                        <p className="text-xs text-slate-500 mt-1">Asked by FlyingVisitor &middot; Jan 2026</p>
                      </div>
                    </div>
                    <div className="ml-11 rounded-lg bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">A</div>
                        <div>
                          <p className="text-sm text-slate-700">Barcelona El Prat Airport is approximately 18 km away, about 25 minutes by taxi. We offer airport transfer service for 45 EUR each way. The Aerobus also stops within a 5-minute walk of the hotel.</p>
                          <p className="text-xs text-slate-500 mt-2">Answered by Hotel Staff &middot; Jan 2026</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            {/* Price card */}
            <Card className="border-sky-200 sticky top-24">
              <CardContent className="p-5">
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(rooms[0].price)}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">/ night</span>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Check-in</label>
                      <input
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Check-out</label>
                      <input
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                    <option>2 Guests, 1 Room</option>
                    <option>1 Guest, 1 Room</option>
                    <option>3 Guests, 1 Room</option>
                    <option>4 Guests, 2 Rooms</option>
                  </select>

                  <Button className="w-full" size="lg">Book Now</Button>

                  {/* Price breakdown */}
                  <div className="border-t border-slate-200 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{formatCurrency(rooms[0].price)} x {nights} nights</span>
                      <span className="text-slate-900">{formatCurrency(rooms[0].price * nights)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Taxes & fees</span>
                      <span className="text-slate-900">{formatCurrency(Math.round(rooms[0].price * nights * 0.12))}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                      <span className="text-slate-900">Total</span>
                      <span className="text-slate-900">{formatCurrency(Math.round(rooms[0].price * nights * 1.12))}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span>Free cancellation up to 48 hours before check-in</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
