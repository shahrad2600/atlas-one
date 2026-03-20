'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  MapPin,
  Trophy,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  Shield,
  BadgeCheck,
  Eye,
  Heart,
  Clock,
  Star,
  Filter,
  Calendar,
  CheckCircle2,
  Minus,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

/* ── Geography display names ────────────────────── */

const geographyNames: Record<string, { title: string; breadcrumb: string }> = {
  all_luxury: { title: 'Worldwide', breadcrumb: 'World' },
  paris: { title: 'Paris, France', breadcrumb: 'Paris' },
  london: { title: 'London, United Kingdom', breadcrumb: 'London' },
  tokyo: { title: 'Tokyo, Japan', breadcrumb: 'Tokyo' },
  'new-york': { title: 'New York, United States', breadcrumb: 'New York' },
  dubai: { title: 'Dubai, UAE', breadcrumb: 'Dubai' },
  rome: { title: 'Rome, Italy', breadcrumb: 'Rome' },
  singapore: { title: 'Singapore', breadcrumb: 'Singapore' },
  marrakech: { title: 'Marrakech, Morocco', breadcrumb: 'Marrakech' },
  'lake-como': { title: 'Lake Como, Italy', breadcrumb: 'Lake Como' },
  'hong-kong': { title: 'Hong Kong, China', breadcrumb: 'Hong Kong' },
  sydney: { title: 'Sydney, Australia', breadcrumb: 'Sydney' },
  bangkok: { title: 'Bangkok, Thailand', breadcrumb: 'Bangkok' },
  beach_resorts: { title: 'Beach Resorts', breadcrumb: 'Beach Resorts' },
  city_hotels: { title: 'City Hotels', breadcrumb: 'City Hotels' },
  wellness_retreats: { title: 'Wellness Retreats', breadcrumb: 'Wellness Retreats' },
  safari_lodges: { title: 'Safari Lodges', breadcrumb: 'Safari Lodges' },
  villas: { title: 'Villas & Estates', breadcrumb: 'Villas' },
  mountain_retreats: { title: 'Mountain Retreats', breadcrumb: 'Mountain Retreats' },
  overwater: { title: 'Overwater Bungalows', breadcrumb: 'Overwater' },
  heritage: { title: 'Heritage & Palaces', breadcrumb: 'Heritage' },
};

const scopeLabels: Record<string, string> = {
  worldwide: 'World',
  city: 'City',
  category: 'Category',
};

/* ── Filter Tabs ────────────────────────────────── */

const filterTabs = [
  { id: 'all', label: 'All Luxury' },
  { id: 'city_hotels', label: 'City Hotels' },
  { id: 'beach_resorts', label: 'Beach Resorts' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'family', label: 'Family' },
  { id: 'villas', label: 'Villas' },
  { id: 'safari', label: 'Safari' },
  { id: 'heritage', label: 'Heritage' },
];

const timeHorizons = [
  { id: 'live', label: 'Live' },
  { id: '12month', label: '12-Month' },
  { id: '3year', label: '3-Year' },
];

/* ── Ranked Properties (mock data) ──────────────── */

const rankedProperties = [
  {
    id: 'cheval-blanc-paris',
    rank: 1,
    previousRank: 1,
    name: 'Cheval Blanc Paris',
    location: 'Paris, France',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=85',
    luxuryScore: 98.4,
    truthLabel: 'Flawless modern grand luxury',
    bestFor: ['celebration', 'design travelers', 'couples'],
    badges: ['Inspector Verified', 'Consistency Leader', 'Best Service 2026'],
    pricePerNight: 1850,
    scores: {
      'Service Intelligence': 9.9,
      'Privacy & Calm': 9.7,
      'Design & Sense of Place': 9.9,
      'Dining Seriousness': 9.8,
      'Sleep Quality': 9.8,
    },
    whyRanked: 'Cheval Blanc Paris leads the world ranking because it delivers flawless execution across every luxury dimension. The LVMH property on Quai du Louvre combines a peerless location with Arnaud Donckele\'s three-Michelin-star dining, utterly private suite layouts, and service that anticipates without intruding. Inspector visits over 36 months show zero consistency variance -- a rarity in the luxury space. It scores particularly high on Design & Sense of Place (9.9) and Service Intelligence (9.9), placing it as the property most likely to exceed expectations for even the most discerning traveler.',
    category: 'City Hotel',
  },
  {
    id: 'aman-tokyo',
    rank: 2,
    previousRank: 3,
    name: 'Aman Tokyo',
    location: 'Tokyo, Japan',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=85',
    luxuryScore: 97.2,
    truthLabel: 'Design-led luxury',
    bestFor: ['privacy', 'design travelers', 'solo luxury'],
    badges: ['Inspector Verified', 'Best Design Hotel', 'Aman Devotee Approved'],
    pricePerNight: 1200,
    scores: {
      'Service Intelligence': 9.6,
      'Privacy & Calm': 9.8,
      'Design & Sense of Place': 9.9,
      'Dining Seriousness': 9.1,
      'Sleep Quality': 9.7,
    },
    whyRanked: 'Aman Tokyo rises from #3 to #2 after consistent excellence across the trailing 12 months. Kerry Hill\'s minimalist masterpiece atop Otemachi Tower offers the city\'s most serene luxury experience. The 84-room property maintains an extraordinary staff-to-guest ratio. Privacy scores lead the category (9.8), and the onsen-inspired spa is arguably the best urban wellness facility in Asia. The only dimension holding it from the top spot is Dining Seriousness (9.1) -- excellent but not destination-level.',
    category: 'City Hotel',
  },
  {
    id: 'the-brando',
    rank: 3,
    previousRank: 5,
    name: 'The Brando',
    location: 'Tetiaroa, French Polynesia',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=85',
    luxuryScore: 97.0,
    truthLabel: 'Eco-luxury without compromise',
    bestFor: ['honeymoon', 'eco-luxury', 'total escape'],
    badges: ['Inspector Verified', 'Sustainability Leader', 'Best Island Resort'],
    pricePerNight: 3200,
    scores: {
      'Service Intelligence': 9.5,
      'Privacy & Calm': 9.9,
      'Design & Sense of Place': 9.8,
      'Dining Seriousness': 9.2,
      'Sleep Quality': 9.6,
    },
    whyRanked: 'The Brando climbs two spots with its unmatched combination of absolute privacy and environmental commitment. The 35-villa resort on Marlon Brando\'s private atoll achieves the highest Privacy & Calm score in our entire database (9.9). It operates on 100% renewable energy while delivering a completely uncompromised luxury experience. The property excels for honeymoons and total escape seekers, though its remote location and pricing make it a once-in-a-lifetime stay for most travelers.',
    category: 'Beach Resort',
  },
  {
    id: 'claridges',
    rank: 4,
    previousRank: 2,
    name: 'Claridge\'s',
    location: 'London, United Kingdom',
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&q=85',
    luxuryScore: 96.8,
    truthLabel: 'Timeless British grandeur',
    bestFor: ['tradition', 'afternoon tea', 'London base'],
    badges: ['Inspector Verified', 'Heritage Excellence', '100-Year Legacy'],
    pricePerNight: 980,
    scores: {
      'Service Intelligence': 9.8,
      'Privacy & Calm': 9.3,
      'Design & Sense of Place': 9.7,
      'Dining Seriousness': 9.5,
      'Sleep Quality': 9.4,
    },
    whyRanked: 'Claridge\'s drops from #2 to #4 not due to declining quality but because competitors have sharpened execution. The Art Deco landmark in Mayfair remains London\'s definitive luxury hotel, with Service Intelligence (9.8) that reflects over a century of hosting royalty, heads of state, and discerning travelers. Daniel Humm\'s restaurant and the legendary afternoon tea keep Dining Seriousness at 9.5. A slight dip in Sleep Quality scores from rooms facing Davies Street accounts for the movement.',
    category: 'City Hotel',
  },
  {
    id: 'singita-grumeti',
    rank: 5,
    previousRank: 5,
    name: 'Singita Grumeti',
    location: 'Serengeti, Tanzania',
    image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&q=85',
    luxuryScore: 96.5,
    truthLabel: 'Safari elegance',
    bestFor: ['romance', 'adventure', 'once-in-a-lifetime'],
    badges: ['Inspector Verified', 'Best Safari Lodge', 'Conservation Partner'],
    pricePerNight: 2850,
    scores: {
      'Service Intelligence': 9.8,
      'Privacy & Calm': 9.5,
      'Design & Sense of Place': 9.3,
      'Dining Seriousness': 9.4,
      'Sleep Quality': 9.0,
    },
    whyRanked: 'Singita Grumeti holds steady at #5, continuing to define what safari luxury means globally. The 350,000-acre concession offers exclusive game viewing that no other property can replicate. Service Intelligence (9.8) ties for the highest in our rankings, with guides who double as conservation scientists and sommeliers who pair wines to the landscape. Sleep Quality (9.0) reflects the reality of wilderness accommodation -- even luxury bush lodges can\'t match urban soundproofing.',
    category: 'Safari Lodge',
  },
  {
    id: 'four-seasons-bora-bora',
    rank: 6,
    previousRank: 8,
    name: 'Four Seasons Bora Bora',
    location: 'Bora Bora, French Polynesia',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=85',
    luxuryScore: 96.1,
    truthLabel: 'Barefoot luxury',
    bestFor: ['honeymoon', 'wellness', 'overwater'],
    badges: ['Inspector Verified', 'Best Overwater', 'Exceptional Sleep'],
    pricePerNight: 2100,
    scores: {
      'Service Intelligence': 9.4,
      'Privacy & Calm': 9.6,
      'Design & Sense of Place': 9.1,
      'Dining Seriousness': 8.9,
      'Sleep Quality': 9.8,
    },
    whyRanked: 'Four Seasons Bora Bora rises two spots, driven by recent renovations to its overwater bungalows and a new wellness program. The property claims our second-highest Sleep Quality score (9.8), with bungalows engineered for complete darkness and ocean sounds. Privacy & Calm (9.6) benefits from the lagoon-side isolation. The one area for improvement remains Dining Seriousness (8.9) -- good but not remarkable for a property at this price point.',
    category: 'Beach Resort',
  },
  {
    id: 'royal-mansour',
    rank: 7,
    previousRank: 7,
    name: 'Royal Mansour Marrakech',
    location: 'Marrakech, Morocco',
    image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=600&q=85',
    luxuryScore: 95.8,
    truthLabel: 'Heritage grand luxury',
    bestFor: ['couples', 'celebration', 'cultural immersion'],
    badges: ['Inspector Verified', 'Best Service in City', 'Top Suite Program'],
    pricePerNight: 1800,
    scores: {
      'Service Intelligence': 9.9,
      'Privacy & Calm': 9.2,
      'Design & Sense of Place': 9.7,
      'Dining Seriousness': 9.3,
      'Sleep Quality': 9.4,
    },
    whyRanked: 'Royal Mansour holds at #7 with the joint-highest Service Intelligence score in our database (9.9). The King of Morocco\'s personal vision is executed through 53 private riads, each a self-contained palace with private plunge pool and rooftop terrace. The underground tunnel system allows staff to service riads completely unseen. Design & Sense of Place (9.7) celebrates centuries of Moroccan craftsmanship. A brilliant choice for travelers seeking cultural authenticity at the highest luxury level.',
    category: 'Heritage Hotel',
  },
  {
    id: 'rosewood-hong-kong',
    rank: 8,
    previousRank: 10,
    name: 'Rosewood Hong Kong',
    location: 'Hong Kong, China',
    image: 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=600&q=85',
    luxuryScore: 95.4,
    truthLabel: 'Modern Asian grandeur',
    bestFor: ['business luxury', 'foodie travelers', 'city views'],
    badges: ['Inspector Verified', 'Best New Entry 2024', 'Dining Destination'],
    pricePerNight: 750,
    scores: {
      'Service Intelligence': 9.5,
      'Privacy & Calm': 9.1,
      'Design & Sense of Place': 9.6,
      'Dining Seriousness': 9.7,
      'Sleep Quality': 9.3,
    },
    whyRanked: 'Rosewood Hong Kong climbs two spots on the strength of its extraordinary dining program. With seven restaurants and bars including The Butterfly Room and Holt\'s Cafe, the Dining Seriousness score (9.7) is among the highest globally. Tony Chi\'s interiors channel a manor house sensibility that feels distinctly Hong Kong without resorting to cliches. The property offers the best value-to-luxury ratio in the top 10 at $750/night, making it the most accessible entry on this list.',
    category: 'City Hotel',
  },
  {
    id: 'nihi-sumba',
    rank: 9,
    previousRank: 9,
    name: 'Nihi Sumba',
    location: 'Sumba, Indonesia',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=85',
    luxuryScore: 95.1,
    truthLabel: 'Barefoot adventure luxury',
    bestFor: ['adventure', 'surfing', 'eco-luxury'],
    badges: ['Inspector Verified', 'Adventure Luxury Leader', 'Community Impact'],
    pricePerNight: 1450,
    scores: {
      'Service Intelligence': 9.3,
      'Privacy & Calm': 9.7,
      'Design & Sense of Place': 9.6,
      'Dining Seriousness': 9.0,
      'Sleep Quality': 9.2,
    },
    whyRanked: 'Nihi Sumba holds steady at #9 as the world\'s definitive adventure-luxury destination. The converted surf camp on a remote Indonesian island pairs world-class waves with villas that feel discovered rather than designed. Privacy & Calm (9.7) benefits from the property\'s extreme remoteness. The Sumba Foundation partnership gives the resort genuine community impact. Best suited for travelers who want luxury without the formality -- flip-flops over Ferragamo.',
    category: 'Beach Resort',
  },
  {
    id: 'mandarin-oriental-bangkok',
    rank: 10,
    previousRank: 12,
    name: 'Mandarin Oriental Bangkok',
    location: 'Bangkok, Thailand',
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&q=85',
    luxuryScore: 94.9,
    truthLabel: 'The original river luxury',
    bestFor: ['tradition', 'spa lovers', 'literary history'],
    badges: ['Inspector Verified', 'Heritage Excellence', 'Best Spa in Asia'],
    pricePerNight: 520,
    scores: {
      'Service Intelligence': 9.7,
      'Privacy & Calm': 9.0,
      'Design & Sense of Place': 9.5,
      'Dining Seriousness': 9.3,
      'Sleep Quality': 9.1,
    },
    whyRanked: 'The Mandarin Oriental Bangkok rises two places, continuing a 148-year legacy as Southeast Asia\'s most storied hotel. Service Intelligence (9.7) reflects staff who have been with the hotel for decades -- a rarity in modern hospitality. The Authors\' Wing rooms, where Somerset Maugham and Joseph Conrad once stayed, score the highest Design & Sense of Place in Thailand (9.5). At $520/night, it offers extraordinary value against its peer set and remains the best spa hotel in Asia.',
    category: 'City Hotel',
  },
];

/* ── Page Component ─────────────────────────────── */

export default function RankingScopePage() {
  const params = useParams();
  const scope = params.scope as string;
  const geography = params.geography as string;

  const [activeFilter, setActiveFilter] = useState('all');
  const [activeHorizon, setActiveHorizon] = useState('live');
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  const geo = geographyNames[geography] || { title: geography.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), breadcrumb: geography.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) };
  const scopeLabel = scopeLabels[scope] || scope;

  const isWorldwide = scope === 'worldwide';
  const isCity = scope === 'city';
  const isCategory = scope === 'category';

  const pageTitle = isWorldwide
    ? 'The True Luxury 100'
    : isCity
    ? `Top Luxury Hotels in ${geo.breadcrumb}`
    : `Top Luxury ${geo.breadcrumb}`;

  const pageSubtitle = isWorldwide
    ? 'The definitive ranking of the world\'s finest luxury stays'
    : isCity
    ? `${rankedProperties.length} qualified luxury stays, ranked and scored`
    : `The world\'s best ${geo.breadcrumb.toLowerCase()}, ranked across 10 dimensions`;

  const toggleExpanded = (id: string) => {
    setExpandedProperty(expandedProperty === id ? null : id);
  };

  const getMovement = (current: number, previous: number) => {
    const diff = previous - current;
    if (diff > 0) return { direction: 'up' as const, value: diff };
    if (diff < 0) return { direction: 'down' as const, value: Math.abs(diff) };
    return { direction: 'steady' as const, value: 0 };
  };

  return (
    <div className="min-h-screen">
      {/* ═══════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920&q=90')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/80" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 pt-12 pb-20">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-8">
            <Link href="/rankings" className="hover:text-white transition-colors">Rankings</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white/80">{scopeLabel}</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white">{geo.breadcrumb}</span>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-4 py-1.5 mb-6">
              <Crown className="h-3.5 w-3.5 text-brand-300" />
              <span className="text-xs tracking-wide text-white/80">Luxury Rankings</span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4 leading-[1.15]">
              {pageTitle}
            </h1>
            <p className="text-lg text-white/60 max-w-2xl">{pageSubtitle}</p>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-6 mt-8">
              <div className="flex items-center gap-2 text-white/70">
                <Trophy className="h-4 w-4 text-brand-300" />
                <span className="text-sm">{rankedProperties.length} properties ranked</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Clock className="h-4 w-4 text-brand-300" />
                <span className="text-sm">Updated March 2026</span>
              </div>
              <div className="flex items-center gap-2 text-white/70">
                <Shield className="h-4 w-4 text-brand-300" />
                <span className="text-sm">All Inspector Verified</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FILTERS & CONTROLS
          ═══════════════════════════════════════════════ */}
      <div className="sticky top-16 z-30 bg-white dark:bg-[#1A1A1A] border-b border-[#E8E4DC] dark:border-white/10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between gap-4 py-3">
            {/* Filter tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              <Filter className="h-4 w-4 text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40 shrink-0 mr-2" />
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200',
                    activeFilter === tab.id
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-[#1A1A1A]/60 dark:text-[#F5F3EF]/60 hover:bg-[#F5F3EF] dark:hover:bg-white/5',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Time horizon */}
            <div className="hidden md:flex items-center gap-1 shrink-0 bg-[#F5F3EF] dark:bg-white/5 rounded-full p-0.5">
              <Calendar className="h-3.5 w-3.5 text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40 ml-2 mr-1" />
              {timeHorizons.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setActiveHorizon(h.id)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-all duration-200',
                    activeHorizon === h.id
                      ? 'bg-white dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-[#F5F3EF] shadow-sm'
                      : 'text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50',
                  )}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          RANKED PROPERTIES LIST
          ═══════════════════════════════════════════════ */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >
          {rankedProperties.map((property) => {
            const movement = getMovement(property.rank, property.previousRank);
            const isExpanded = expandedProperty === property.id;

            return (
              <motion.div key={property.id} variants={fadeUp}>
                <div
                  className={cn(
                    'bg-white dark:bg-[#1A1A1A] rounded-2xl border transition-all duration-300',
                    isExpanded
                      ? 'border-brand-300 dark:border-brand-700 shadow-lg ring-1 ring-brand-200/50 dark:ring-brand-800/50'
                      : 'border-[#E8E4DC] dark:border-white/10 shadow-sm hover:shadow-md',
                  )}
                >
                  {/* Main row */}
                  <div className="flex items-stretch">
                    {/* Rank column */}
                    <div className="w-20 sm:w-24 shrink-0 flex flex-col items-center justify-center py-6 border-r border-[#E8E4DC] dark:border-white/10 bg-gradient-to-b from-brand-50/50 to-white dark:from-brand-900/10 dark:to-[#1A1A1A]">
                      <span className="text-3xl sm:text-4xl font-bold text-brand-600 dark:text-brand-400 font-heading leading-none">
                        #{property.rank}
                      </span>
                      <div className="mt-2 flex items-center gap-0.5">
                        {movement.direction === 'up' && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="h-3 w-3" />
                            {movement.value}
                          </span>
                        )}
                        {movement.direction === 'down' && (
                          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500 dark:text-red-400">
                            <TrendingDown className="h-3 w-3" />
                            {movement.value}
                          </span>
                        )}
                        {movement.direction === 'steady' && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-[#1A1A1A]/30 dark:text-[#F5F3EF]/30">
                            <Minus className="h-3 w-3" />
                            steady
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Property image */}
                    <div className="relative w-36 sm:w-48 shrink-0 hidden sm:block">
                      <Image
                        src={property.image}
                        alt={property.name}
                        fill
                        className="object-cover"
                        sizes="200px"
                        unoptimized
                      />
                    </div>

                    {/* Property content */}
                    <div className="flex-1 min-w-0 p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link
                            href={`/hotels/${property.id}`}
                            className="font-heading text-lg sm:text-xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] hover:text-brand-600 dark:hover:text-brand-400 transition-colors truncate block"
                          >
                            {property.name}
                          </Link>
                          <p className="text-sm text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {property.location}
                          </p>
                        </div>

                        {/* Luxury score */}
                        <div className="text-right shrink-0">
                          <div className="text-3xl sm:text-4xl font-bold text-brand-600 dark:text-brand-400 font-heading leading-none">
                            {property.luxuryScore}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40 mt-1">
                            Luxury Score
                          </div>
                        </div>
                      </div>

                      {/* Truth label */}
                      <div className="inline-flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-xs font-medium px-2.5 py-1 rounded-full mt-3">
                        <CheckCircle2 className="h-3 w-3" />
                        {property.truthLabel}
                      </div>

                      {/* Score bars */}
                      <div className="grid grid-cols-5 gap-3 mt-4">
                        {Object.entries(property.scores).map(([key, val]) => (
                          <div key={key} className="text-center">
                            <div className="text-sm font-bold text-[#1A1A1A] dark:text-[#F5F3EF]">{val}</div>
                            <div className="h-1.5 rounded-full bg-[#E8E4DC] dark:bg-white/10 mt-1">
                              <motion.div
                                className="h-full rounded-full bg-brand-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${(val / 10) * 100}%` }}
                                transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                              />
                            </div>
                            <div className="text-[8px] sm:text-[9px] text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40 mt-1 leading-tight">{key}</div>
                          </div>
                        ))}
                      </div>

                      {/* Badges & best-for */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-4">
                        {property.badges.map((badge) => (
                          <span
                            key={badge}
                            className="inline-flex items-center gap-1 text-[10px] font-medium bg-[#F5F3EF] dark:bg-white/5 text-[#1A1A1A]/60 dark:text-[#F5F3EF]/60 px-2 py-0.5 rounded-full"
                          >
                            <BadgeCheck className="h-2.5 w-2.5" />
                            {badge}
                          </span>
                        ))}
                        <span className="text-[10px] text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40 flex items-center gap-1">
                          <Heart className="h-2.5 w-2.5" />
                          Best for {property.bestFor.join(', ')}
                        </span>
                      </div>

                      {/* Actions row */}
                      <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#E8E4DC]/50 dark:border-white/5">
                        <button
                          onClick={() => toggleExpanded(property.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {isExpanded ? 'Hide explanation' : 'Why this ranked here'}
                          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300', isExpanded && 'rotate-180')} />
                        </button>

                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-[#1A1A1A] dark:text-[#F5F3EF]">
                            ${property.pricePerNight.toLocaleString()}
                            <span className="text-xs font-normal text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40">/night</span>
                          </span>
                          <Link href={`/hotels/${property.id}`}>
                            <Button className="bg-brand-600 hover:bg-brand-700 text-white text-xs px-4 py-2 rounded-full">
                              View Property
                              <ExternalLink className="ml-1.5 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable "Why this ranked here" panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-2 border-t border-[#E8E4DC]/50 dark:border-white/5 mx-4 sm:ml-24">
                          <div className="bg-brand-50/50 dark:bg-brand-900/10 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <Trophy className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                              <h4 className="font-heading text-sm font-bold text-[#1A1A1A] dark:text-[#F5F3EF]">
                                Why #{property.rank}: {property.name}
                              </h4>
                            </div>
                            <p className="text-sm text-[#1A1A1A]/70 dark:text-[#F5F3EF]/70 leading-relaxed">
                              {property.whyRanked}
                            </p>
                            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-brand-200/30 dark:border-brand-800/30">
                              <span className="text-[10px] text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40 flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                Based on 36-month rolling data
                              </span>
                              <span className="text-[10px] text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40 flex items-center gap-1">
                                <BadgeCheck className="h-3 w-3" />
                                Inspector verified Mar 2026
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Load more */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <Button variant="outline" className="rounded-full px-8 py-3 text-sm font-medium border-brand-300 dark:border-brand-700 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20">
            Load More Rankings
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-xs text-[#1A1A1A]/30 dark:text-[#F5F3EF]/30 mt-3">
            Showing 1-{rankedProperties.length} of {isWorldwide ? 100 : rankedProperties.length} ranked properties
          </p>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════
          METHODOLOGY FOOTER
          ═══════════════════════════════════════════════ */}
      <section className="bg-[#F5F3EF] dark:bg-[#0F0F0F]/50 border-t border-[#E8E4DC] dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="font-heading text-2xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-2">About These Rankings</h2>
            <div className="luxury-divider mb-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center px-4">
              <Shield className="h-6 w-6 text-brand-500 mx-auto mb-3" />
              <h3 className="font-heading text-sm font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-2">Qualification First</h3>
              <p className="text-xs text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 leading-relaxed">
                Every property passes our luxury qualification engine before it can rank. Price alone does not define luxury. Only 12% of applicants qualify.
              </p>
            </div>
            <div className="text-center px-4">
              <BadgeCheck className="h-6 w-6 text-brand-500 mx-auto mb-3" />
              <h3 className="font-heading text-sm font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-2">Verified Data Only</h3>
              <p className="text-xs text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 leading-relaxed">
                Rankings combine verified guest reviews, professional inspector reports, and real-time operational signals. No anonymous reviews, no pay-to-play.
              </p>
            </div>
            <div className="text-center px-4">
              <Eye className="h-6 w-6 text-brand-500 mx-auto mb-3" />
              <h3 className="font-heading text-sm font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-2">Full Transparency</h3>
              <p className="text-xs text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 leading-relaxed">
                Every rank includes a &quot;why this ranked here&quot; explanation, truth labels that say what others won&apos;t, and score breakdowns across 10 dimensions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom spacer */}
      <div className="h-12" />
    </div>
  );
}
