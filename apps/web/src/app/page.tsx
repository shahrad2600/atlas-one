'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Building2,
  Plane,
  UtensilsCrossed,
  Compass,
  Car,
  Ship,
  Star,
  ArrowRight,
  Sparkles,
  Shield,
  Trophy,
  Crown,
  TrendingUp,
  MapPin,
  CheckCircle2,
  BadgeCheck,
  Heart,
  Users,
  Eye,
} from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { PlaceCard } from '@/components/place-card';
import { ReviewCard } from '@/components/review-card';
import { CATEGORIES } from '@/lib/constants';

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 className="h-7 w-7" />,
  Plane: <Plane className="h-7 w-7" />,
  UtensilsCrossed: <UtensilsCrossed className="h-7 w-7" />,
  Compass: <Compass className="h-7 w-7" />,
  Car: <Car className="h-7 w-7" />,
  Ship: <Ship className="h-7 w-7" />,
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const staggerSlow = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

/* ── Luxury-Ranked Destinations ─────────────────────── */
const rankedDestinations = [
  { id: 'paris', city: 'Paris', country: 'France', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=85', rankedProperties: 47, topCategory: 'City Hotels' },
  { id: 'lake-como', city: 'Lake Como', country: 'Italy', image: 'https://images.unsplash.com/photo-1537799943037-f5da89a65689?w=600&q=85', rankedProperties: 18, topCategory: 'Lakeside Retreats' },
  { id: 'serengeti', city: 'Serengeti', country: 'Tanzania', image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=85', rankedProperties: 12, topCategory: 'Safari Lodges' },
  { id: 'tokyo', city: 'Tokyo', country: 'Japan', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=85', rankedProperties: 35, topCategory: 'Design Hotels' },
  { id: 'st-barts', city: 'St. Barts', country: 'Caribbean', image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&q=85', rankedProperties: 22, topCategory: 'Beach Resorts' },
  { id: 'marrakech', city: 'Marrakech', country: 'Morocco', image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=600&q=85', rankedProperties: 15, topCategory: 'Heritage Luxury' },
];

/* ── The World's Top-Ranked Luxury Stays ────────────────────── */
const topRankedStays = [
  {
    title: 'Aman Tokyo',
    location: 'Tokyo, Japan',
    price: '$1,200/night',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=85',
    href: '/hotels/aman-tokyo',
    worldRank: 3,
    cityRank: 1,
    luxuryStandard: 97.2,
    truthLabel: 'Design-led luxury',
    bestFor: ['privacy', 'design travelers'],
    badges: ['Inspector Verified', 'Consistency Leader'],
    scores: { service: 9.6, privacy: 9.8, design: 9.9, dining: 9.1, sleep: 9.7 },
  },
  {
    title: 'Singita Grumeti',
    location: 'Serengeti, Tanzania',
    price: '$2,850/night',
    image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&q=85',
    href: '/hotels/singita-grumeti',
    worldRank: 7,
    cityRank: 1,
    luxuryStandard: 95.8,
    truthLabel: 'Safari elegance',
    bestFor: ['romance', 'adventure'],
    badges: ['Best Safari Lodge', 'Editor Verified'],
    scores: { service: 9.8, privacy: 9.5, design: 9.3, dining: 9.4, sleep: 9.0 },
  },
  {
    title: 'Royal Mansour',
    location: 'Marrakech, Morocco',
    price: '$1,800/night',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=85',
    href: '/hotels/royal-mansour',
    worldRank: 11,
    cityRank: 1,
    luxuryStandard: 94.6,
    truthLabel: 'Heritage grand luxury',
    bestFor: ['couples', 'celebration'],
    badges: ['Best Service in City', 'Top Suite Program'],
    scores: { service: 9.9, privacy: 9.2, design: 9.7, dining: 9.3, sleep: 9.4 },
  },
  {
    title: 'Four Seasons Bora Bora',
    location: 'French Polynesia',
    price: '$2,100/night',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=85',
    href: '/hotels/four-seasons-bora-bora',
    worldRank: 15,
    cityRank: 1,
    luxuryStandard: 93.9,
    truthLabel: 'Barefoot luxury',
    bestFor: ['honeymoon', 'wellness'],
    badges: ['Best Beach Resort', 'Exceptional Sleep'],
    scores: { service: 9.4, privacy: 9.6, design: 9.1, dining: 8.9, sleep: 9.8 },
  },
];

/* ── Verified Luxury Reviews ──────────────────────────────── */
const luxuryReviews = [
  {
    author: 'Victoria Ashworth',
    date: 'Feb 28, 2026',
    rating: 5,
    title: 'Service that anticipates every need',
    text: 'The staff remembered my husband\'s allergy from our stay two years ago. Our butler had the suite prepared with hypoallergenic pillows before we arrived. That is what separates true luxury from expensive hospitality.',
    helpful: 42,
    badge: 'Verified Stay',
    stayType: 'Celebration',
  },
  {
    author: 'James Harrington',
    date: 'Feb 25, 2026',
    rating: 5,
    title: 'Design-led perfection in every detail',
    text: 'The riads, the spice markets, the rooftop dinners under the stars. Our concierge arranged a private dinner in the Atlas Mountains that will stay with me forever. This is a property that earns its ranking.',
    helpful: 31,
    badge: 'Repeat Guest',
    stayType: 'Romance',
  },
  {
    author: 'Elena Vasquez',
    date: 'Feb 22, 2026',
    rating: 5,
    title: 'Worth every dollar of the suite premium',
    text: 'A chartered bush plane, herds of elephants below, landing on a private airstrip. The lodge had butlers, champagne on ice, and the most extraordinary stargazing. The suite upgrade transformed the experience.',
    helpful: 56,
    badge: 'Inspector Verified',
    stayType: 'Adventure',
  },
];

/* ── How We Define Luxury — Trust Pillars ────────────────── */
const trustPillars = [
  {
    icon: <Shield className="h-8 w-8" />,
    title: 'Qualified, Not Self-Declared',
    description: 'Every property must pass our qualification engine before it can rank. Price alone does not define luxury.',
  },
  {
    icon: <BadgeCheck className="h-8 w-8" />,
    title: 'Verified Reviews Only',
    description: 'No anonymous reviews. Every opinion is tied to a verified stay, inspector visit, or advisor experience.',
  },
  {
    icon: <Eye className="h-8 w-8" />,
    title: 'Luxury Truth Labels',
    description: '"Beautiful but inconsistent." "Best booked as suites." We say what review sites won\'t.',
  },
  {
    icon: <Trophy className="h-8 w-8" />,
    title: 'Explainable Rankings',
    description: 'Every rank comes with a "why" — strengths, weaknesses, and who it\'s actually right for.',
  },
];

/* ── Luxury Dimensions (scoring preview) ─────────────────── */
const luxuryDimensions = [
  { label: 'Service Intelligence', description: 'Anticipatory, not reactive' },
  { label: 'Privacy & Calm', description: 'Serene, discreet, protected' },
  { label: 'Design & Sense of Place', description: 'Destination-rooted, not generic' },
  { label: 'Room & Suite Quality', description: 'Layout, view, bedding, light' },
  { label: 'Dining Seriousness', description: 'A reason to stay, not an amenity' },
  { label: 'Wellness Depth', description: 'Spa, movement, sleep, recovery' },
  { label: 'Consistency', description: 'Day 3 as good as day 1' },
  { label: 'Value at Luxury Level', description: 'Earns its rate vs. peers' },
  { label: 'Sleep Quality', description: 'Soundproofing, bedding, climate' },
  { label: 'Return-Worthiness', description: 'The most honest luxury signal' },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* ═══════════════════════════════════════════════
          HERO — Luxury Stay Authority
          ═══════════════════════════════════════════════ */}
      <section className="relative text-white overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=90')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#B8945F]/10 via-black/30 to-black/75" />
        <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 250px rgba(0,0,0,0.3)' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 w-full h-full flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] as const }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-5 py-2 mb-8">
              <Crown className="h-4 w-4 text-brand-300" />
              <span className="text-sm tracking-wide text-white/90">The Trusted Luxury Standard</span>
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-6 golden-glow leading-[1.1]">
              We Don&apos;t Tell You
              <br />
              <span className="bg-gradient-to-r from-brand-200 via-brand-300 to-brand-200 bg-clip-text text-transparent">
                What&apos;s Popular
              </span>
            </h1>
            <div className="luxury-divider mb-6" />
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed tracking-wide">
              We tell you what is truly luxurious, for whom, and why.
              <br />
              <span className="text-white/60">Qualified stays. Verified reviews. Explainable rankings.</span>
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
            className="max-w-4xl mx-auto w-full"
          >
            <SearchBar />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          TRUST PILLARS — How We Define Luxury
          ═══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-14"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 font-medium mb-3">Our Standard</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-4">
            A 5-Star Review Does Not Mean Luxury
          </h2>
          <div className="luxury-divider mb-4" />
          <p className="text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 max-w-2xl mx-auto">
            We qualify, score, and rank every property across 10 luxury dimensions — not a single star average
          </p>
        </motion.div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {trustPillars.map((pillar) => (
            <motion.div
              key={pillar.title}
              variants={fadeUp}
              className="relative p-6 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-[#E8E4DC] dark:border-white/10 shadow-sm hover:shadow-lg transition-all duration-300 group hover:-translate-y-1"
            >
              <div className="text-brand-500 dark:text-brand-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                {pillar.icon}
              </div>
              <h3 className="font-heading text-lg font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-2">{pillar.title}</h3>
              <p className="text-sm text-[#1A1A1A]/60 dark:text-[#F5F3EF]/60 leading-relaxed">{pillar.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          WORLD'S TOP-RANKED LUXURY STAYS
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
            <p className="text-sm uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 font-medium mb-3">World Rankings</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-4">
              The True Luxury 100
            </h2>
            <div className="luxury-divider mb-4" />
            <p className="text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 max-w-lg mx-auto">
              Qualified, scored, and ranked — the world&apos;s finest stays
            </p>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {topRankedStays.map((stay) => (
              <motion.div key={stay.title} variants={fadeUp}>
                <Link
                  href={stay.href}
                  className="group flex bg-white dark:bg-[#1A1A1A] rounded-2xl overflow-hidden border border-[#E8E4DC] dark:border-white/10 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                >
                  {/* Image */}
                  <div className="relative w-48 shrink-0">
                    <Image
                      src={stay.image}
                      alt={stay.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                      sizes="200px"
                      unoptimized
                    />
                    {/* World rank badge */}
                    <div className="absolute top-3 left-3 bg-brand-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg">
                      #{stay.worldRank} World
                    </div>
                  </div>
                  {/* Content */}
                  <div className="flex-1 p-5 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-heading text-lg font-bold text-[#1A1A1A] dark:text-[#F5F3EF] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {stay.title}
                        </h3>
                        <p className="text-sm text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {stay.location}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">{stay.luxuryStandard}</div>
                        <div className="text-[10px] uppercase tracking-wider text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40">Luxury Score</div>
                      </div>
                    </div>
                    {/* Truth label */}
                    <div className="inline-flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 text-xs font-medium px-2.5 py-1 rounded-full mb-3">
                      <CheckCircle2 className="h-3 w-3" />
                      {stay.truthLabel}
                    </div>
                    {/* Score bars */}
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {Object.entries(stay.scores).map(([key, val]) => (
                        <div key={key} className="text-center">
                          <div className="text-xs font-semibold text-[#1A1A1A] dark:text-[#F5F3EF]">{val}</div>
                          <div className="h-1 rounded-full bg-[#E8E4DC] dark:bg-white/10 mt-0.5">
                            <div
                              className="h-full rounded-full bg-brand-500"
                              style={{ width: `${(val / 10) * 100}%` }}
                            />
                          </div>
                          <div className="text-[9px] text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40 mt-0.5 capitalize">{key}</div>
                        </div>
                      ))}
                    </div>
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {stay.badges.map((badge) => (
                        <span
                          key={badge}
                          className="inline-flex items-center gap-1 text-[10px] font-medium bg-[#F5F3EF] dark:bg-white/5 text-[#1A1A1A]/60 dark:text-[#F5F3EF]/60 px-2 py-0.5 rounded-full"
                        >
                          <BadgeCheck className="h-2.5 w-2.5" />
                          {badge}
                        </span>
                      ))}
                      <span className="text-[10px] text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40 flex items-center gap-1">
                        <Heart className="h-2.5 w-2.5" /> Best for {stay.bestFor.join(', ')}
                      </span>
                    </div>
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
            <Link
              href="/rankings/worldwide/all_luxury"
              className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-medium hover:text-brand-500 transition-colors"
            >
              View the full True Luxury 100
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          LUXURY DESTINATIONS — Ranked by City
          ═══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-14"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 font-medium mb-3">City Rankings</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-4">
            Luxury Ranked by Destination
          </h2>
          <div className="luxury-divider mb-4" />
          <p className="text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 max-w-lg mx-auto">
            See the top qualified luxury stays in every city we cover
          </p>
        </motion.div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {rankedDestinations.map((dest) => (
            <motion.div key={dest.id} variants={fadeUp}>
              <Link
                href={`/rankings/city/${dest.id}`}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-sm hover:shadow-elevation-4 transition-shadow duration-500 block"
              >
                <Image
                  src={dest.image}
                  alt={dest.city}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white font-heading tracking-wide">{dest.city}</h3>
                  <p className="text-sm text-white/70 tracking-wide">{dest.country}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs text-brand-300 font-medium">
                      <Trophy className="h-3 w-3" />
                      {dest.rankedProperties} ranked stays
                    </span>
                    <span className="text-xs text-white/50">Top: {dest.topCategory}</span>
                  </div>
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
          <Link
            href="/rankings"
            className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-medium hover:text-brand-500 transition-colors"
          >
            Browse all ranked destinations
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          LUXURY SCORING — 10 Dimensions
          ═══════════════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1920&q=90')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-14"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-brand-300 font-medium mb-3">Scoring</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4 tracking-wide">
              10 Luxury Dimensions, Not 5 Stars
            </h2>
            <div className="luxury-divider mb-4" />
            <p className="text-white/60 max-w-2xl mx-auto">
              We don&apos;t ask &quot;Was it good?&quot; We ask: What kind of luxury was it, how well was it executed, and who is it right for?
            </p>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {luxuryDimensions.map((dim) => (
              <motion.div
                key={dim.label}
                variants={fadeUp}
                className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-center hover:bg-white/15 transition-colors"
              >
                <div className="text-sm font-medium text-white mb-1">{dim.label}</div>
                <div className="text-xs text-white/50">{dim.description}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          THE LUXURY COLLECTION — Category Access
          ═══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-14"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 font-medium mb-3">Explore</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-4">
            The Luxury Collection
          </h2>
          <div className="luxury-divider mb-4" />
          <p className="text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50">
            Qualified stays across every travel style
          </p>
        </motion.div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {CATEGORIES.map((cat) => (
            <motion.div key={cat.key} variants={fadeUp}>
              <Link
                href={cat.href}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-[#E8E4DC] dark:border-white/10 shadow-sm hover:shadow-lg hover:bg-white dark:hover:bg-[#1A1A1A] transition-all group hover:-translate-y-1 duration-300"
              >
                <div className="text-brand-500/70 group-hover:text-brand-500 dark:text-brand-400/70 dark:group-hover:text-brand-400 transition-colors">
                  {iconMap[cat.icon]}
                </div>
                <span className="text-sm font-medium text-[#1A1A1A] dark:text-[#F5F3EF] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors tracking-wide">
                  {cat.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          VERIFIED LUXURY REVIEWS
          ═══════════════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504432842672-1a79f78e4084?w=1920&q=90')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/75" />

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-14"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-brand-300 font-medium mb-3">Verified Voices</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4 tracking-wide">Luxury Reviews You Can Trust</h2>
            <div className="luxury-divider mb-4" />
            <p className="text-white/50">Every review tied to a verified stay — structured for luxury intelligence</p>
          </motion.div>
          <motion.div
            variants={staggerSlow}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {luxuryReviews.map((review) => (
              <motion.div key={review.author} variants={fadeUp}>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/15 transition-colors">
                  {/* Badge and type */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-300 bg-brand-500/20 px-2.5 py-1 rounded-full">
                      <BadgeCheck className="h-3 w-3" />
                      {review.badge}
                    </span>
                    <span className="text-xs text-white/40">{review.stayType}</span>
                  </div>
                  {/* Author */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-300">
                      {review.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{review.author}</p>
                      <p className="text-xs text-white/40">{review.date}</p>
                    </div>
                  </div>
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-brand-400 text-brand-400" />
                    ))}
                  </div>
                  {/* Content */}
                  <h4 className="font-heading text-base font-bold text-white mb-2">{review.title}</h4>
                  <p className="text-sm text-white/70 leading-relaxed mb-4">{review.text}</p>
                  {/* Helpful */}
                  <div className="text-xs text-white/40">
                    <span className="text-brand-300 font-medium">{review.helpful}</span> found this helpful
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          THREE ACCOMMODATION UNIVERSES
          ═══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-14"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 font-medium mb-3">Coverage</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-4">
            Three Luxury Universes
          </h2>
          <div className="luxury-divider mb-4" />
          <p className="text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 max-w-xl mx-auto">
            Each ranked by its own standards — because a palace hotel, a safari lodge, and a Malibu villa are not the same product
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
              title: 'Luxury Hotels & Resorts',
              subtitle: 'City hotels, beach resorts, wellness retreats, ski resorts, safari lodges',
              icon: <Building2 className="h-10 w-10" />,
              count: '800+',
              href: '/rankings/worldwide/all_luxury?universe=hotels_resorts',
            },
            {
              title: 'Villas & Private Residences',
              subtitle: 'Managed villas, estates, branded residences, curated home rentals',
              icon: <Crown className="h-10 w-10" />,
              count: '1,200+',
              href: '/rankings/worldwide/all_luxury?universe=villas_residences',
            },
            {
              title: 'Exceptional Specialty Stays',
              subtitle: 'Ryokans, tented camps, desert camps, private islands, vineyard estates',
              icon: <Sparkles className="h-10 w-10" />,
              count: '350+',
              href: '/rankings/worldwide/all_luxury?universe=specialty_stays',
            },
          ].map((universe) => (
            <motion.div key={universe.title} variants={fadeUp}>
              <Link
                href={universe.href}
                className="group block p-8 rounded-2xl bg-white dark:bg-[#1A1A1A] border border-[#E8E4DC] dark:border-white/10 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 text-center"
              >
                <div className="text-brand-500 dark:text-brand-400 mb-4 flex justify-center group-hover:scale-110 transition-transform duration-300">
                  {universe.icon}
                </div>
                <h3 className="font-heading text-xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-2">{universe.title}</h3>
                <p className="text-sm text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 mb-4 leading-relaxed">{universe.subtitle}</p>
                <div className="text-3xl font-bold text-brand-500 dark:text-brand-400">{universe.count}</div>
                <div className="text-xs text-[#1A1A1A]/40 dark:text-[#F5F3EF]/40 uppercase tracking-wider">qualified stays</div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA — Begin Your Journey
          ═══════════════════════════════════════════════ */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534177616064-ef1d0b8d671a?w=1920&q=90')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-[#B8945F]/10" />
        <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 200px rgba(0,0,0,0.2)' }} />

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <p className="text-sm uppercase tracking-[0.2em] text-brand-300 font-medium mb-4">Begin</p>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-3 golden-glow tracking-wide leading-tight">
              Your Extraordinary
              <br />
              Journey Awaits
            </h2>
            <div className="luxury-divider mb-6" />
            <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto tracking-wide leading-relaxed">
              Discover stays that are truly luxurious — qualified, ranked, and matched to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/rankings"
                className="inline-flex items-center gap-3 bg-brand-500 text-white font-medium px-10 py-4 rounded-xl hover:bg-brand-400 transition-all text-lg shadow-golden border border-brand-400/30 hover:-translate-y-0.5 duration-300 tracking-wide"
              >
                <Trophy className="h-5 w-5" />
                Explore Rankings
              </Link>
              <Link
                href="/trips"
                className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm text-white font-medium px-10 py-4 rounded-xl hover:bg-white/20 transition-all text-lg border border-white/20 hover:-translate-y-0.5 duration-300 tracking-wide"
              >
                Plan a Trip
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
