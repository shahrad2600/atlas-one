'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Camera,
  Building2,
  UtensilsCrossed,
  Compass,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  ThermometerSun,
  Users,
  MessageSquare,
  BookOpen,
  ChevronRight,
  Star,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ---------- mock data ---------- */

const destination = {
  id: 'paris',
  name: 'Paris',
  country: 'France',
  tagline: 'The City of Light',
  heroImage: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&h=500&fit=crop',
  description: [
    'Paris, the capital of France, is one of the most iconic cities in the world. Known for its stunning architecture, world-class museums, exquisite cuisine, and romantic atmosphere, Paris attracts over 30 million visitors each year.',
    'From the Eiffel Tower to the Louvre, from Montmartre to the Champs-Elysees, the city offers an extraordinary mix of historic landmarks, cutting-edge art, and vibrant neighborhood culture. Each arrondissement has its own distinct personality waiting to be explored.',
    'Whether you are savoring a croissant at a sidewalk cafe, wandering through centuries-old gardens, or discovering hidden passages and bookshops, Paris rewards every type of traveler with unforgettable experiences.',
  ],
  stats: {
    thingsToDo: 1247,
    restaurants: 3892,
    hotels: 2156,
  },
  bestMonths: [4, 5, 6, 9, 10],
};

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const topAttractions = [
  { id: '1', title: 'Eiffel Tower', image: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=400&h=300&fit=crop', rating: 4.7, reviewCount: 84230, category: 'Landmark', location: '7th arrondissement', price: 26, href: '/places/eiffel-tower' },
  { id: '2', title: 'Louvre Museum', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=300&fit=crop', rating: 4.8, reviewCount: 72140, category: 'Museum', location: '1st arrondissement', price: 17, href: '/places/louvre-museum' },
  { id: '3', title: "Musee d'Orsay", image: 'https://images.unsplash.com/photo-1591289009723-aef0a1a8a211?w=400&h=300&fit=crop', rating: 4.8, reviewCount: 41560, category: 'Museum', location: '7th arrondissement', price: 16, href: '/places/musee-orsay' },
  { id: '4', title: 'Sacre-Coeur', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400&h=300&fit=crop', rating: 4.6, reviewCount: 35890, category: 'Landmark', location: 'Montmartre', price: 0, href: '/places/sacre-coeur' },
  { id: '5', title: 'Palace of Versailles', image: 'https://images.unsplash.com/photo-1597910037379-e42e3d130a78?w=400&h=300&fit=crop', rating: 4.7, reviewCount: 51230, category: 'Historic Site', location: 'Versailles', price: 21, href: '/places/versailles' },
  { id: '6', title: 'Notre-Dame Cathedral', image: 'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=400&h=300&fit=crop', rating: 4.5, reviewCount: 62100, category: 'Landmark', location: 'Ile de la Cite', price: 0, href: '/places/notre-dame' },
];

const hotels = [
  { id: 'h1', title: 'Hotel Le Marais', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop', rating: 4.5, reviewCount: 1243, category: 'Hotel', location: 'Le Marais', price: 189, href: '/hotels/le-marais' },
  { id: 'h2', title: 'Ritz Paris', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&h=300&fit=crop', rating: 4.9, reviewCount: 2341, category: 'Luxury Hotel', location: 'Place Vendome', price: 1250, href: '/hotels/ritz-paris' },
  { id: 'h3', title: 'Hotel Montmartre', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=300&fit=crop', rating: 4.3, reviewCount: 876, category: 'Boutique Hotel', location: 'Montmartre', price: 142, href: '/hotels/montmartre' },
  { id: 'h4', title: 'Saint-Germain Suites', image: 'https://images.unsplash.com/photo-1590490360182-c33d955f4b1a?w=400&h=300&fit=crop', rating: 4.6, reviewCount: 654, category: 'Apartment Hotel', location: 'Saint-Germain', price: 215, href: '/hotels/saint-germain' },
  { id: 'h5', title: 'Ibis Bastille Opera', image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&h=300&fit=crop', rating: 4.0, reviewCount: 2100, category: 'Budget Hotel', location: 'Bastille', price: 89, href: '/hotels/ibis-bastille' },
  { id: 'h6', title: 'Hotel des Arts', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=300&fit=crop', rating: 4.4, reviewCount: 1023, category: 'Boutique Hotel', location: 'Republique', price: 165, href: '/hotels/des-arts' },
];

const restaurants = [
  { id: 'r1', title: 'Le Comptoir du Pantheon', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop', rating: 4.6, reviewCount: 2341, category: 'French', location: 'Latin Quarter', price: 35, href: '/restaurants/comptoir-pantheon' },
  { id: 'r2', title: 'Chez Janou', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop', rating: 4.5, reviewCount: 1876, category: 'Bistro', location: 'Le Marais', price: 28, href: '/restaurants/chez-janou' },
  { id: 'r3', title: 'Breizh Cafe', image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop', rating: 4.4, reviewCount: 1102, category: 'Creperie', location: 'Le Marais', price: 18, href: '/restaurants/breizh-cafe' },
  { id: 'r4', title: 'Le Jules Verne', image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=400&h=300&fit=crop', rating: 4.7, reviewCount: 3210, category: 'Fine Dining', location: 'Eiffel Tower', price: 120, href: '/restaurants/jules-verne' },
  { id: 'r5', title: 'Pink Mamma', image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop', rating: 4.3, reviewCount: 2890, category: 'Italian', location: 'Oberkampf', price: 22, href: '/restaurants/pink-mamma' },
  { id: 'r6', title: 'Bouillon Chartier', image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop', rating: 4.2, reviewCount: 4102, category: 'Traditional French', location: 'Grands Boulevards', price: 15, href: '/restaurants/bouillon-chartier' },
];

const experiences = [
  { id: 'e1', title: 'Seine River Cruise', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=300&fit=crop', rating: 4.6, reviewCount: 8940, category: 'Cruise', location: 'Seine River', price: 15, href: '/experiences/seine-cruise' },
  { id: 'e2', title: 'Skip-the-Line Louvre Tour', image: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=300&fit=crop', rating: 4.8, reviewCount: 5230, category: 'Tour', location: 'Louvre', price: 62, href: '/experiences/louvre-tour' },
  { id: 'e3', title: 'Montmartre Walking Tour', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400&h=300&fit=crop', rating: 4.5, reviewCount: 3100, category: 'Walking Tour', location: 'Montmartre', price: 25, href: '/experiences/montmartre-tour' },
  { id: 'e4', title: 'French Cooking Class', image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop', rating: 4.9, reviewCount: 1870, category: 'Class', location: 'Le Marais', price: 89, href: '/experiences/cooking-class' },
  { id: 'e5', title: 'Paris Catacombs Tour', image: 'https://images.unsplash.com/photo-1568684333877-4d3a227a0c06?w=400&h=300&fit=crop', rating: 4.4, reviewCount: 6720, category: 'Tour', location: 'Denfert-Rochereau', price: 29, href: '/experiences/catacombs-tour' },
  { id: 'e6', title: 'Versailles Day Trip', image: 'https://images.unsplash.com/photo-1597910037379-e42e3d130a78?w=400&h=300&fit=crop', rating: 4.7, reviewCount: 4510, category: 'Day Trip', location: 'Versailles', price: 79, href: '/experiences/versailles-day-trip' },
];

const forumTopics = [
  { id: 'f1', title: 'Best neighborhoods to stay for first-time visitors?', replies: 47, lastReply: '2 hours ago', author: 'TravelBug22' },
  { id: 'f2', title: 'Paris in December - worth it?', replies: 31, lastReply: '5 hours ago', author: 'WinterWanderer' },
  { id: 'f3', title: 'Museum Pass vs buying individual tickets', replies: 63, lastReply: '1 day ago', author: 'CultureSeeker' },
  { id: 'f4', title: 'Hidden gems away from tourist crowds', replies: 89, lastReply: '1 day ago', author: 'LocalExplorer' },
  { id: 'f5', title: 'Day trip to Mont Saint-Michel from Paris?', replies: 24, lastReply: '2 days ago', author: 'DayTripper99' },
  { id: 'f6', title: 'Best bakeries and patisseries', replies: 112, lastReply: '3 days ago', author: 'FoodieInParis' },
  { id: 'f7', title: 'Safety tips for solo female travelers', replies: 56, lastReply: '3 days ago', author: 'SoloSarah' },
  { id: 'f8', title: 'Getting from CDG to city center cheaply', replies: 38, lastReply: '4 days ago', author: 'BudgetBackpacker' },
];

const travelGuides = [
  { id: 'g1', title: '48 Hours in Paris: The Ultimate Weekend Itinerary', readTime: '12 min', date: 'Feb 2026' },
  { id: 'g2', title: 'Paris on a Budget: How to See the City Without Breaking the Bank', readTime: '8 min', date: 'Jan 2026' },
  { id: 'g3', title: 'A Foodies Guide to the Best Paris Markets', readTime: '10 min', date: 'Dec 2025' },
  { id: 'g4', title: 'Paris with Kids: Family-Friendly Activities and Tips', readTime: '9 min', date: 'Nov 2025' },
  { id: 'g5', title: 'Romantic Paris: The Best Experiences for Couples', readTime: '7 min', date: 'Oct 2025' },
  { id: 'g6', title: 'Beyond the Louvre: Underrated Museums in Paris', readTime: '11 min', date: 'Sep 2025' },
];

const nearbyDestinations = [
  { name: 'Versailles', distance: '30 min', href: '/destinations/versailles' },
  { name: 'Giverny', distance: '1.5 hrs', href: '/destinations/giverny' },
  { name: 'Loire Valley', distance: '2.5 hrs', href: '/destinations/loire-valley' },
  { name: 'Brussels', distance: '1.5 hrs', href: '/destinations/brussels' },
  { name: 'London', distance: '2.5 hrs', href: '/destinations/london' },
];

const weatherData = {
  current: { temp: 14, condition: 'Partly Cloudy', icon: Cloud },
  forecast: [
    { day: 'Mon', temp: 15, icon: Sun },
    { day: 'Tue', temp: 13, icon: Cloud },
    { day: 'Wed', temp: 11, icon: CloudRain },
    { day: 'Thu', temp: 12, icon: Cloud },
    { day: 'Fri', temp: 14, icon: Sun },
  ],
};

const experienceCategories = ['All', 'Tours', 'Outdoor', 'Cultural', 'Food & Drink', 'Day Trips', 'Classes'];

/* ---------- tabs ---------- */

const tabs = [
  { id: 'overview', label: 'Overview', icon: Compass },
  { id: 'things-to-do', label: 'Things to Do', icon: Camera },
  { id: 'hotels', label: 'Hotels', icon: Building2 },
  { id: 'restaurants', label: 'Restaurants', icon: UtensilsCrossed },
  { id: 'forums', label: 'Forums', icon: MessageSquare },
  { id: 'travel-guide', label: 'Travel Guide', icon: BookOpen },
] as const;

type TabId = (typeof tabs)[number]['id'];

/* ---------- place card component ---------- */

function PlaceCard({
  image,
  title,
  location,
  rating,
  reviewCount,
  category,
  price,
  href,
}: {
  image: string;
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  category: string;
  price: number;
  href: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
          <Image src={image} alt={title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
          <Badge className="absolute top-3 left-3" variant="default" size="sm">
            {category}
          </Badge>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors">
            {title}
          </h3>
          <div className="mt-1 flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="font-medium">{rating}</span>
            <span className="text-slate-500 dark:text-slate-400">({reviewCount.toLocaleString()} reviews)</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </div>
          {price > 0 && (
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              From ${price}
            </p>
          )}
          {price === 0 && (
            <p className="mt-2 text-sm font-semibold text-emerald-600">
              Free admission
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/* ---------- page ---------- */

export default function DestinationPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [expCategory, setExpCategory] = useState('All');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <div className="relative h-[420px] bg-slate-900">
        <Image src={destination.heroImage} alt={destination.name} fill className="object-cover opacity-70" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/destinations" className="hover:text-white">Destinations</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-white">{destination.country}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              {destination.name}
            </h1>
            <p className="mt-2 text-xl text-white/90">{destination.tagline}</p>

            {/* Quick stats */}
            <div className="mt-6 flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-white/90">
                <Camera className="h-5 w-5" />
                <span className="font-semibold">{destination.stats.thingsToDo.toLocaleString()}</span>
                <span className="text-white/70">Things to do</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <UtensilsCrossed className="h-5 w-5" />
                <span className="font-semibold">{destination.stats.restaurants.toLocaleString()}</span>
                <span className="text-white/70">Restaurants</span>
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <Building2 className="h-5 w-5" />
                <span className="font-semibold">{destination.stats.hotels.toLocaleString()}</span>
                <span className="text-white/70">Hotels</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="flex gap-1 overflow-x-auto scrollbar-none" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                    activeTab === tab.id
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content area */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Best Time to Visit */}
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <ThermometerSun className="h-5 w-5 text-amber-500" />
                      Best Time to Visit
                    </h2>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                      {monthNames.map((month, idx) => (
                        <div
                          key={month}
                          className={cn(
                            'flex flex-col items-center rounded-lg p-2 text-xs font-medium transition-colors',
                            destination.bestMonths.includes(idx + 1)
                              ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                              : 'bg-slate-100 text-slate-500',
                          )}
                        >
                          <span>{month}</span>
                          {destination.bestMonths.includes(idx + 1) && (
                            <Sun className="mt-1 h-3.5 w-3.5" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                      The best months to visit Paris are April through June and September through October, when the weather is mild and crowds are manageable.
                    </p>
                  </CardContent>
                </Card>

                {/* Description */}
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">About {destination.name}</h2>
                  {destination.description.map((p, i) => (
                    <p key={i} className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>

                {/* Top Attractions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Top Attractions</h2>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('things-to-do')}>
                      View all <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topAttractions.map((place) => (
                      <PlaceCard key={place.id} {...place} />
                    ))}
                  </div>
                </div>

                {/* Map placeholder */}
                <Card>
                  <CardContent className="p-0">
                    <div className="flex h-80 items-center justify-center rounded-xl bg-slate-200 text-slate-500 dark:text-slate-400">
                      <div className="text-center">
                        <MapPin className="mx-auto h-10 w-10 mb-2 text-slate-400" />
                        <p className="text-sm font-medium">Interactive Map</p>
                        <p className="text-xs text-slate-400 mt-1">Map loads with full application</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Things to Do Tab */}
            {activeTab === 'things-to-do' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Things to Do in {destination.name}</h2>
                  <p className="text-slate-500 dark:text-slate-400">{destination.stats.thingsToDo.toLocaleString()} activities found</p>
                </div>

                {/* Category filters */}
                <div className="flex flex-wrap gap-2">
                  {experienceCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setExpCategory(cat)}
                      className={cn(
                        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                        expCategory === cat
                          ? 'bg-sky-600 text-white'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...topAttractions, ...experiences].map((place) => (
                    <PlaceCard key={place.id} {...place} />
                  ))}
                </div>
              </div>
            )}

            {/* Hotels Tab */}
            {activeTab === 'hotels' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Hotels in {destination.name}</h2>
                  <p className="text-slate-500 dark:text-slate-400">{destination.stats.hotels.toLocaleString()} properties found</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hotels.map((hotel) => (
                    <PlaceCard key={hotel.id} {...hotel} />
                  ))}
                </div>
              </div>
            )}

            {/* Restaurants Tab */}
            {activeTab === 'restaurants' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Restaurants in {destination.name}</h2>
                  <p className="text-slate-500 dark:text-slate-400">{destination.stats.restaurants.toLocaleString()} restaurants found</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {restaurants.map((r) => (
                    <PlaceCard key={r.id} {...r} />
                  ))}
                </div>
              </div>
            )}

            {/* Forums Tab */}
            {activeTab === 'forums' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{destination.name} Travel Forums</h2>
                    <p className="text-slate-500 dark:text-slate-400">Ask questions and share tips with fellow travelers</p>
                  </div>
                  <Button>Start a Discussion</Button>
                </div>

                <div className="space-y-3">
                  {forumTopics.map((topic) => (
                    <Card key={topic.id} className="hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/forums/${topic.id}`} className="font-medium text-slate-900 dark:text-white hover:text-sky-600 transition-colors">
                            {topic.title}
                          </Link>
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>by {topic.author}</span>
                            <span>{topic.replies} replies</span>
                            <span>Last reply {topic.lastReply}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 text-slate-400">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">{topic.replies}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Travel Guide Tab */}
            {activeTab === 'travel-guide' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{destination.name} Travel Guides</h2>
                  <p className="text-slate-500 dark:text-slate-400">Expert tips and itineraries for your trip</p>
                </div>

                <div className="space-y-4">
                  {travelGuides.map((guide) => (
                    <Link key={guide.id} href={`/guides/${guide.id}`}>
                      <Card className="hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                        <CardContent className="flex items-center gap-4 p-5">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                            <BookOpen className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors">
                              {guide.title}
                            </h3>
                            <div className="mt-1 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {guide.readTime}
                              </span>
                              <span>{guide.date}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            {/* Weather widget */}
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Current Weather</h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <weatherData.current.icon className="h-10 w-10 text-sky-500" />
                  <div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{weatherData.current.temp}&deg;C</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{weatherData.current.condition}</p>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {weatherData.forecast.map((day) => (
                    <div key={day.day} className="flex flex-col items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{day.day}</span>
                      <day.icon className="my-1 h-5 w-5 text-slate-400" />
                      <span className="font-medium">{day.temp}&deg;</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trending */}
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-rose-500" />
                  Trending Now
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium text-slate-900 dark:text-white">Seine River Cruise</p>
                  <p className="text-slate-500 dark:text-slate-400">Booked 243 times this week</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-slate-900 dark:text-white">Skip-the-Line Louvre</p>
                  <p className="text-slate-500 dark:text-slate-400">Booked 189 times this week</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-slate-900 dark:text-white">French Cooking Class</p>
                  <p className="text-slate-500 dark:text-slate-400">Booked 156 times this week</p>
                </div>
              </CardContent>
            </Card>

            {/* Nearby Destinations */}
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Nearby Destinations</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                {nearbyDestinations.map((dest) => (
                  <Link
                    key={dest.name}
                    href={dest.href}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">{dest.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{dest.distance}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
