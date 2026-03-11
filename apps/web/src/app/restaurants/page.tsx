'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Search,
  MapPin,
  Star,
  SlidersHorizontal,
  UtensilsCrossed,
  DollarSign,
  Leaf,
  Coffee,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ---------- mock data ---------- */

const restaurants = [
  {
    id: 'trattoria-romana',
    name: 'Trattoria Romana',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&h=350&fit=crop',
    rating: 4.6,
    reviewCount: 2847,
    cuisine: 'Italian',
    priceLevel: '$$$',
    location: 'Trastevere, Rome',
    mealTypes: ['Lunch', 'Dinner'],
    dietary: ['Vegetarian'],
    href: '/restaurants/trattoria-romana',
  },
  {
    id: 'sakura-sushi-bar',
    name: 'Sakura Sushi Bar',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&h=350&fit=crop',
    rating: 4.8,
    reviewCount: 1923,
    cuisine: 'Japanese',
    priceLevel: '$$$$',
    location: 'Ginza, Tokyo',
    mealTypes: ['Lunch', 'Dinner'],
    dietary: ['Gluten-Free'],
    href: '/restaurants/sakura-sushi-bar',
  },
  {
    id: 'el-jardin-mexicano',
    name: 'El Jardin Mexicano',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&h=350&fit=crop',
    rating: 4.4,
    reviewCount: 1456,
    cuisine: 'Mexican',
    priceLevel: '$$',
    location: 'Centro, Mexico City',
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    dietary: ['Vegetarian', 'Vegan'],
    href: '/restaurants/el-jardin-mexicano',
  },
  {
    id: 'le-bistro-parisien',
    name: 'Le Bistro Parisien',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&h=350&fit=crop',
    rating: 4.5,
    reviewCount: 3201,
    cuisine: 'French',
    priceLevel: '$$$',
    location: 'Le Marais, Paris',
    mealTypes: ['Lunch', 'Dinner'],
    dietary: [],
    href: '/restaurants/le-bistro-parisien',
  },
  {
    id: 'golden-dragon',
    name: 'Golden Dragon',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&h=350&fit=crop',
    rating: 4.3,
    reviewCount: 876,
    cuisine: 'Chinese',
    priceLevel: '$$',
    location: 'Chinatown, London',
    mealTypes: ['Lunch', 'Dinner'],
    dietary: ['Vegetarian', 'Vegan', 'Gluten-Free'],
    href: '/restaurants/golden-dragon',
  },
  {
    id: 'the-spice-garden',
    name: 'The Spice Garden',
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=500&h=350&fit=crop',
    rating: 4.7,
    reviewCount: 2134,
    cuisine: 'Indian',
    priceLevel: '$$',
    location: 'Brick Lane, London',
    mealTypes: ['Lunch', 'Dinner'],
    dietary: ['Vegetarian', 'Vegan'],
    href: '/restaurants/the-spice-garden',
  },
  {
    id: 'casa-tapas',
    name: 'Casa Tapas',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=500&h=350&fit=crop',
    rating: 4.4,
    reviewCount: 1789,
    cuisine: 'Spanish',
    priceLevel: '$$',
    location: 'El Born, Barcelona',
    mealTypes: ['Lunch', 'Dinner'],
    dietary: ['Gluten-Free'],
    href: '/restaurants/casa-tapas',
  },
  {
    id: 'noma-garden',
    name: 'Noma Garden',
    image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=500&h=350&fit=crop',
    rating: 4.9,
    reviewCount: 4210,
    cuisine: 'Nordic',
    priceLevel: '$$$$',
    location: 'Christianshavn, Copenhagen',
    mealTypes: ['Dinner'],
    dietary: ['Vegetarian', 'Gluten-Free'],
    href: '/restaurants/noma-garden',
  },
];

const cuisineTypes = ['All', 'Italian', 'Japanese', 'Mexican', 'French', 'Chinese', 'Indian', 'Spanish', 'Nordic', 'Thai', 'Greek'];
const priceLevels = ['$', '$$', '$$$', '$$$$'];
const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
const dietaryOptions = ['Vegetarian', 'Vegan', 'Gluten-Free'];
const sortOptions = ['Recommended', 'Rating', 'Most Reviews', 'Price: Low to High', 'Price: High to Low'];

/* ---------- page ---------- */

export default function RestaurantsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('All');
  const [priceFilter, setPriceFilter] = useState<string[]>([]);
  const [mealFilter, setMealFilter] = useState<string[]>([]);
  const [dietaryFilter, setDietaryFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('Recommended');

  const togglePrice = (p: string) =>
    setPriceFilter((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  const toggleMeal = (m: string) =>
    setMealFilter((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  const toggleDietary = (d: string) =>
    setDietaryFilter((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const filtered = restaurants.filter((r) => {
    if (cuisineFilter !== 'All' && r.cuisine !== cuisineFilter) return false;
    if (priceFilter.length && !priceFilter.includes(r.priceLevel)) return false;
    if (mealFilter.length && !mealFilter.some((m) => r.mealTypes.includes(m))) return false;
    if (dietaryFilter.length && !dietaryFilter.some((d) => r.dietary.includes(d))) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q) || r.location.toLowerCase().includes(q);
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'Rating': return b.rating - a.rating;
      case 'Most Reviews': return b.reviewCount - a.reviewCount;
      case 'Price: Low to High': return a.priceLevel.length - b.priceLevel.length;
      case 'Price: High to Low': return b.priceLevel.length - a.priceLevel.length;
      default: return 0;
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
    >
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Restaurants</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Discover the best dining experiences around the world</p>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search restaurants, cuisines, or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Filters */}
        <div className="space-y-4 mb-6">
          {/* Cuisine filter pills */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cuisine</h3>
            <div className="flex flex-wrap gap-2">
              {cuisineTypes.map((c) => (
                <button
                  key={c}
                  onClick={() => setCuisineFilter(c)}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                    cuisineFilter === c
                      ? 'bg-sky-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Additional filters row */}
          <div className="flex flex-wrap gap-6">
            {/* Price */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Price</h3>
              <div className="flex gap-2">
                {priceLevels.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePrice(p)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                      priceFilter.includes(p)
                        ? 'border-sky-600 bg-sky-50 text-sky-700'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Meal type */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Meal</h3>
              <div className="flex gap-2">
                {mealTypes.map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleMeal(m)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      mealFilter.includes(m)
                        ? 'border-sky-600 bg-sky-50 text-sky-700'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Dietary</h3>
              <div className="flex gap-2">
                {dietaryOptions.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDietary(d)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1',
                      dietaryFilter.includes(d)
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    <Leaf className="h-3.5 w-3.5" />
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sort + count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">{sorted.length}</span> restaurants found
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 hidden sm:inline">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Restaurant grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sorted.map((restaurant) => (
            <Link key={restaurant.id} href={restaurant.href} className="group">
              <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <Image
                    src={restaurant.image}
                    alt={restaurant.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    unoptimized
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <Badge variant="default" size="sm">{restaurant.cuisine}</Badge>
                  </div>
                  <div className="absolute top-3 right-3 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-xs font-bold text-slate-800">
                    {restaurant.priceLevel}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors">
                    {restaurant.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-sm">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-slate-900 dark:text-white">{restaurant.rating}</span>
                    <span className="text-slate-500 dark:text-slate-400">({restaurant.reviewCount.toLocaleString()})</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5" />
                    {restaurant.location}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {restaurant.mealTypes.map((m) => (
                      <span key={m} className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5">{m}</span>
                    ))}
                    {restaurant.dietary.map((d) => (
                      <span key={d} className="text-xs text-emerald-600 bg-emerald-50 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                        <Leaf className="h-3 w-3" />
                        {d}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-16">
            <UtensilsCrossed className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-lg font-medium text-slate-900 dark:text-white">No restaurants match your filters</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try adjusting your filters to see more results</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
