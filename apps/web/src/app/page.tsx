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

const trendingDestinations = [
  { id: 'paris', city: 'Paris', country: 'France', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80', reviews: 48210 },
  { id: 'tokyo', city: 'Tokyo', country: 'Japan', image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80', reviews: 35890 },
  { id: 'new-york', city: 'New York', country: 'United States', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80', reviews: 62450 },
  { id: 'rome', city: 'Rome', country: 'Italy', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80', reviews: 41320 },
  { id: 'bali', city: 'Bali', country: 'Indonesia', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80', reviews: 28750 },
  { id: 'barcelona', city: 'Barcelona', country: 'Spain', image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&q=80', reviews: 37640 },
];

const popularHotels = [
  { title: 'The Ritz Paris', location: 'Paris, France', rating: 4.8, price: '$892/night', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80', href: '/hotels/ritz-paris' },
  { title: 'Aman Tokyo', location: 'Tokyo, Japan', rating: 4.9, price: '$1,200/night', image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80', href: '/hotels/aman-tokyo' },
  { title: 'The Plaza', location: 'New York, USA', rating: 4.7, price: '$745/night', image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80', href: '/hotels/the-plaza' },
  { title: 'Hotel de Russie', location: 'Rome, Italy', rating: 4.6, price: '$650/night', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80', href: '/hotels/hotel-de-russie' },
];

const recentReviews = [
  {
    author: 'Sarah Mitchell',
    date: 'Feb 28, 2026',
    rating: 5,
    title: 'Absolutely magical experience',
    text: 'Our stay at The Ritz Paris was nothing short of extraordinary. From the moment we arrived, the staff treated us like royalty. The room was impeccable, the dining world-class, and the location unbeatable.',
    helpful: 42,
  },
  {
    author: 'James Chen',
    date: 'Feb 25, 2026',
    rating: 4,
    title: 'Tokyo food tour was incredible',
    text: 'The guided food tour through Tsukiji and Shibuya opened our eyes to flavors we never knew existed. Our guide Yuki was knowledgeable and passionate. Only wish it was longer!',
    helpful: 31,
  },
  {
    author: 'Elena Rodriguez',
    date: 'Feb 22, 2026',
    rating: 5,
    title: 'Best diving in Southeast Asia',
    text: 'The coral reefs around Bali were breathtaking. Crystal clear water, incredible marine life, and professional dive instructors. We saw manta rays on our first dive! Absolutely unforgettable.',
    helpful: 56,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-sky-900 via-sky-800 to-indigo-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80')] bg-cover bg-center opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-900/20 to-sky-900/60" />
        <div className="relative max-w-6xl mx-auto px-4 py-28 sm:py-36">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 mb-6">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span className="text-sm font-medium text-sky-100">AI-powered travel platform</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-5">
              Discover Your Next
              <br />
              <span className="bg-gradient-to-r from-sky-200 via-white to-sky-200 bg-clip-text text-transparent">
                Adventure
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-sky-100/90 max-w-2xl mx-auto leading-relaxed">
              Search hotels, flights, restaurants, and experiences across the globe.
              Plan, book, and share your perfect trip with Atlas One.
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

      {/* Trending Destinations */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-sky-600 dark:text-sky-400" />
              Trending Destinations
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Most popular places travelers are exploring right now</p>
          </div>
          <Link
            href="/destinations"
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
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
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-xl font-bold text-white">{dest.city}</h3>
                  <p className="text-sm text-white/80">{dest.country}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-white/70">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>{dest.reviews.toLocaleString()} reviews</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Categories */}
      <section className="bg-slate-50 dark:bg-slate-900/50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              Explore by Category
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Everything you need for the perfect trip, all in one place
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
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-sky-200 dark:hover:border-sky-700 transition-all group hover:-translate-y-1 duration-300"
                >
                  <div className="text-slate-400 group-hover:text-sky-600 dark:text-slate-500 dark:group-hover:text-sky-400 transition-colors">
                    {iconMap[cat.icon]}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {cat.label}
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Popular Hotels */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Popular Hotels</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Top-rated accommodations loved by travelers</p>
          </div>
          <Link
            href="/hotels"
            className="hidden sm:flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
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
                category="Hotel"
              />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Recent Reviews */}
      <section className="bg-slate-50 dark:bg-slate-900/50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="flex items-center justify-between mb-10"
          >
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Recent Reviews</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">See what other travelers are saying</p>
            </div>
            <Link
              href="/reviews"
              className="hidden sm:flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors"
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
                <ReviewCard {...review} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="bg-gradient-to-r from-sky-600 via-sky-600 to-indigo-600 dark:from-sky-700 dark:via-sky-800 dark:to-indigo-800 py-20"
      >
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl sm:text-4xl font-bold text-white mb-4"
          >
            Ready to Plan Your Trip?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-sky-100 text-lg mb-8 max-w-2xl mx-auto"
          >
            Create a personalized itinerary, book everything in one place,
            and share your adventure with friends and family.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link
              href="/trips"
              className="inline-flex items-center gap-2 bg-white text-sky-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-sky-50 transition-all text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-300"
            >
              Plan Your Trip
              <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </motion.section>
    </main>
  );
}
