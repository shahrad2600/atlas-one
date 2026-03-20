'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  MapPin,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Shield,
  ShieldCheck,
  Eye,
  Award,
  Crown,
  Heart,
  Share2,
  Camera,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Baby,
  Briefcase,
  Compass,
  Sparkles,
  Moon,
  Coffee,
  Utensils,
  TreePine,
  Bed,
  DoorOpen,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Check,
  X,
  Filter,
  Clock,
  CalendarDays,
  Quote,
  FileText,
  Lock,
  Gem,
  Palmtree,
  Binoculars,
  Tent,
  Sunrise,
  Flame,
  Waves,
  Wind,
  Leaf,
  SlidersHorizontal,
  BarChart3,
  Target,
  Zap,
  Globe,
  Building,
  Tag,
  BadgeCheck,
  MessageSquare,
  CircleDot,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ==========================================================================
   MOCK DATA — Singita Grumeti, Serengeti
   ========================================================================== */

const property = {
  id: 'singita-grumeti',
  name: 'Singita Grumeti',
  tagline: 'Where the Serengeti meets uncompromising luxury',
  location: 'Grumeti Reserves, Serengeti, Tanzania',
  country: 'Tanzania',
  city: 'Serengeti',
  heroImage:
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1600&h=900&fit=crop',
  photos: [
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1600&h=900&fit=crop',
    'https://images.unsplash.com/photo-1504197832061-98356e3dcdcf?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1535941339077-2dd1c7963098?w=800&h=600&fit=crop',
  ],
  luxuryStandardScore: 9.6,
  consistencyScore: 9.4,
  luxuryTruthLabel: 'Design-led expedition luxury',
  luxuryTruthDescription:
    'Singita Grumeti delivers a genuinely transformative safari experience where world-class conservation meets meticulous hospitality. The design is extraordinary — each lodge feels both rooted in the landscape and quietly spectacular. Service is anticipatory without being intrusive. The few points lost come from the inherent remoteness affecting connectivity and the limited wellness offering compared to urban luxury benchmarks.',
  trustBadges: [
    { label: 'Inspector Verified', icon: ShieldCheck, date: 'Nov 2025' },
    { label: 'Editor Verified', icon: Eye, date: 'Sep 2025' },
    { label: 'Award Winner 2025', icon: Award, date: '2025' },
    { label: 'Luxury Standard Certified', icon: Crown, date: '2025' },
  ],
  rankings: {
    world: { rank: 7, total: 2500, movement: 2 },
    city: { rank: 1, total: 12, movement: 0 },
    category: { rank: 1, label: 'Safari Lodge', total: 180, movement: 0 },
  },
  whyRankedHere: {
    beatsPeersOn: [
      'Wildlife access and exclusivity of concession',
      'Design integration with natural landscape',
      'Staff-to-guest ratio (3:1)',
      'Conservation impact and community engagement',
      'Wine program and cellar depth',
    ],
    trailsPeersOn: [
      'Wellness facilities (no full spa)',
      'Connectivity (limited WiFi by design)',
      'Accessibility for mobility-impaired guests',
    ],
    bestFor: [
      { label: 'Romance', icon: Heart },
      { label: 'Adventure', icon: Compass },
      { label: 'Celebration', icon: Sparkles },
      { label: 'Honeymoon', icon: Sunrise },
    ],
    notIdealFor: [
      { label: 'Business Travel', icon: Briefcase },
      { label: 'Families with Infants', icon: Baby },
      { label: 'Digital Nomads', icon: Globe },
    ],
  },
  luxuryScores: [
    {
      dimension: 'Service Intelligence',
      score: 9.8,
      description: 'Anticipatory, warm, and deeply personalized',
    },
    {
      dimension: 'Privacy & Calm',
      score: 9.7,
      description: 'Total seclusion in 350,000-acre private concession',
    },
    {
      dimension: 'Design & Sense of Place',
      score: 9.9,
      description: 'Organic architecture that dissolves into the bush',
    },
    {
      dimension: 'Room Quality',
      score: 9.5,
      description: 'Spacious suites with outdoor showers and private decks',
    },
    {
      dimension: 'Dining',
      score: 9.6,
      description: 'Bush dinners, wine cellar with 15,000+ bottles',
    },
    {
      dimension: 'Wellness',
      score: 8.2,
      description: 'In-room treatments available, no dedicated spa facility',
    },
    {
      dimension: 'Consistency',
      score: 9.4,
      description: 'Remarkably uniform across seasons and lodges',
    },
    {
      dimension: 'Value Perception',
      score: 8.8,
      description: 'Premium priced but delivers proportionate experience',
    },
    {
      dimension: 'Sleep Quality',
      score: 9.3,
      description: 'Exceptional bedding, natural sounds, perfect darkness',
    },
    {
      dimension: 'Arrival & Departure',
      score: 9.7,
      description: 'Bush plane landing, champagne welcome on the airstrip',
    },
  ],
  taxonomy: {
    propertyType: 'Safari Lodge',
    categories: [
      'Safari Lodge',
      'Expedition Adventure',
      'Conservation Retreat',
      'Wilderness Camp',
    ],
    bestForTags: [
      'Romance',
      'Adventure',
      'Photography',
      'Wildlife',
      'Celebration',
      'Honeymoon',
    ],
    priceLevel: '$$$$$',
  },
  rooms: [
    {
      name: 'Sasakwa Suite',
      category: 'Best',
      recommendation: 'Top pick for honeymoons',
      size: '140 m\u00B2',
      maxGuests: 2,
      priceRange: '$3,800-$5,200/night',
      highlights: [
        'Private heated pool',
        'Panoramic Serengeti views',
        'Butler service',
        'Outdoor bathtub',
        'Private vehicle and guide',
      ],
      inspectorNote:
        'The cottage suites at Sasakwa are the crown jewels. Request Suite 5 for the most dramatic kopje views at sunrise.',
    },
    {
      name: 'Sabora Tented Suite',
      category: 'Recommended',
      recommendation: 'Best for immersive bush experience',
      size: '100 m\u00B2',
      maxGuests: 2,
      priceRange: '$2,400-$3,600/night',
      highlights: [
        '1920s safari aesthetic',
        'Outdoor shower',
        'Writing desk with bush views',
        'Private deck',
        'Telescope for stargazing',
      ],
      inspectorNote:
        'Sabora delivers the most romantic Hemingway-era bush experience. Tent 4 offers the best privacy and game-viewing from bed.',
    },
    {
      name: 'Faru Faru Suite',
      category: 'Recommended',
      recommendation: 'Best for families with older children',
      size: '120 m\u00B2',
      maxGuests: 3,
      priceRange: '$2,800-$4,200/night',
      highlights: [
        'River-facing suites',
        'Contemporary design',
        'Pool overlooking the Grumeti River',
        'Interactive kitchen',
        'Family suite configuration available',
      ],
      inspectorNote:
        'The most contemporary of the three lodges. Suite 9 (riverside) offers regular hippo and crocodile sightings from your private deck.',
    },
    {
      name: 'Explore Camp',
      category: 'Avoid in Wet Season',
      recommendation: 'Only for experienced safari travelers',
      size: '60 m\u00B2',
      maxGuests: 2,
      priceRange: '$1,800-$2,400/night',
      highlights: [
        'Mobile tented camp',
        'Follows the migration',
        'Ultimate wilderness immersion',
        'Limited amenities by design',
      ],
      inspectorNote:
        'Extraordinary for seasoned travelers who want raw authenticity. Not recommended during heavy rains (March-May) as access roads become challenging.',
    },
  ],
  quietWings:
    'At Sasakwa, suites 5-8 on the western ridge offer maximum privacy and minimal foot traffic. At Faru Faru, suites 7-9 along the river bend are furthest from common areas.',
  channels: [
    {
      name: 'Direct (Singita.com)',
      type: 'direct',
      priceRange: '$2,400-$5,200',
      perks: [
        'Best rate guarantee',
        'Complimentary spa treatment',
        'Room upgrade (subject to availability)',
        'Early check-in / late checkout',
      ],
      verified: true,
      url: 'https://singita.com',
    },
    {
      name: 'Atlas One',
      type: 'platform',
      priceRange: '$2,400-$5,200',
      perks: [
        'Trip Cash rewards (5%)',
        'Concierge pre-arrival planning',
        'Price match guarantee',
        'Free cancellation up to 30 days',
      ],
      verified: true,
      url: '#',
    },
    {
      name: 'Leading Hotels of the World',
      type: 'consortium',
      priceRange: '$2,600-$5,400',
      perks: [
        'Leaders Club benefits',
        'Complimentary breakfast',
        'Room upgrade when available',
      ],
      verified: true,
      url: 'https://lhw.com',
    },
    {
      name: 'Scott Dunn',
      type: 'tour-operator',
      priceRange: '$3,200-$6,800',
      perks: [
        'Full itinerary planning',
        'Multi-property packages',
        'In-country support team',
        'Charter flight arrangements',
      ],
      verified: true,
      url: 'https://scottdunn.com',
    },
  ],
  reviews: [
    {
      id: 'r1',
      author: 'Alexandra & James M.',
      verificationBadge: 'Inspector Verified Stay',
      tripPurpose: 'Honeymoon',
      partyComposition: 'Couple',
      roomCategory: 'Sasakwa Suite 5',
      season: 'July (Great Migration)',
      date: '2025-08-12',
      overallScore: 9.8,
      scores: {
        service: 10,
        design: 10,
        dining: 9.5,
        sleep: 9.5,
        value: 9,
      },
      whatFeltLuxurious:
        'Waking up to a leopard on the kopje outside our suite, then having our butler serve a perfect flat white on the terrace while we watched. The bush dinner under a canopy of stars with a private chef was the most magical meal of our lives.',
      whatCouldImprove:
        'WiFi is intentionally limited, which we grew to appreciate, but it would help to have a reliable connection in the main lodge for urgent needs.',
      wouldReturnAtSameRate: true,
      returnComment: 'Already rebooked for our first anniversary.',
      helpful: 87,
    },
    {
      id: 'r2',
      author: 'David Chen',
      verificationBadge: 'Verified Booking',
      tripPurpose: 'Photography Trip',
      partyComposition: 'Solo',
      roomCategory: 'Sabora Tented Suite 4',
      season: 'February (Green Season)',
      date: '2025-03-20',
      overallScore: 9.5,
      scores: {
        service: 9.5,
        design: 10,
        dining: 9,
        sleep: 9.5,
        value: 8.5,
      },
      whatFeltLuxurious:
        'The guide, Jackson, understood exactly what I needed as a photographer. He positioned the vehicle perfectly for golden hour shots and knew animal behavior intimately. The camp itself is a design masterpiece — every detail considered.',
      whatCouldImprove:
        'A dedicated photography hide near a waterhole would elevate this from excellent to perfect for serious wildlife photographers.',
      wouldReturnAtSameRate: true,
      returnComment:
        'The green season value is outstanding. Fewer crowds, dramatic skies, and baby animals everywhere.',
      helpful: 52,
    },
    {
      id: 'r3',
      author: 'Sarah & Tom Blackwell',
      verificationBadge: 'Verified Booking',
      tripPurpose: 'Anniversary',
      partyComposition: 'Couple',
      roomCategory: 'Faru Faru Suite 9',
      season: 'October (Short Rains)',
      date: '2025-11-05',
      overallScore: 9.2,
      scores: {
        service: 9.5,
        design: 9,
        dining: 9.5,
        sleep: 8.5,
        value: 8,
      },
      whatFeltLuxurious:
        'The private bush dinner on the riverbank was spectacular. Watching hippos from our deck at sunset while sipping South African wine from their incredible cellar. The staff remembered every preference from our first visit three years ago.',
      whatCouldImprove:
        'Our suite at Faru Faru was close to a hippo path, which meant some very loud nighttime visitors. Exciting but not ideal for light sleepers. Request suites further from the river if sleep is a priority.',
      wouldReturnAtSameRate: false,
      returnComment:
        'We love Singita but may try their Kruger properties next for variety at a slightly lower price point.',
      helpful: 38,
    },
    {
      id: 'r4',
      author: 'Fatima Al-Rashid',
      verificationBadge: 'Editor Verified Stay',
      tripPurpose: 'Celebration',
      partyComposition: 'Group of 6',
      roomCategory: 'Sasakwa Villa (Private)',
      season: 'December (Calving Season)',
      date: '2025-12-28',
      overallScore: 9.9,
      scores: {
        service: 10,
        design: 10,
        dining: 10,
        sleep: 10,
        value: 9.5,
      },
      whatFeltLuxurious:
        'We booked the entire Sasakwa Villa for our parents\u2019 golden anniversary. Six bedrooms, private staff of twelve, personal chef, and our own guide and vehicle. The team organized a Maasai cultural evening and a hot-air balloon sunrise over the migration herds. Every single detail was flawless.',
      whatCouldImprove:
        'Honestly struggling here. If forced: the wine list could include more French estates alongside the superb South African selection.',
      wouldReturnAtSameRate: true,
      returnComment: 'This is our family\u2019s forever place. We\u2019ve booked again for next year.',
      helpful: 124,
    },
  ],
  inspectorReport: {
    inspectorName: 'Charlotte Vane',
    inspectionDate: 'November 2025',
    stayDuration: '5 nights across all three lodges',
    executiveSummary:
      'Singita Grumeti remains the benchmark against which all safari experiences should be measured. Across five nights spanning Sasakwa, Sabora, and Faru Faru, the operation demonstrated extraordinary consistency, warmth, and attention to detail. The conservation story is not a marketing veneer but a genuine, measurable commitment that gives the entire experience moral weight.',
    strengths: [
      'Wildlife density and exclusivity of the 350,000-acre concession is unmatched',
      'Staff-to-guest ratio of 3:1 enables genuinely personalized service',
      'Design at each lodge is distinct yet cohesive — Sasakwa (manor house), Sabora (1920s tented), Faru Faru (contemporary)',
      'Wine program is arguably the finest in African hospitality, with 15,000+ bottles',
      'Conservation and anti-poaching operation is world-leading',
      'Guiding team includes some of the most experienced trackers in East Africa',
    ],
    weaknesses: [
      'No dedicated spa facility at any lodge (in-room treatments only)',
      'WiFi is deliberately limited — appropriate for most guests but challenging for those with urgent connectivity needs',
      'The Explore Camp is outstanding but weather-dependent and not suitable for all travelers',
      'Premium pricing means this is not accessible to most luxury travelers',
    ],
    recommendedRooms: [
      'Sasakwa Suite 5 — best kopje views, most private',
      'Sabora Tent 4 — most romantic, excellent game-viewing from bed',
      'Faru Faru Suite 9 — best river position, hippo viewing',
    ],
    roomsToAvoid: [
      'Faru Faru Suite 1 — closest to main lodge, less private',
      'Explore Camp during March-May wet season — access roads unreliable',
    ],
    luxuryVerdict:
      'Singita Grumeti earns its place in the global top 10. It is not merely a safari lodge but a complete luxury ecosystem where conservation, design, service, and gastronomy converge at the highest level. The experience justifies its premium positioning. This is what luxury travel should aspire to be: transformative, responsible, and deeply human.',
  },
  personalRanking: {
    officialRank: 7,
    personalRank: 2,
    fitReasons: [
      'You prioritize wildlife and nature experiences (your #1 travel interest)',
      'Your past stays at Aman and Four Seasons suggest alignment with this service philosophy',
      'You\'ve saved 4 safari properties to your wishlist',
      'Your travel pattern shows preference for Q3 visits to East Africa',
    ],
  },
};

/* ==========================================================================
   SECTION COMPONENTS
   ========================================================================== */

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

/* ----- Score ring ----- */
function ScoreRing({
  score,
  size = 'lg',
  color = 'amber',
}: {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'amber' | 'emerald' | 'sky';
}) {
  const dims = { sm: 48, md: 64, lg: 96 };
  const textSize = { sm: 'text-sm', md: 'text-lg', lg: 'text-3xl' };
  const strokeWidth = { sm: 3, md: 4, lg: 5 };
  const d = dims[size];
  const r = (d - strokeWidth[size] * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = score / 10;
  const offset = circumference * (1 - pct);
  const colorMap = {
    amber: { track: '#f1f5f9', fill: '#f59e0b' },
    emerald: { track: '#f1f5f9', fill: '#10b981' },
    sky: { track: '#f1f5f9', fill: '#0ea5e9' },
  };
  const c = colorMap[color];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: d, height: d }}>
      <svg width={d} height={d} className="-rotate-90">
        <circle
          cx={d / 2}
          cy={d / 2}
          r={r}
          fill="none"
          stroke={c.track}
          strokeWidth={strokeWidth[size]}
        />
        <circle
          cx={d / 2}
          cy={d / 2}
          r={r}
          fill="none"
          stroke={c.fill}
          strokeWidth={strokeWidth[size]}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className={cn('absolute font-bold text-slate-900 dark:text-white', textSize[size])}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

/* ----- Movement arrow ----- */
function MovementIndicator({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-semibold">
        <TrendingUp className="h-3.5 w-3.5" />+{value}
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-red-500 text-xs font-semibold">
        <TrendingDown className="h-3.5 w-3.5" />{value}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-slate-400 text-xs font-semibold">
      <Minus className="h-3.5 w-3.5" />Steady
    </span>
  );
}

/* ----- Dimension bar ----- */
function DimensionBar({
  dimension,
  score,
  description,
}: {
  dimension: string;
  score: number;
  description: string;
}) {
  const pct = (score / 10) * 100;
  const barColor =
    score >= 9.5
      ? 'bg-amber-500'
      : score >= 9.0
        ? 'bg-emerald-500'
        : score >= 8.0
          ? 'bg-sky-500'
          : 'bg-slate-400';

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{dimension}</span>
        <span className="text-sm font-bold text-slate-900 dark:text-white">{score.toFixed(1)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={cn('h-full rounded-full', barColor)}
        />
      </div>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
        {description}
      </p>
    </div>
  );
}

/* ----- Verification badge ----- */
function VerificationBadge({ label }: { label: string }) {
  const isInspector = label.toLowerCase().includes('inspector');
  const isEditor = label.toLowerCase().includes('editor');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        isInspector
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
          : isEditor
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
      )}
    >
      {isInspector ? (
        <ShieldCheck className="h-3 w-3" />
      ) : isEditor ? (
        <Eye className="h-3 w-3" />
      ) : (
        <BadgeCheck className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}

/* ==========================================================================
   SECTION: HERO
   ========================================================================== */

function HeroSection() {
  return (
    <section className="relative">
      {/* Full-width image */}
      <div className="relative h-[520px] w-full overflow-hidden">
        <Image
          src={property.heroImage}
          alt={property.name}
          fill
          className="object-cover"
          sizes="100vw"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Photo count button */}
        <button className="absolute bottom-6 right-6 flex items-center gap-2 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-2 text-sm font-medium text-slate-900 dark:text-white hover:bg-white transition-colors">
          <Camera className="h-4 w-4" />
          View all {property.photos.length} photos
        </button>

        {/* Hero content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              {/* Left: name, location, label */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {property.trustBadges.map((badge) => (
                    <span
                      key={badge.label}
                      className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-2.5 py-1 text-xs font-medium text-white"
                    >
                      <badge.icon className="h-3 w-3" />
                      {badge.label}
                    </span>
                  ))}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  {property.name}
                </h1>
                <div className="mt-2 flex items-center gap-2 text-white/80 text-sm">
                  <MapPin className="h-4 w-4" />
                  {property.location}
                </div>
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/90 backdrop-blur px-3 py-1.5 text-sm font-semibold text-white">
                    <Gem className="h-4 w-4" />
                    {property.luxuryTruthLabel}
                  </span>
                </div>
              </div>

              {/* Right: scores */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="relative">
                    <ScoreRing score={property.luxuryStandardScore} size="lg" color="amber" />
                  </div>
                  <p className="mt-1 text-xs font-medium text-white/80">Luxury Standard</p>
                </div>
                <div className="text-center">
                  <ScoreRing score={property.consistencyScore} size="md" color="emerald" />
                  <p className="mt-1 text-xs font-medium text-white/80">Consistency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   SECTION: RANKINGS STRIP
   ========================================================================== */

function RankingsStrip() {
  const { world, city, category } = property.rankings;
  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
    >
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                #{world.rank} <span className="text-sm font-normal text-slate-500">Worldwide</span>
              </p>
              <p className="text-xs text-slate-400">of {world.total.toLocaleString()} properties</p>
            </div>
            <MovementIndicator value={world.movement} />
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                #{city.rank}{' '}
                <span className="text-sm font-normal text-slate-500">in {property.city}</span>
              </p>
              <p className="text-xs text-slate-400">of {city.total} properties</p>
            </div>
            <MovementIndicator value={city.movement} />
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />
          <div className="flex items-center gap-3">
            <Tent className="h-5 w-5 text-sky-500" />
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                #{category.rank}{' '}
                <span className="text-sm font-normal text-slate-500">{category.label}</span>
              </p>
              <p className="text-xs text-slate-400">of {category.total} properties</p>
            </div>
            <MovementIndicator value={category.movement} />
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* ==========================================================================
   SECTION: WHY THIS RANKED HERE
   ========================================================================== */

function WhyRankedPanel() {
  const { beatsPeersOn, trailsPeersOn, bestFor, notIdealFor } = property.whyRankedHere;
  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Why This Ranked Here
            </h2>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Beats peers */}
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
              <TrendingUp className="h-4 w-4" />
              Beats Peers On
            </h3>
            <ul className="space-y-2">
              {beatsPeersOn.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Trails peers */}
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400 mb-3">
              <TrendingDown className="h-4 w-4" />
              Trails Peers On
            </h3>
            <ul className="space-y-2">
              {trailsPeersOn.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <X className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Best for */}
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white mb-3">
              <Target className="h-4 w-4 text-amber-500" />
              Best For
            </h3>
            <div className="flex flex-wrap gap-2">
              {bestFor.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* Not ideal for */}
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white mb-3">
              <Zap className="h-4 w-4 text-slate-400" />
              Not Ideal For
            </h3>
            <div className="flex flex-wrap gap-2">
              {notIdealFor.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ==========================================================================
   SECTION: LUXURY SCORES GRID
   ========================================================================== */

function LuxuryScoresGrid() {
  const avgScore =
    property.luxuryScores.reduce((sum, s) => sum + s.score, 0) / property.luxuryScores.length;

  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Luxury Scores
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Average</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {avgScore.toFixed(1)}
              </span>
              <span className="text-sm text-slate-400">/10</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {property.luxuryScores.map((s) => (
              <DimensionBar
                key={s.dimension}
                dimension={s.dimension}
                score={s.score}
                description={s.description}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ==========================================================================
   SECTION: LUXURY TAXONOMY
   ========================================================================== */

function LuxuryTaxonomy() {
  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Luxury Taxonomy
            </h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Property Type
            </h3>
            <Badge variant="default" size="lg">
              {property.taxonomy.propertyType}
            </Badge>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {property.taxonomy.categories.map((cat) => (
                <Badge key={cat} variant="outline" size="md">
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Best For
            </h3>
            <div className="flex flex-wrap gap-2">
              {property.taxonomy.bestForTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Price Level
            </h3>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tracking-wider">
              {property.taxonomy.priceLevel}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ==========================================================================
   SECTION: ROOM & UNIT INTELLIGENCE
   ========================================================================== */

function RoomIntelligence() {
  const categoryColors: Record<string, string> = {
    Best: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    Recommended: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    'Avoid in Wet Season': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };

  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bed className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Room & Unit Intelligence
            </h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {property.rooms.map((room) => (
            <div
              key={room.name}
              className="rounded-lg border border-slate-200 dark:border-slate-700 p-5 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {room.name}
                    </h3>
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                        categoryColors[room.category] || 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {room.category}
                    </span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                    {room.recommendation}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {room.priceRange}
                  </p>
                  <p className="text-xs text-slate-500">
                    {room.size} &middot; Up to {room.maxGuests} guests
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {room.highlights.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400"
                  >
                    <Check className="h-3 w-3 text-emerald-500" />
                    {h}
                  </span>
                ))}
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-3">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    <span className="font-semibold">Inspector Note:</span> {room.inspectorNote}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Quiet wings */}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-start gap-2">
              <VolumeX className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  Quiet Wings & Best Positions
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {property.quietWings}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ==========================================================================
   SECTION: AVAILABLE CHANNELS
   ========================================================================== */

function AvailableChannels() {
  const typeIcons: Record<string, typeof Globe> = {
    direct: Building,
    platform: Sparkles,
    consortium: Crown,
    'tour-operator': Compass,
  };
  const typeLabels: Record<string, string> = {
    direct: 'Direct',
    platform: 'Platform',
    consortium: 'Consortium',
    'tour-operator': 'Tour Operator',
  };

  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Available Channels
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Compare booking options, perks, and pricing across verified channels
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {property.channels.map((ch) => {
              const Icon = typeIcons[ch.type] || Globe;
              return (
                <div
                  key={ch.name}
                  className={cn(
                    'rounded-lg border p-5 transition-colors hover:border-amber-300 dark:hover:border-amber-700',
                    ch.type === 'platform'
                      ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                      : 'border-slate-200 dark:border-slate-700',
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg',
                          ch.type === 'platform'
                            ? 'bg-amber-100 dark:bg-amber-900/40'
                            : 'bg-slate-100 dark:bg-slate-800',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5',
                            ch.type === 'platform'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-400',
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {ch.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {typeLabels[ch.type]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {ch.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                          <BadgeCheck className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                    {ch.priceRange}
                    <span className="text-xs font-normal text-slate-500 ml-1">/night</span>
                  </p>

                  <ul className="space-y-1.5 mb-4">
                    {ch.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400"
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                      ch.type === 'platform'
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
                    )}
                  >
                    {ch.type === 'platform' ? 'Book with Atlas One' : 'View on ' + ch.name.split(' (')[0]}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ==========================================================================
   SECTION: VERIFIED LUXURY REVIEWS
   ========================================================================== */

function VerifiedReviews() {
  const [filterVerification, setFilterVerification] = useState('all');
  const [filterPurpose, setFilterPurpose] = useState('all');
  const [filterSeason, setFilterSeason] = useState('all');

  const filtered = property.reviews.filter((r) => {
    if (
      filterVerification !== 'all' &&
      !r.verificationBadge.toLowerCase().includes(filterVerification)
    )
      return false;
    if (filterPurpose !== 'all' && r.tripPurpose.toLowerCase() !== filterPurpose) return false;
    if (filterSeason !== 'all' && !r.season.toLowerCase().includes(filterSeason)) return false;
    return true;
  });

  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Verified Luxury Reviews
          </h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            ({property.reviews.length})
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={filterVerification}
          onChange={(e) => setFilterVerification(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">All Verification Types</option>
          <option value="inspector">Inspector Verified</option>
          <option value="editor">Editor Verified</option>
          <option value="booking">Verified Booking</option>
        </select>
        <select
          value={filterPurpose}
          onChange={(e) => setFilterPurpose(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">All Trip Purposes</option>
          <option value="honeymoon">Honeymoon</option>
          <option value="photography trip">Photography</option>
          <option value="anniversary">Anniversary</option>
          <option value="celebration">Celebration</option>
        </select>
        <select
          value={filterSeason}
          onChange={(e) => setFilterSeason(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="all">All Seasons</option>
          <option value="july">Great Migration (Jul)</option>
          <option value="february">Green Season (Feb)</option>
          <option value="october">Short Rains (Oct)</option>
          <option value="december">Calving Season (Dec)</option>
        </select>
      </div>

      {/* Review cards */}
      <div className="space-y-5">
        {filtered.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold text-sm">
                    {review.author
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{review.author}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(review.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <VerificationBadge label={review.verificationBadge} />
                  <ScoreRing score={review.overallScore} size="sm" color="amber" />
                </div>
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" size="sm">
                  {review.tripPurpose}
                </Badge>
                <Badge variant="outline" size="sm">
                  {review.partyComposition}
                </Badge>
                <Badge variant="outline" size="sm">
                  {review.roomCategory}
                </Badge>
                <Badge variant="outline" size="sm">
                  {review.season}
                </Badge>
              </div>

              {/* Sub-scores */}
              <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                {Object.entries(review.scores).map(([key, val]) => (
                  <div key={key} className="text-center">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {(val as number).toFixed(1)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 capitalize">
                      {key}
                    </p>
                  </div>
                ))}
              </div>

              {/* Review body */}
              <div className="space-y-4">
                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    What Felt Truly Luxurious
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {review.whatFeltLuxurious}
                  </p>
                </div>

                <div>
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    What Could Improve
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {review.whatCouldImprove}
                  </p>
                </div>

                {/* Would return */}
                <div
                  className={cn(
                    'rounded-lg p-3 flex items-start gap-2',
                    review.wouldReturnAtSameRate
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30'
                      : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700',
                  )}
                >
                  {review.wouldReturnAtSameRate ? (
                    <ThumbsUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <ThumbsDown className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white mb-0.5">
                      Would return at same rate?{' '}
                      <span
                        className={
                          review.wouldReturnAtSameRate
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-500'
                        }
                      >
                        {review.wouldReturnAtSameRate ? 'Yes' : 'Not necessarily'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {review.returnComment}
                    </p>
                  </div>
                </div>
              </div>

              {/* Helpful */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  <ThumbsUp className="h-4 w-4" />
                  Helpful ({review.helpful})
                </button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Filter className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No reviews match your filters. Try adjusting your selection.
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
}

/* ==========================================================================
   SECTION: INSPECTOR REPORTS
   ========================================================================== */

function InspectorReport() {
  const report = property.inspectorReport;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Inspector Report
              </h2>
            </div>
            <Badge variant="warning" size="sm">
              <Eye className="h-3 w-3 mr-1" />
              Exclusive
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Inspector: {report.inspectorName}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {report.inspectionDate}
            </span>
            <span className="flex items-center gap-1">
              <Moon className="h-3.5 w-3.5" />
              {report.stayDuration}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Executive summary */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Executive Summary
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {report.executiveSummary}
            </p>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
                <Check className="h-4 w-4" />
                Strengths
              </h3>
              <ul className="space-y-2">
                {report.strengths.map((s) => (
                  <li
                    key={s}
                    className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-500 mt-1 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400 mb-3">
                <X className="h-4 w-4" />
                Weaknesses
              </h3>
              <ul className="space-y-2">
                {report.weaknesses.map((w) => (
                  <li
                    key={w}
                    className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <X className="h-3.5 w-3.5 text-red-400 mt-1 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommended rooms */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-5 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3">
                      <Star className="h-4 w-4" />
                      Recommended Rooms
                    </h3>
                    <ul className="space-y-2">
                      {report.recommendedRooms.map((r) => (
                        <li
                          key={r}
                          className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                        >
                          <Star className="h-3.5 w-3.5 text-amber-500 mt-1 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                      <VolumeX className="h-4 w-4" />
                      Rooms to Avoid
                    </h3>
                    <ul className="space-y-2">
                      {report.roomsToAvoid.map((r) => (
                        <li
                          key={r}
                          className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                        >
                          <X className="h-3.5 w-3.5 text-slate-400 mt-1 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Luxury verdict */}
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-5">
                  <div className="flex items-start gap-3">
                    <Quote className="h-6 w-6 text-amber-500 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2">
                        Luxury Verdict
                      </h3>
                      <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed italic">
                        {report.luxuryVerdict}
                      </p>
                      <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400">
                        &mdash; {report.inspectorName}, Atlas One Luxury Inspector
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Read Full Report Including Verdict
              </>
            )}
          </button>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ==========================================================================
   SECTION: PERSONAL RANKING
   ========================================================================== */

function PersonalRanking() {
  const pr = property.personalRanking;

  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <Card className="border-sky-200 dark:border-sky-800 bg-gradient-to-br from-sky-50 to-white dark:from-sky-900/20 dark:to-slate-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CircleDot className="h-5 w-5 text-sky-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Your Personal Ranking
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6 mb-5">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Official Rank
              </p>
              <p className="text-4xl font-bold text-slate-400 dark:text-slate-500">
                #{pr.officialRank}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-6 w-6 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                Your Rank
              </p>
              <p className="text-4xl font-bold text-sky-600 dark:text-sky-400">
                #{pr.personalRank}
              </p>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                This property ranks significantly higher for you
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Based on your travel history, preferences, and saved interests
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Why It Fits You
            </h3>
            <ul className="space-y-2">
              {pr.fitReasons.map((reason) => (
                <li
                  key={reason}
                  className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <Check className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}

/* ==========================================================================
   MAIN PAGE
   ========================================================================== */

export default function PropertyDetailPage() {
  const [saved, setSaved] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
    >
      {/* Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Link href="/" className="hover:text-amber-600 transition-colors">
                Home
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/properties" className="hover:text-amber-600 transition-colors">
                Properties
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link
                href="/destinations/serengeti"
                className="hover:text-amber-600 transition-colors"
              >
                Serengeti
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-slate-900 dark:text-white font-medium">{property.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={saved ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSaved(!saved)}
              >
                <Heart className={cn('h-4 w-4 mr-1.5', saved && 'fill-current')} />
                {saved ? 'Saved' : 'Save'}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-1.5" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <HeroSection />

      {/* Rankings Strip */}
      <RankingsStrip />

      {/* Luxury Truth Label */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex items-start gap-3">
            <Gem className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Luxury Truth: {property.luxuryTruthLabel}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {property.luxuryTruthDescription}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Why This Ranked Here */}
        <WhyRankedPanel />

        {/* Luxury Scores Grid */}
        <LuxuryScoresGrid />

        {/* Luxury Taxonomy */}
        <LuxuryTaxonomy />

        {/* Room & Unit Intelligence */}
        <RoomIntelligence />

        {/* Available Channels */}
        <AvailableChannels />

        {/* Verified Luxury Reviews */}
        <VerifiedReviews />

        {/* Inspector Report */}
        <InspectorReport />

        {/* Personal Ranking */}
        <PersonalRanking />
      </div>
    </motion.div>
  );
}
