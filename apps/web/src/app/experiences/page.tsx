'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  MapPin,
  Star,
  Clock,
  Compass,
  Mountain,
  Palette,
  UtensilsCrossed,
  Map,
  GraduationCap,
  Bike,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ---------- mock data ---------- */

const experiences = [
  {
    id: 'rome-colosseum-tour',
    name: 'Colosseum & Roman Forum Guided Tour',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500&h=350&fit=crop',
    rating: 4.8,
    reviewCount: 12540,
    category: 'Tours',
    location: 'Rome, Italy',
    price: 59,
    duration: '3 hours',
    href: '/experiences/rome-colosseum-tour',
  },
  {
    id: 'bali-rice-terraces',
    name: 'Bali Rice Terraces & Waterfall Trek',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=500&h=350&fit=crop',
    rating: 4.7,
    reviewCount: 4320,
    category: 'Outdoor',
    location: 'Ubud, Bali',
    price: 45,
    duration: '8 hours',
    href: '/experiences/bali-rice-terraces',
  },
  {
    id: 'kyoto-tea-ceremony',
    name: 'Traditional Japanese Tea Ceremony',
    image: 'https://images.unsplash.com/photo-1545048702-79362596cdc9?w=500&h=350&fit=crop',
    rating: 4.9,
    reviewCount: 2890,
    category: 'Cultural',
    location: 'Kyoto, Japan',
    price: 65,
    duration: '1.5 hours',
    href: '/experiences/kyoto-tea-ceremony',
  },
  {
    id: 'barcelona-tapas-tour',
    name: 'Barcelona Tapas & Wine Walking Tour',
    image: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=500&h=350&fit=crop',
    rating: 4.6,
    reviewCount: 6780,
    category: 'Food & Drink',
    location: 'Barcelona, Spain',
    price: 79,
    duration: '4 hours',
    href: '/experiences/barcelona-tapas-tour',
  },
  {
    id: 'cinque-terre-day-trip',
    name: 'Cinque Terre Day Trip from Florence',
    image: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=500&h=350&fit=crop',
    rating: 4.5,
    reviewCount: 3210,
    category: 'Day Trips',
    location: 'Florence, Italy',
    price: 95,
    duration: '12 hours',
    href: '/experiences/cinque-terre-day-trip',
  },
  {
    id: 'thai-cooking-class',
    name: 'Thai Cooking Class with Market Tour',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&h=350&fit=crop',
    rating: 4.8,
    reviewCount: 5430,
    category: 'Classes',
    location: 'Bangkok, Thailand',
    price: 35,
    duration: '5 hours',
    href: '/experiences/thai-cooking-class',
  },
  {
    id: 'amsterdam-bike-tour',
    name: 'Amsterdam Bike Tour with Local Guide',
    image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=500&h=350&fit=crop',
    rating: 4.7,
    reviewCount: 2340,
    category: 'Tours',
    location: 'Amsterdam, Netherlands',
    price: 39,
    duration: '3 hours',
    href: '/experiences/amsterdam-bike-tour',
  },
  {
    id: 'morocco-desert-camp',
    name: 'Sahara Desert Overnight Camp Experience',
    image: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=500&h=350&fit=crop',
    rating: 4.6,
    reviewCount: 1890,
    category: 'Outdoor',
    location: 'Merzouga, Morocco',
    price: 120,
    duration: '2 days',
    href: '/experiences/morocco-desert-camp',
  },
];

const categories = [
  { id: 'All', label: 'All Experiences', icon: Compass },
  { id: 'Tours', label: 'Tours', icon: Map },
  { id: 'Outdoor', label: 'Outdoor', icon: Mountain },
  { id: 'Cultural', label: 'Cultural', icon: Palette },
  { id: 'Food & Drink', label: 'Food & Drink', icon: UtensilsCrossed },
  { id: 'Day Trips', label: 'Day Trips', icon: Bike },
  { id: 'Classes', label: 'Classes', icon: GraduationCap },
];

const sortOptions = ['Recommended', 'Price: Low to High', 'Price: High to Low', 'Rating', 'Most Popular'];

/* ---------- page ---------- */

export default function ExperiencesPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Recommended');

  const filtered = activeCategory === 'All'
    ? experiences
    : experiences.filter((e) => e.category === activeCategory);

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'Price: Low to High': return a.price - b.price;
      case 'Price: High to Low': return b.price - a.price;
      case 'Rating': return b.rating - a.rating;
      case 'Most Popular': return b.reviewCount - a.reviewCount;
      default: return 0;
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Experiences & Tours</h1>
          <p className="text-slate-500 dark:text-slate-400">Discover unforgettable activities and guided tours worldwide</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Category pills */}
        <div className="flex flex-wrap gap-3 mb-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  activeCategory === cat.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50',
                )}
              >
                <Icon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Sort + count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">{sorted.length}</span> experiences found
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {sortOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sorted.map((exp) => (
            <Link key={exp.id} href={exp.href} className="group">
              <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
                  <Image src={exp.image} alt={exp.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                  <Badge className="absolute top-3 left-3" variant="default" size="sm">
                    {exp.category}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors line-clamp-2">
                    {exp.name}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-1.5 text-sm">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{exp.rating}</span>
                    <span className="text-slate-500 dark:text-slate-400">({exp.reviewCount.toLocaleString()})</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5" />
                    {exp.location}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {exp.duration}
                    </span>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 dark:text-slate-400">From</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(exp.price)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-16">
            <Compass className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-lg font-medium text-slate-900 dark:text-white">No experiences found for this category</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try selecting a different category</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
