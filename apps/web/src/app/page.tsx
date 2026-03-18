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

/* ── Curated Destinations ─────────────────────────── */
const trendingDestinations = [
  { id: 'serengeti', city: 'Serengeti', country: 'Tanzania', image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=85', reviews: 28750 },
  { id: 'marrakech', city: 'Marrakech', country: 'Morocco', image: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=600&q=85', reviews: 35890 },
  { id: 'cairo', city: 'Cairo', country: 'Egypt', image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=600&q=85', reviews: 41320 },
  { id: 'cape-town', city: 'Cape Town', country: 'South Africa', image: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=600&q=85', reviews: 48210 },
  { id: 'havana', city: 'Havana', country: 'Cuba', image: 'https://images.unsplash.com/photo-1500759285222-a95626b934cb?w=600&q=85', reviews: 22450 },
  { id: 'rajasthan', city: 'Rajasthan', country: 'India', image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=600&q=85', reviews: 37640 },
];

/* ── The World's Finest Retreats ────────────────────── */
const popularHotels = [
  { title: 'Singita Grumeti', location: 'Serengeti, Tanzania', rating: 4.9, price: '$2,850/night', image: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=600&q=85', href: '/hotels/singita-grumeti' },
  { title: 'Royal Mansour', location: 'Marrakech, Morocco', rating: 4.9, price: '$1,800/night', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=85', href: '/hotels/royal-mansour' },
  { title: 'Belmond Safari Lodge', location: 'Botswana', rating: 4.8, price: '$2,200/night', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=85', href: '/hotels/belmond-safari' },
  { title: 'Raffles Hotel', location: 'Singapore', rating: 4.7, price: '$950/night', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=85', href: '/hotels/raffles' },
];

/* ── Guest Testimonials ──────────────────────────────── */
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
          HERO — Golden Desert Luxury
          ═══════════════════════════════════════════════ */}
      <section className="relative text-white overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Background — golden desert rock formations */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=90')] bg-cover bg-center" />
        {/* Cinematic overlay — warm golden tint at top, dark at bottom for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#B8945F]/10 via-black/30 to-black/75" />
        {/* Subtle vignette */}
        <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 250px rgba(0,0,0,0.3)' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-4 w-full h-full flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] as const }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 px-5 py-2 mb-8">
              <Sparkles className="h-4 w-4 text-brand-300" />
              <span className="text-sm tracking-wide text-white/90">AI-Powered Luxury Travel</span>
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-6 golden-glow leading-[1.1]">
              The Art of
              <br />
              <span className="bg-gradient-to-r from-brand-200 via-brand-300 to-brand-200 bg-clip-text text-transparent">
                Extraordinary Travel
              </span>
            </h1>
            <div className="luxury-divider mb-6" />
            <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed tracking-wide">
              Private safaris, chartered flights, and the world&apos;s most exclusive destinations — curated for the discerning traveler.
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
          CURATED DESTINATIONS
          ═══════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-14"
        >
          <p className="text-sm uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 font-medium mb-3">Discover</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-4">
            Curated Destinations
          </h2>
          <div className="luxury-divider mb-4" />
          <p className="text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 max-w-lg mx-auto">Extraordinary places where legends are born</p>
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
                  <div className="flex items-center gap-1 mt-2 text-xs text-brand-300">
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
          THE LUXURY COLLECTION — Safari Backdrop
          ═══════════════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        {/* Safari at golden hour */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1920&q=90')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-14"
          >
            <p className="text-sm uppercase tracking-[0.2em] text-brand-300 font-medium mb-3">Experience</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4 tracking-wide">
              The Luxury Collection
            </h2>
            <div className="luxury-divider mb-4" />
            <p className="text-white/60 tracking-wide">
              Champagne at sunset, butlers at dawn
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
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-sm border border-white/20 shadow-sm hover:shadow-lg hover:bg-white dark:hover:bg-[#1A1A1A] transition-all group hover:-translate-y-1 duration-300"
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
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          THE WORLD'S FINEST RETREATS
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
            <p className="text-sm uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 font-medium mb-3">Stay</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#1A1A1A] dark:text-[#F5F3EF] mb-4">
              The World&apos;s Finest Retreats
            </h2>
            <div className="luxury-divider mb-4" />
            <p className="text-[#1A1A1A]/50 dark:text-[#F5F3EF]/50 max-w-lg mx-auto">Where the wild meets unrivaled hospitality</p>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory"
          >
            {popularHotels.map((hotel) => (
              <motion.div key={hotel.title} variants={fadeUp} className="min-w-[300px] snap-start shrink-0">
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
          GUEST TESTIMONIALS — Campfire Night
          ═══════════════════════════════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        {/* African campfire / starlit savanna */}
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
            <p className="text-sm uppercase tracking-[0.2em] text-brand-300 font-medium mb-3">Voices</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4 tracking-wide">Guest Testimonials</h2>
            <div className="luxury-divider mb-4" />
            <p className="text-white/50">Stories from extraordinary journeys</p>
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
          CTA — African Sunset
          ═══════════════════════════════════════════════ */}
      <section className="relative py-32 overflow-hidden">
        {/* African sunset with acacia silhouettes */}
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
              Craft a bespoke itinerary with the world&apos;s finest lodges, private guides, and unforgettable moments.
            </p>
            <Link
              href="/trips"
              className="inline-flex items-center gap-3 bg-brand-500 text-white font-medium px-10 py-4 rounded-xl hover:bg-brand-400 transition-all text-lg shadow-golden border border-brand-400/30 hover:-translate-y-0.5 duration-300 tracking-wide"
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
