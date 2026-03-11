'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  User,
  BookOpen,
  MapPin,
  Compass,
  UtensilsCrossed,
  Mountain,
  Wallet,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ---------- mock data ---------- */

const featuredGuide = {
  id: '48-hours-in-tokyo',
  title: '48 Hours in Tokyo: The Ultimate Weekend Itinerary',
  image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&h=500&fit=crop',
  destination: 'Tokyo, Japan',
  author: 'Sarah Chen',
  readTime: '12 min read',
  category: 'City Guides',
  excerpt: 'From the neon-lit streets of Shibuya to the serene temples of Asakusa, discover the best of Tokyo in just two days with this curated itinerary covering food, culture, and neighborhoods.',
};

const guides = [
  {
    id: 'rome-food-guide',
    title: 'Eating Like a Roman: A Neighborhood Food Guide',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500&h=350&fit=crop',
    destination: 'Rome, Italy',
    author: 'Marco Rossi',
    readTime: '10 min read',
    category: 'Food Guides',
  },
  {
    id: 'patagonia-trekking',
    title: 'Trekking Patagonia: Torres del Paine Complete Guide',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=500&h=350&fit=crop',
    destination: 'Patagonia, Chile',
    author: 'Elena Martinez',
    readTime: '15 min read',
    category: 'Adventure',
  },
  {
    id: 'lisbon-budget-guide',
    title: 'Lisbon on a Budget: Affordable Travel Without Compromise',
    image: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=500&h=350&fit=crop',
    destination: 'Lisbon, Portugal',
    author: 'James Porter',
    readTime: '8 min read',
    category: 'Budget Travel',
  },
  {
    id: 'maldives-luxury',
    title: 'The Ultimate Maldives Luxury Resort Guide',
    image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=500&h=350&fit=crop',
    destination: 'Maldives',
    author: 'Victoria James',
    readTime: '11 min read',
    category: 'Luxury',
  },
  {
    id: 'barcelona-weekend',
    title: 'A Perfect Weekend in Barcelona: Art, Food & Beach',
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=500&h=350&fit=crop',
    destination: 'Barcelona, Spain',
    author: 'Carlos Ruiz',
    readTime: '9 min read',
    category: 'City Guides',
  },
  {
    id: 'bangkok-street-food',
    title: 'Bangkok Street Food: 25 Dishes You Must Try',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&h=350&fit=crop',
    destination: 'Bangkok, Thailand',
    author: 'Aimee Wong',
    readTime: '13 min read',
    category: 'Food Guides',
  },
  {
    id: 'iceland-ring-road',
    title: 'Iceland Ring Road: 10 Day Self-Drive Itinerary',
    image: 'https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=500&h=350&fit=crop',
    destination: 'Iceland',
    author: 'Erik Thorsson',
    readTime: '18 min read',
    category: 'Adventure',
  },
  {
    id: 'marrakech-guide',
    title: 'First Timer\'s Guide to Marrakech: What to Know',
    image: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=500&h=350&fit=crop',
    destination: 'Marrakech, Morocco',
    author: 'Fatima Zahra',
    readTime: '10 min read',
    category: 'City Guides',
  },
];

const categories = [
  { id: 'All', label: 'All Guides', icon: BookOpen },
  { id: 'City Guides', label: 'City Guides', icon: MapPin },
  { id: 'Food Guides', label: 'Food Guides', icon: UtensilsCrossed },
  { id: 'Adventure', label: 'Adventure', icon: Mountain },
  { id: 'Budget Travel', label: 'Budget Travel', icon: Wallet },
  { id: 'Luxury', label: 'Luxury', icon: Sparkles },
];

/* ---------- page ---------- */

export default function GuidesPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? guides
    : guides.filter((g) => g.category === activeCategory);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Travel Guides</h1>
          <p className="text-slate-500 dark:text-slate-400">Expert tips, itineraries, and inspiration for your next adventure</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Featured guide hero */}
        <Link href={`/guides/${featuredGuide.id}`} className="group block mb-8">
          <Card className="overflow-hidden hover:shadow-xl transition-shadow">
            <div className="relative h-80 md:h-96 overflow-hidden">
              <Image src={featuredGuide.image} alt={featuredGuide.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute top-4 left-4">
                <Badge className="bg-sky-600 text-white">{featuredGuide.category}</Badge>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                  <Badge variant="outline" className="border-white/30 text-white" size="sm">Featured</Badge>
                  <span>{featuredGuide.destination}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white group-hover:text-sky-300 transition-colors">
                  {featuredGuide.title}
                </h2>
                <p className="mt-2 text-sm text-white/80 max-w-2xl line-clamp-2">
                  {featuredGuide.excerpt}
                </p>
                <div className="mt-4 flex items-center gap-4 text-sm text-white/70">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {featuredGuide.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {featuredGuide.readTime}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Link>

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

        {/* Guides grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((guide) => (
            <Link key={guide.id} href={`/guides/${guide.id}`} className="group">
              <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
                  <Image src={guide.image} alt={guide.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                  <Badge className="absolute top-3 left-3" variant="default" size="sm">
                    {guide.category}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                    <MapPin className="h-3 w-3" />
                    {guide.destination}
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors line-clamp-2">
                    {guide.title}
                  </h3>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {guide.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {guide.readTime}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-lg font-medium text-slate-900 dark:text-white">No guides found in this category</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try selecting a different category</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
