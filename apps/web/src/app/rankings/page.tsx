'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Crown,
  Globe,
  Building2,
  MapPin,
  Trophy,
  ArrowRight,
  Palmtree,
  Waves,
  Mountain,
  Sparkles,
  Home,
  Tent,
  Star,
  TrendingUp,
  ChevronRight,
  Shield,
  BadgeCheck,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/* ── Ranking Scopes ────────────────────────────── */

const rankingScopes = [
  {
    id: 'world',
    title: 'World Rankings',
    subtitle: 'The True Luxury 100 across every continent',
    icon: Globe,
    href: '/rankings/worldwide/all_luxury',
    gradient: 'from-brand-600 to-brand-800',
    image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=85',
    count: 100,
  },
  {
    id: 'city',
    title: 'City Rankings',
    subtitle: 'Top luxury stays ranked by destination',
    icon: Building2,
    href: '/rankings/city/paris',
    gradient: 'from-slate-700 to-slate-900',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=85',
    count: 42,
  },
  {
    id: 'category',
    title: 'Category Rankings',
    subtitle: 'Beach resorts, safari lodges, wellness retreats',
    icon: Trophy,
    href: '/rankings/category/beach_resorts',
    gradient: 'from-amber-700 to-amber-900',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=85',
    count: 8,
  },
];

/* ── Cities with Ranked Properties ─────────────────── */

const rankedCities = [
  { id: 'paris', name: 'Paris', country: 'France', count: 47, topScore: 97.2, image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=85' },
  { id: 'london', name: 'London', country: 'United Kingdom', count: 42, topScore: 96.8, image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=85' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', count: 35, topScore: 97.2, image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=85' },
  { id: 'new-york', name: 'New York', country: 'United States', count: 38, topScore: 95.4, image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&q=85' },
  { id: 'dubai', name: 'Dubai', country: 'UAE', count: 31, topScore: 94.9, image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=85' },
  { id: 'rome', name: 'Rome', country: 'Italy', count: 28, topScore: 95.1, image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&q=85' },
  { id: 'singapore', name: 'Singapore', country: 'Singapore', count: 24, topScore: 94.3, image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&q=85' },
  { id: 'marrakech', name: 'Marrakech', country: 'Morocco', count: 15, topScore: 94.6, image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=400&q=85' },
  { id: 'lake-como', name: 'Lake Como', country: 'Italy', count: 18, topScore: 96.1, image: 'https://images.unsplash.com/photo-1537799943037-f5da89a65689?w=400&q=85' },
  { id: 'hong-kong', name: 'Hong Kong', country: 'China', count: 22, topScore: 95.0, image: 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=400&q=85' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', count: 19, topScore: 93.7, image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&q=85' },
  { id: 'bangkok', name: 'Bangkok', country: 'Thailand', count: 20, topScore: 93.5, image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&q=85' },
];

/* ── Category Shortcuts ────────────────────────── */

const categories = [
  { id: 'city_hotels', label: 'City Hotels', icon: Building2, count: 156, description: 'Urban luxury at its finest' },
  { id: 'beach_resorts', label: 'Beach Resorts', icon: Palmtree, count: 89, description: 'Sand, sea, and sophistication' },
  { id: 'wellness_retreats', label: 'Wellness Retreats', icon: Sparkles, count: 47, description: 'Restoration beyond the spa' },
  { id: 'safari_lodges', label: 'Safari Lodges', icon: Tent, count: 34, description: 'Wild luxury, no compromise' },
  { id: 'villas', label: 'Villas & Estates', icon: Home, count: 72, description: 'Privacy at the highest level' },
  { id: 'mountain_retreats', label: 'Mountain Retreats', icon: Mountain, count: 41, description: 'Elevation meets elegance' },
  { id: 'overwater', label: 'Overwater Bungalows', icon: Waves, count: 28, description: 'Suspended above paradise' },
  { id: 'heritage', label: 'Heritage & Palaces', icon: Crown, count: 53, description: 'History you can sleep in' },
];

/* ── Featured: True Luxury 100 Preview ──────────── */

const trueLuxury100Preview = [
  {
    rank: 1,
    name: 'Cheval Blanc Paris',
    location: 'Paris, France',
    score: 98.4,
    truthLabel: 'Flawless modern grand luxury',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=85',
    movement: 0,
  },
  {
    rank: 2,
    name: 'Aman Tokyo',
    location: 'Tokyo, Japan',
    score: 97.2,
    truthLabel: 'Design-led luxury',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&q=85',
    movement: 1,
  },
  {
    rank: 3,
    name: 'The Brando',
    location: 'Tetiaroa, French Polynesia',
    score: 97.0,
    truthLabel: 'Eco-luxury without compromise',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=85',
    movement: 2,
  },
  {
    rank: 4,
    name: 'Claridge\'s',
    location: 'London, United Kingdom',
    score: 96.8,
    truthLabel: 'Timeless British grandeur',
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&q=85',
    movement: -1,
  },
  {
    rank: 5,
    name: 'Singita Grumeti',
    location: 'Serengeti, Tanzania',
    score: 96.5,
    truthLabel: 'Safari elegance',
    image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&q=85',
    movement: 0,
  },
];

/* ── Trust Markers ─────────────────────────────── */

const trustMarkers = [
  { icon: Shield, label: 'Qualified, not self-declared', value: '573 properties qualified' },
  { icon: BadgeCheck, label: 'Verified reviews only', value: '284,000+ verified stays' },
  { icon: Eye, label: 'Truth labels on every property', value: 'Honest, not promotional' },
  { icon: Trophy, label: 'Rankings update monthly', value: 'Live scoring engine' },
];

/* ── Page ──────────────────────────────────────── */

export default function RankingsPage() {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  return (
    <div className="min-h-screen">
      {/* ═══════════════════════════════════════════════
          HERO
          ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920&q=90')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/80" />
        <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 200px rgba(0,0,0,0.3)' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-5 py-2 mb-8">
              <Crown className="h-4 w-4 text-brand-300" />
              <span className="text-sm tracking-wide text-white/90">The Trusted Luxury Standard</span>
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
              The Luxury{' '}
              <span className="bg-gradient-to-r from-brand-200 via-brand-300 to-brand-200 bg-clip-text text-transparent">
                Rankings
              </span>
            </h1>
            <div className="luxury-divider mb-6" />
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed tracking-wide mb-4">
              Qualified. Scored. Ranked.
            </p>
            <p className="text-white/50 max-w-xl mx-auto">
              Every property passes our qualification engine, is scored across 10 luxury dimensions,
              and ranked against its true peer set. No pay-to-play. No self-declared stars.
            </p>
          </motion.div>

          {/* Trust markers row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto"
          >
            {trustMarkers.map((marker) => {
              const Icon = marker.icon;
              return (
                <div key={marker.label} className="flex flex-col items-center gap-2 px-3 py-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                  <Icon className="h-5 w-5 text-brand-300" />
                  <span className="text-xs text-white/70 text-center leading-tight">{marker.label}</span>
                  <span className="text-[10px] text-brand-300/80 font-medium">{marker.value}</span>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          RANKING SCOPES GRID
          ═══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 -mt-16 relative z-20 mb-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {rankingScopes.map((scope) => {
            const Icon = scope.icon;
            return (
              <motion.div key={scope.id} variants={fadeUp}>
                <Link href={scope.href} className="group block">
                  <div className="relative rounded-2xl overflow-hidden aspect-[16/10] shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                    <Image
                      src={scope.image}
                      alt={scope.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized
                    />
                    <div className={cn('absolute inset-0 bg-gradient-to-t', scope.gradient, 'opacity-80')} />
                    <div className="absolute inset-0 flex flex-col justify-end p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <h3 className="text-xl font-heading font-bold text-white tracking-wide">{scope.title}</h3>
                      <p className="text-sm text-white/70 mt-1">{scope.subtitle}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-brand-300 font-medium">{scope.count} {scope.id === 'category' ? 'categories' : 'properties'}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-white/50 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          FEATURED: THE TRUE LUXURY 100
          ═══════════════════════════════════════════════ */}
      <section className="bg-[#F5F3EF] dark:bg-[#0F0F0F]/50">
        <div className="max-w-6xl mx-auto px-4 py-24">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-14"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 font-medium mb-3">Featured</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-4">
              The True Luxury 100
            </h2>
            <div className="luxury-divider mb-4" />
            <p className="text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 max-w-lg mx-auto">
              The definitive ranking of the world&apos;s finest luxury stays, updated monthly
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="space-y-4"
          >
            {trueLuxury100Preview.map((property) => (
              <motion.div key={property.rank} variants={fadeUp}>
                <Link
                  href={`/rankings/worldwide/all_luxury`}
                  className="group flex items-center bg-white dark:bg-[#1A1A1A] rounded-2xl overflow-hidden border border-[#E8E4DC] dark:border-white/10 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  {/* Rank */}
                  <div className="w-20 shrink-0 flex flex-col items-center justify-center py-6 bg-gradient-to-b from-brand-50 to-brand-100/50 dark:from-brand-900/20 dark:to-brand-900/10">
                    <span className="text-3xl font-bold text-brand-600 dark:text-brand-400 font-heading">
                      {property.rank}
                    </span>
                    {property.movement !== 0 && (
                      <span className={cn(
                        'text-xs font-medium flex items-center gap-0.5 mt-1',
                        property.movement > 0 ? 'text-emerald-600' : 'text-red-500',
                      )}>
                        {property.movement > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingUp className="h-3 w-3 rotate-180" />
                        )}
                        {Math.abs(property.movement)}
                      </span>
                    )}
                    {property.movement === 0 && (
                      <span className="text-[10px] text-[#1A1A1A]/30 dark:text-[#F5F3EF]/30 mt-1">steady</span>
                    )}
                  </div>

                  {/* Image */}
                  <div className="relative w-32 h-24 shrink-0">
                    <Image
                      src={property.image}
                      alt={property.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="128px"
                      unoptimized
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 px-6 py-4 min-w-0">
                    <h3 className="font-heading text-lg font-bold text-[#1A1A1A] dark:text-[#F5F3EF] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                      {property.name}
                    </h3>
                    <p className="text-sm text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {property.location}
                    </p>
                    <div className="inline-flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-xs font-medium px-2.5 py-1 rounded-full mt-2">
                      <BadgeCheck className="h-3 w-3" />
                      {property.truthLabel}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="pr-8 text-right shrink-0">
                    <div className="text-3xl font-bold text-brand-600 dark:text-brand-400 font-heading">{property.score}</div>
                    <div className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40">Luxury Score</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <Link href="/rankings/worldwide/all_luxury">
              <Button className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-full text-sm font-medium tracking-wide">
                View the Full True Luxury 100
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CITY RANKINGS
          ═══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-14"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 font-medium mb-3">By Destination</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-4">
            Cities with Ranked Luxury
          </h2>
          <div className="luxury-divider mb-4" />
          <p className="text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 max-w-lg mx-auto">
            Explore the top qualified luxury stays in every destination we cover
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {rankedCities.map((city) => (
            <motion.div key={city.id} variants={fadeUp}>
              <Link
                href={`/rankings/city/${city.id}`}
                className="group relative block rounded-2xl overflow-hidden aspect-[4/3] shadow-sm hover:shadow-lg transition-all duration-500"
                onMouseEnter={() => setHoveredCity(city.id)}
                onMouseLeave={() => setHoveredCity(null)}
              >
                <Image
                  src={city.image}
                  alt={city.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-lg font-bold text-white font-heading tracking-wide">{city.name}</h3>
                  <p className="text-xs text-white/60">{city.country}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-brand-300 font-medium">{city.count} ranked</span>
                    <span className="text-[10px] text-white/40">Top: {city.topScore}</span>
                  </div>
                </div>
                {/* Hover overlay with score */}
                <motion.div
                  initial={false}
                  animate={{ opacity: hoveredCity === city.id ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-3 right-3 bg-brand-600/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-lg"
                >
                  {city.topScore} top score
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link
            href="/rankings/worldwide/all_luxury"
            className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-medium hover:text-brand-500 transition-colors"
          >
            View all ranked destinations
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          CATEGORY RANKINGS
          ═══════════════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=90')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-black/65" />

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-14"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-brand-300 font-medium mb-3">Categories</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4 tracking-wide">
              Ranked by Travel Style
            </h2>
            <div className="luxury-divider mb-4" />
            <p className="text-white/50 max-w-lg mx-auto">
              Find the top-ranked luxury stays for exactly how you want to travel
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <motion.div key={cat.id} variants={fadeUp}>
                  <Link
                    href={`/rankings/category/${cat.id}`}
                    className="group flex flex-col items-center text-center p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-brand-500/30 transition-all duration-300">
                      <Icon className="h-7 w-7 text-brand-300" />
                    </div>
                    <h3 className="font-heading text-base font-bold text-white tracking-wide mb-1">{cat.label}</h3>
                    <p className="text-xs text-white/50 mb-3 leading-relaxed">{cat.description}</p>
                    <Badge className="bg-white/10 text-brand-300 border-0 text-[10px]">
                      {cat.count} ranked
                    </Badge>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          METHODOLOGY TEASER
          ═══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-14"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 font-medium mb-3">Methodology</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-4">
            How We Rank
          </h2>
          <div className="luxury-divider mb-4" />
          <p className="text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 max-w-2xl mx-auto">
            A three-stage process that ensures every ranking is earned, not bought
          </p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              step: '01',
              title: 'Qualification',
              description: 'Properties must pass our luxury qualification engine. We assess facility quality, service infrastructure, and guest experience indicators before a property can even enter the ranking pool.',
              detail: 'Only 12% of properties that apply are qualified',
            },
            {
              step: '02',
              title: 'Scoring',
              description: 'Qualified properties are scored across 10 luxury dimensions by combining verified guest reviews, professional inspector reports, and real-time signals into a single Luxury Standard Score.',
              detail: 'Weighted across 10 dimensions, 47 sub-signals',
            },
            {
              step: '03',
              title: 'Ranking',
              description: 'Properties are ranked against their true peer set: by geography, category, and price tier. Movement is tracked monthly. Every rank includes a "why this ranked here" explanation.',
              detail: 'Updated monthly with full transparency',
            },
          ].map((item) => (
            <motion.div
              key={item.step}
              variants={fadeUp}
              className="relative p-8 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-[#E8E4DC] dark:border-white/10 shadow-sm hover:shadow-lg transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="text-5xl font-heading font-bold text-brand-100 dark:text-brand-900/30 mb-4">{item.step}</div>
              <h3 className="font-heading text-xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-3">{item.title}</h3>
              <p className="text-sm text-[#1A1A1A]/60 dark:text-[#F5F3EF]/60 leading-relaxed mb-4">{item.description}</p>
              <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">{item.detail}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Bottom spacer */}
      <div className="h-12" />
    </div>
  );
}
