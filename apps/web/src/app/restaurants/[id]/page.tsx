'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Heart,
  Share2,
  PenLine,
  MapPin,
  Clock,
  Phone,
  Globe,
  ChevronRight,
  ThumbsUp,
  Camera,
  DollarSign,
  Flame,
  Leaf,
  CalendarDays,
  Users,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ---------- mock data ---------- */

const restaurant = {
  id: 'trattoria-romana',
  name: 'Trattoria Romana',
  rating: 4.6,
  reviewCount: 2847,
  priceLevel: '$$$',
  cuisine: ['Italian', 'Mediterranean', 'Vegetarian Friendly'],
  address: 'Via del Moro 37, 00153 Rome, Italy',
  phone: '+39 06 580 3798',
  website: 'https://trattoriaromana.it',
  description:
    'Trattoria Romana is a beloved family-run restaurant in the heart of Trastevere, serving authentic Roman cuisine since 1962. The kitchen uses only the freshest seasonal ingredients sourced from local Roman markets, with many recipes passed down through three generations. The warm, rustic interior features exposed brick walls and soft candlelight, creating the perfect atmosphere for a memorable Italian dining experience. During warmer months, the charming courtyard offers al fresco dining under a canopy of wisteria.',
  hours: [
    { day: 'Monday', hours: 'Closed' },
    { day: 'Tuesday', hours: '12:30 PM - 3:00 PM, 7:00 PM - 11:00 PM' },
    { day: 'Wednesday', hours: '12:30 PM - 3:00 PM, 7:00 PM - 11:00 PM' },
    { day: 'Thursday', hours: '12:30 PM - 3:00 PM, 7:00 PM - 11:00 PM' },
    { day: 'Friday', hours: '12:30 PM - 3:00 PM, 7:00 PM - 11:30 PM' },
    { day: 'Saturday', hours: '12:00 PM - 3:30 PM, 7:00 PM - 11:30 PM' },
    { day: 'Sunday', hours: '12:00 PM - 3:30 PM, 7:00 PM - 10:30 PM' },
  ],
  photos: [
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop',
  ],
  popularDishes: [
    { name: 'Cacio e Pepe', description: 'The signature Roman pasta with pecorino and black pepper', price: 16 },
    { name: 'Saltimbocca alla Romana', description: 'Veal wrapped with prosciutto and sage', price: 24 },
    { name: 'Supplì al Telefono', description: 'Crispy fried rice balls with mozzarella', price: 8 },
    { name: 'Tiramisu della Nonna', description: 'Grandmother\'s classic tiramisu recipe', price: 10 },
  ],
  ratingBreakdown: { 5: 1423, 4: 821, 3: 389, 2: 142, 1: 72 },
};

const menu = {
  'Antipasti (Starters)': [
    { name: 'Bruschetta al Pomodoro', description: 'Toasted bread with fresh tomatoes, basil, and garlic', price: 9 },
    { name: 'Supplì al Telefono', description: 'Crispy fried rice balls with stretchy mozzarella', price: 8 },
    { name: 'Carpaccio di Manzo', description: 'Thinly sliced raw beef with rocket, parmesan, and lemon', price: 14 },
    { name: 'Burrata con Prosciutto', description: 'Creamy burrata with San Daniele prosciutto and figs', price: 16 },
    { name: 'Fiori di Zucca', description: 'Fried zucchini flowers stuffed with ricotta and anchovy', price: 12 },
  ],
  'Primi (Pasta)': [
    { name: 'Cacio e Pepe', description: 'Tonnarelli with pecorino romano and cracked black pepper', price: 16 },
    { name: 'Carbonara', description: 'Rigatoni with guanciale, egg, pecorino, and black pepper', price: 17 },
    { name: 'Amatriciana', description: 'Bucatini with guanciale, tomato, pecorino, and chili', price: 16 },
    { name: 'Carciofi e Gamberi', description: 'Fresh pappardelle with artichokes and prawns', price: 22 },
    { name: 'Gnocchi alla Sorrentina', description: 'Potato gnocchi with tomato, mozzarella, and basil', price: 15 },
  ],
  'Secondi (Mains)': [
    { name: 'Saltimbocca alla Romana', description: 'Veal with prosciutto and sage in white wine sauce', price: 24 },
    { name: 'Ossobuco', description: 'Braised veal shank with gremolata and saffron risotto', price: 28 },
    { name: 'Branzino al Forno', description: 'Oven-roasted sea bass with cherry tomatoes and olives', price: 26 },
    { name: 'Pollo alla Cacciatora', description: 'Hunter-style chicken with tomatoes, olives, and herbs', price: 20 },
    { name: 'Tagliata di Manzo', description: 'Sliced grilled ribeye with rocket and aged parmesan', price: 30 },
  ],
  'Dolci (Desserts)': [
    { name: 'Tiramisu della Nonna', description: 'Classic tiramisu with mascarpone and espresso', price: 10 },
    { name: 'Panna Cotta', description: 'Vanilla panna cotta with seasonal berry compote', price: 9 },
    { name: 'Cannoli Siciliani', description: 'Crispy pastry tubes filled with sweetened ricotta', price: 8 },
    { name: 'Torta al Cioccolato', description: 'Warm chocolate fondant with vanilla gelato', price: 11 },
  ],
};

const reviews = [
  {
    id: 'r1',
    author: 'Laura B.',
    date: '2026-02-22',
    rating: 5,
    title: 'The best pasta I have ever had, no exaggeration',
    text: 'We went for the Cacio e Pepe on a local friend\'s recommendation and it was transcendent. The simplicity of three ingredients done perfectly is what Italian cooking is all about. The courtyard setting in summer was magical. Our waiter Marco was incredibly knowledgeable about the wine list. We came back twice more during our week in Rome. Absolutely essential dining.',
    helpful: 45,
    tripType: 'Couple',
  },
  {
    id: 'r2',
    author: 'Thomas H.',
    date: '2026-02-10',
    rating: 4,
    title: 'Authentic Roman food in a lovely setting',
    text: 'Solid trattoria with genuine Roman cooking. The supplì were perfectly crispy and the carbonara was excellent with proper guanciale. The only slight negative was the wait for a table even with a reservation. The house red was surprisingly good at a fair price. Desserts were homemade and delicious.',
    helpful: 22,
    tripType: 'Friends',
  },
  {
    id: 'r3',
    author: 'Priya S.',
    date: '2026-01-18',
    rating: 5,
    title: 'A real gem tucked away in Trastevere',
    text: 'Found this place by wandering the cobblestone streets of Trastevere and what a find it was. The burrata with prosciutto was incredibly fresh and the ossobuco was fall-off-the-bone tender. They also have great vegetarian options with the fried zucchini flowers being a standout. Prices are reasonable for the quality. Book ahead for dinner.',
    helpful: 38,
    tripType: 'Solo',
  },
  {
    id: 'r4',
    author: 'David M.',
    date: '2025-12-30',
    rating: 4,
    title: 'Great family meal with lovely staff',
    text: 'Took the whole family here including two young kids and the staff were wonderful. They brought coloring sheets and crayons for the children and were patient with our many questions about the menu. The food was excellent across the board. My wife loved the branzino and I had a perfect saltimbocca. Good value for central Rome.',
    helpful: 16,
    tripType: 'Family',
  },
];

const masonryPhotos = [
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=350&fit=crop',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=350&fit=crop',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=400&h=450&fit=crop',
];

/* ---------- tabs ---------- */
const tabOptions = ['Overview', 'Menu', 'Reviews', 'Photos'] as const;
type TabId = (typeof tabOptions)[number];

/* ---------- helpers ---------- */
function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 text-right text-slate-600">{star} star</span>
      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-slate-500 dark:text-slate-400">{count}</span>
    </div>
  );
}

/* ---------- page ---------- */

export default function RestaurantDetailPage() {
  const [activeTab, setActiveTab] = useState<TabId>('Overview');
  const [saved, setSaved] = useState(false);

  const totalReviews = Object.values(restaurant.ratingBreakdown).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-sky-600">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/restaurants" className="hover:text-sky-600">Restaurants</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/destinations/rome" className="hover:text-sky-600">Rome</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900">{restaurant.name}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Photo gallery */}
        <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-xl overflow-hidden h-[400px]">
          <div className="col-span-2 row-span-2 relative">
            <Image src={restaurant.photos[0]} alt={restaurant.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
          </div>
          {restaurant.photos.slice(1).map((photo, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={photo} alt={`${restaurant.name} ${i + 2}`} fill className="object-cover" sizes="25vw" unoptimized />
              {i === 3 && (
                <button className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-semibold text-sm">
                  <Camera className="mr-2 h-5 w-5" />
                  See all photos
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{restaurant.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn('h-5 w-5', i < Math.round(restaurant.rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')}
                    />
                  ))}
                  <span className="ml-1 text-lg font-bold">{restaurant.rating}</span>
                </div>
                <span className="text-slate-500 dark:text-slate-400">({restaurant.reviewCount.toLocaleString()} reviews)</span>
                <span className="text-slate-500 font-medium">{restaurant.priceLevel}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {restaurant.cuisine.map((c) => (
                  <Badge key={c} variant="outline" size="sm">{c}</Badge>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                <MapPin className="h-4 w-4 text-slate-400" />
                {restaurant.address}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant={saved ? 'default' : 'outline'} size="sm" onClick={() => setSaved(!saved)}>
                <Heart className={cn('h-4 w-4 mr-1.5', saved && 'fill-current')} />
                {saved ? 'Saved' : 'Save'}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-1.5" />
                Share
              </Button>
              <Link href="/reviews/write">
                <Button variant="outline" size="sm">
                  <PenLine className="h-4 w-4 mr-1.5" />
                  Write a Review
                </Button>
              </Link>
            </div>

            {/* Tabs */}
            <div className="mt-6 border-b border-slate-200 dark:border-slate-700">
              <nav className="flex gap-1">
                {tabOptions.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
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

            {/* Overview */}
            {activeTab === 'Overview' && (
              <div className="mt-6 space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">About</h2>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{restaurant.description}</p>
                </div>

                {/* Popular Dishes */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    Popular Dishes
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {restaurant.popularDishes.map((dish) => (
                      <Card key={dish.name}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-slate-900 dark:text-white">{dish.name}</h4>
                              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{dish.description}</p>
                            </div>
                            <span className="shrink-0 ml-3 font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(dish.price, 'EUR')}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Hours */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-slate-400" />
                    Hours of Operation
                  </h2>
                  <div className="space-y-2">
                    {restaurant.hours.map((h) => (
                      <div key={h.day} className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700 w-28">{h.day}</span>
                        <span className={h.hours === 'Closed' ? 'text-rose-500' : 'text-slate-600'}>{h.hours}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Contact</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {restaurant.phone}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <a href={restaurant.website} className="text-sky-600 hover:underline" target="_blank" rel="noopener noreferrer">Visit Website</a>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {restaurant.address}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Menu Tab */}
            {activeTab === 'Menu' && (
              <div className="mt-6 space-y-8">
                {Object.entries(menu).map(([category, items]) => (
                  <div key={category}>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 border-b border-slate-200 pb-2">{category}</h2>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.name} className="flex items-start justify-between py-2">
                          <div className="flex-1 mr-4">
                            <h4 className="font-medium text-slate-900 dark:text-white">{item.name}</h4>
                            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                          </div>
                          <span className="shrink-0 font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(item.price, 'EUR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'Reviews' && (
              <div className="mt-6 space-y-6">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="text-center sm:text-left shrink-0">
                        <p className="text-5xl font-bold text-slate-900 dark:text-white">{restaurant.rating}</p>
                        <div className="mt-1 flex items-center justify-center sm:justify-start gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn('h-4 w-4', i < Math.round(restaurant.rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')} />
                          ))}
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{totalReviews.toLocaleString()} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((star) => (
                          <RatingBar key={star} star={star} count={restaurant.ratingBreakdown[star as keyof typeof restaurant.ratingBreakdown]} total={totalReviews} />
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
                              <p className="font-medium text-slate-900 dark:text-white">{review.author}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(review.date)}</p>
                            </div>
                          </div>
                          <Badge variant="outline" size="sm">{review.tripType}</Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn('h-4 w-4', i < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')} />
                          ))}
                        </div>
                        <h4 className="mt-2 font-semibold text-slate-900 dark:text-white">{review.title}</h4>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{review.text}</p>
                        <div className="mt-4 flex items-center gap-4">
                          <button className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-sky-600 transition-colors">
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

            {/* Photos Tab */}
            {activeTab === 'Photos' && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Photos</h2>
                  <Button variant="outline"><Camera className="h-4 w-4 mr-1.5" />Add Photo</Button>
                </div>
                <div className="columns-2 md:columns-3 gap-3 space-y-3">
                  {masonryPhotos.map((photo, i) => (
                    <div key={i} className="relative break-inside-avoid overflow-hidden rounded-lg aspect-[4/3]">
                      <Image src={photo} alt={`Photo ${i + 1}`} fill className="object-cover hover:opacity-90 transition-opacity cursor-pointer" sizes="(max-width: 768px) 50vw, 33vw" unoptimized />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            {/* Reservation */}
            <Card className="border-sky-200 bg-sky-50/50 sticky top-24">
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Make a Reservation</h3>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                    <input type="date" defaultValue="2026-03-15" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
                      <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                        <option>7:00 PM</option>
                        <option>7:30 PM</option>
                        <option>8:00 PM</option>
                        <option>8:30 PM</option>
                        <option>9:00 PM</option>
                        <option>9:30 PM</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Party size</label>
                      <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                        <option>1 guest</option>
                        <option>2 guests</option>
                        <option>3 guests</option>
                        <option>4 guests</option>
                        <option>5 guests</option>
                        <option>6+ guests</option>
                      </select>
                    </div>
                  </div>
                  <Button className="w-full">Reserve a Table</Button>
                  <p className="text-xs text-center text-slate-500 dark:text-slate-400">Free cancellation up to 2 hours before</p>
                </div>
              </CardContent>
            </Card>

            {/* Price range */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Price Range</h3>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  {restaurant.priceLevel} &middot; EUR 15 - EUR 30 per person
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
