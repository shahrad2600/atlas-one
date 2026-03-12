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
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { SearchBar } from '@/components/search-bar';
import { PlaceCard } from '@/components/place-card';
import { ReviewCard } from '@/components/review-card';
import { CATEGORIES } from '@/lib/constants';

const iconMap: Record<string, React.ReactNode> = {
  Building2: <Building2 className="h-8 w-8" />,
  Plane: <Plane className="h-8 w-8" />,
  UtensilsCrossed: <UtensilsCrossed className="h-8 w-8" />,
  Compass: <Compass className="h-8 w-8" />,
  Car: <Car className="h-8 w-8" />,
  Ship: <Ship className="h-8 w-8" />,
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const staggerSlow = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

/* ── Adventure Destinations ─────────────────────────── */
const trendingDestinations = [
  { id: 'serengeti', city: 'Serengeti', country: 'Tanzania', image: 'https://images.unsplash.com/photo-1516426122078-c23e76b9cefd?w=600&q=80', reviews: 28750 },
  { id: 'marrakech', city: 'Marrakech', country: 'Morocco', image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=600&q=80', reviews: 35890 },
  { id: 'cairo', city: 'Cairo', country: 'Egypt', image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=600&q=80', reviews: 41320 },
  { id: 'cape-town', city: 'Cape Town', country: 'South Africa', image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=600&q=80', reviews: 48210 },
  { id: 'havana', city: 'Havana', country: 'Cuba', image: 'https://images.unsplash.com/photo-1500759285222-a95626b934cb?w=600&q=80', reviews: 22450 },
  { id: 'rajasthan', city: 'Rajasthan', country: 'India', image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=80', reviews: 37640 },
];

/* ── Luxury Lodges & Retreats ────────────────────────── */
const popularHotels = [
  { title: 'Singita Grumeti', location: 'Serengeti, Tanzania', rating: 4.9, price: '$2,850/night', image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&q=80', href: '/hotels/singita-grumeti' },
  { title: 'Royal Mansour', location: 'Marrakech, Morocco', rating: 4.9, price: '$1,800/night', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80', href: '/hotels/royal-mansour' },
  { title: 'Belmond Safari Lodge', location: 'Botswana', rating: 4.8, price: '$2,200/night', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80', href: '/hotels/belmond-safari' },
  { title: 'Raffles Hotel', location: 'Singapore', rating: 4.7, price: '$950/night', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80', href: '/hotels/raffles' },
];

/* ── Traveler Tales ──────────────────────────────────── */
const recentReviews = [
  {
    author: 'Victoria Ashworth',
    date: 'Feb 28, 2026',
    rating: 5,
    title: 'A sunrise over the Serengeti',
    text: 'Waking to the sound of lions in the distance, sipping champagne as the sun painted the savanna gold. Our guide spotted the Big Five in a single morning drive. Nothing compares.',
    helpful: 42,
  },
  {
    author: 'James Harrington',
    date: 'Feb 25, 2026',
    rating: 5,
    title: 'Marrakech at golden hour',
    text: 'The riads, the spice markets, the rooftop dinners under the stars. Our concierge arranged a private dinner in the Atlas Mountains that will stay with me forever.',
    helpful: 31,
  },
  {
    author: 'Elena Vasquez',
    date: 'Feb 22, 2026',
    rating: 5,
    title: 'Flying over the Okavango Delta',
    text: 'A chartered bush plane, herds of elephants below, landing on a private airstrip. The lodge had butlers, champagne on ice, and the most extraordinary stargazing.',
    helpful: 56,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* ═══════════════════════════════════════════════
          HERO — Vintage Biplane over Golden Desert
          ═══════════════════════════════════════════════ */}
      <section className="relative text-white overflow-hidden">
        {/* Background image — golden desert / vintage aviation */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1920&q=80')] bg-cover bg-center vintage-sepia" />
        {/* Dark warm overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1C1008]/85 via-[#2C1810]/80 to-[#3F2E04]/75" />
        {/* Bottom gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#1C1008]/60" />
        {/* Vignette */}
        <div className="absolute inset-0 vintage-vignette" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-28 sm:py-36">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/20 backdrop-blur-sm border border-brand-400/30 px-4 py-1.5 mb-6">
              <Sparkles className="h-4 w-4 text-brand-300" />
              <span className="text-sm font-medium text-brand-200">AI-powered travel platform</span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-5">
              Embark on Your Grand
              <br />
              <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-brand-400 bg-clip-text text-transparent">
                Adventure
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-brand-100/90 max-w-2xl mx-auto leading-relaxed">
              Journey to extraordinary destinations across the globe.
              Luxury lodges, chartered flights, and unforgettable experiences — all in one place.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
            className="max-w-4xl mx-auto"
          >
            <SearchBar />
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          ADVENTURE DESTINATIONS
          ═══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#3C2415] dark:text-[#F5E6D3] flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-brand-500 dark:text-brand-400" />
              Adventure Destinations
            </h2>
            <p className="text-[#3C2415]/60 dark:text-[#F5E6D3]/60 mt-1">Extraordinary places where legends are born</p>
          </div>
          <Link
            href="/destinations"
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {trendingDestinations.map((dest) => (
            <motion.div key={dest.id} variants={fadeUp}>
              <Link
                href={`/destinations/${dest.id}`}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-sm hover:shadow-xl transition-shadow block"
              >
                <Image
                  src={dest.image}
                  alt={dest.city}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500 vintage-sepia"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1008]/80 via-[#1C1008]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-xl font-bold text-white font-heading">{dest.city}</h3>
                  <p className="text-sm text-white/80">{dest.country}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-brand-300/90">
                    <Star className="h-3 w-3 fill-brand-300 text-brand-300" />
                    <span>{dest.reviews.toLocaleString()} reviews</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════
          WAYS TO EXPLORE — Safari Background
          ═══════════════════════════════════════════════ */}
      <section className="relative py-20 overflow-hidden">
        {/* Safari game drive background */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1920&q=80')] bg-cover bg-center vintage-sepia" />
        <div className="absolute inset-0 bg-[#1C1008]/65 dark:bg-[#1C1008]/80" />
        <div className="absolute inset-0 vintage-vignette" />

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-3">
              Ways to Explore
            </h2>
            <p className="text-brand-200/80">
              Every great expedition begins with a single step
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
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#FDF5E6]/90 dark:bg-[#2C1810]/90 backdrop-blur-sm border border-brand-300/30 dark:border-brand-700/30 shadow-sm hover:shadow-lg hover:border-brand-400 dark:hover:border-brand-500 transition-all group hover:-translate-y-1 duration-300"
                >
                  <div className="text-brand-500/70 group-hover:text-brand-500 dark:text-brand-400/70 dark:group-hover:text-brand-400 transition-colors">
                    {iconMap[cat.icon]}
                  </div>
                  <span className="text-sm font-medium text-[#3C2415] dark:text-[#F5E6D3] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {cat.label}
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          LUXURY LODGES & RETREATS
          ═══════════════════════════════════════════════ */}
      <section className="bg-[#FAF0E6] dark:bg-[#1C1008]/50">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="flex items-center justify-between mb-10"
          >
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#3C2415] dark:text-[#F5E6D3]">Luxury Lodges &amp; Retreats</h2>
              <p className="text-[#3C2415]/60 dark:text-[#F5E6D3]/60 mt-1">Where the wild meets the finest in hospitality</p>
            </div>
            <Link
              href="/hotels"
              className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory"
          >
            {popularHotels.map((hotel) => (
              <motion.div key={hotel.title} variants={fadeUp} className="min-w-[280px] snap-start shrink-0">
                <PlaceCard
                  {...hotel}
                  category="Lodge"
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          TRAVELER TALES — Campfire / Night Background
          ═══════════════════════════════════════════════ */}
      <section className="relative py-20 overflow-hidden">
        {/* African campfire / night sky background */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504432842672-1a79f78e4084?w=1920&q=80')] bg-cover bg-center vintage-sepia" />
        <div className="absolute inset-0 bg-[#1C1008]/75 dark:bg-[#1C1008]/85" />
        <div className="absolute inset-0 vintage-vignette" />

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="flex items-center justify-between mb-10"
          >
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white">Traveler Tales</h2>
              <p className="text-brand-200/70 mt-1">Stories from extraordinary journeys</p>
            </div>
            <Link
              href="/reviews"
              className="hidden sm:flex items-center gap-1 text-sm font-medium text-brand-300 hover:text-brand-200 transition-colors"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
          <motion.div
            variants={staggerSlow}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {recentReviews.map((review) => (
              <motion.div key={review.author} variants={fadeUp}>
                <ReviewCard {...review} variant="overlay" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CTA — African Sunset Silhouette
          ═══════════════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        {/* African sunset with acacia tree silhouettes */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534177616064-ef1d0b8d671a?w=1920&q=80')] bg-cover bg-center vintage-sepia" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1C1008]/80 via-[#2C1810]/70 to-[#3F2E04]/80" />
        <div className="absolute inset-0 vintage-vignette" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4"
          >
            Your Grand Expedition Awaits
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-brand-200 text-lg mb-8 max-w-2xl mx-auto"
          >
            Craft a bespoke itinerary, reserve the finest lodges,
            and embark on the adventure of a lifetime.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link
              href="/trips"
              className="inline-flex items-center gap-2 bg-brand-500 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-brand-600 transition-all text-lg shadow-vintage border-2 border-brand-400/50 hover:-translate-y-0.5 duration-300"
            >
              Begin Your Journey
              <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
