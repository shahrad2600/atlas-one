'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  Clock,
  User,
  Calendar,
  ChevronRight,
  Lightbulb,
  MapPin,
  AlertCircle,
  Star,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ---------- mock data ---------- */

const guide = {
  id: '48-hours-in-tokyo',
  title: '48 Hours in Tokyo: The Ultimate Weekend Itinerary',
  heroImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1400&h=600&fit=crop',
  destination: 'Tokyo, Japan',
  author: {
    name: 'Sarah Chen',
    avatar: null,
    bio: 'Tokyo-based travel writer and Japan specialist with over 10 years exploring every corner of the city.',
  },
  publishedDate: 'February 15, 2026',
  readTime: '12 min read',
  tableOfContents: [
    { id: 'getting-around', title: 'Getting Around Tokyo' },
    { id: 'day-one-morning', title: 'Day 1 Morning: Tsukiji & Ginza' },
    { id: 'day-one-afternoon', title: 'Day 1 Afternoon: Shibuya & Harajuku' },
    { id: 'day-one-evening', title: 'Day 1 Evening: Shinjuku' },
    { id: 'day-two-morning', title: 'Day 2 Morning: Asakusa & Ueno' },
    { id: 'day-two-afternoon', title: 'Day 2 Afternoon: Akihabara & Nihonbashi' },
    { id: 'day-two-evening', title: 'Day 2 Evening: Roppongi & Tokyo Tower' },
    { id: 'practical-tips', title: 'Practical Tips' },
  ],
};

const relatedGuides = [
  {
    id: 'bangkok-street-food',
    title: 'Bangkok Street Food: 25 Dishes You Must Try',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop',
    destination: 'Bangkok, Thailand',
    readTime: '13 min read',
  },
  {
    id: 'barcelona-weekend',
    title: 'A Perfect Weekend in Barcelona',
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400&h=250&fit=crop',
    destination: 'Barcelona, Spain',
    readTime: '9 min read',
  },
  {
    id: 'rome-food-guide',
    title: 'Eating Like a Roman: Neighborhood Food Guide',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=250&fit=crop',
    destination: 'Rome, Italy',
    readTime: '10 min read',
  },
];

/* ---------- content sections ---------- */

function TipCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border border-sky-200 bg-sky-50 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-5 w-5 text-sky-600" />
        <h4 className="font-semibold text-sky-800">{title}</h4>
      </div>
      <div className="text-sm text-sky-700 leading-relaxed">{children}</div>
    </div>
  );
}

function WarningCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        <h4 className="font-semibold text-amber-800">Good to Know</h4>
      </div>
      <div className="text-sm text-amber-700 leading-relaxed">{children}</div>
    </div>
  );
}

/* ---------- page ---------- */

export default function GuideDetailPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative h-[400px] md:h-[500px]">
        <Image src={guide.heroImage} alt={guide.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-2 text-white/80 text-sm mb-3">
              <Link href="/" className="hover:text-white">Home</Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/guides" className="hover:text-white">Guides</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-white">{guide.destination}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              {guide.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Author bar */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-semibold text-sm">
                {guide.author.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{guide.author.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{guide.author.bio}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {guide.publishedDate}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {guide.readTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Table of Contents - Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Contents</h3>
              <nav className="space-y-1">
                {guide.tableOfContents.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Article body */}
          <article className="flex-1 min-w-0 max-w-3xl">
            <div className="prose prose-slate max-w-none">
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                Tokyo is a city that defies expectations at every turn. In just 48 hours, you can experience ancient temples, cutting-edge technology, world-class cuisine, and neighborhoods with wildly different personalities. This itinerary is designed to give you a comprehensive taste of what makes Tokyo one of the most fascinating cities on the planet.
              </p>

              {/* Getting Around */}
              <h2 id="getting-around" className="text-2xl font-bold text-slate-900 dark:text-white mt-10 mb-4 scroll-mt-24">
                Getting Around Tokyo
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                The Tokyo Metro and JR lines are your best friends in this city. Pick up a Suica or Pasmo IC card at any station for seamless travel across all train and bus lines. Google Maps works flawlessly for transit navigation in Tokyo and will give you exact platform numbers and transfer timing.
              </p>

              <TipCard title="Transport Tip">
                <p>Purchase a 48-hour Tokyo Subway Ticket for unlimited rides on Tokyo Metro and Toei Subway lines. At roughly 1,200 yen, it pays for itself within a few trips and removes the stress of calculating individual fares.</p>
              </TipCard>

              {/* Day 1 Morning */}
              <h2 id="day-one-morning" className="text-2xl font-bold text-slate-900 dark:text-white mt-10 mb-4 scroll-mt-24">
                Day 1 Morning: Tsukiji Outer Market & Ginza
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Start your Tokyo adventure early at Tsukiji Outer Market, where the energy of vendors and the aroma of fresh seafood will wake you up better than any alarm clock. While the inner wholesale market moved to Toyosu, the outer market remains a vibrant food paradise. Grab tamagoyaki (Japanese rolled omelet), fresh sashimi on rice, and a warm cup of matcha.
              </p>
              <p className="text-slate-600 leading-relaxed mt-4">
                From Tsukiji, walk to the upscale Ginza district. Stroll along Chuo-dori, Tokyo&apos;s most elegant shopping street, and pop into the stunning GINZA SIX department store for its rooftop garden with city views. Architecture fans should not miss the Nakagin Capsule Tower nearby.
              </p>

              {/* Day 1 Afternoon */}
              <h2 id="day-one-afternoon" className="text-2xl font-bold text-slate-900 dark:text-white mt-10 mb-4 scroll-mt-24">
                Day 1 Afternoon: Shibuya & Harajuku
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Take the train to Shibuya and experience the famous Shibuya Crossing, the busiest pedestrian intersection in the world. Head up to the Shibuya Sky observation deck for breathtaking 360-degree views of the city. The Shibuya area is also home to excellent shopping at Shibuya 109 and countless trendy cafes.
              </p>
              <p className="text-slate-600 leading-relaxed mt-4">
                Walk from Shibuya to Harajuku along Cat Street, a quiet backstreet lined with independent boutiques and coffee shops. Explore Takeshita-dori for kawaii culture, then find peace at Meiji Shrine, set within a lush forest right in the heart of the city. The contrast between the buzzing fashion street and the tranquil shrine grounds is quintessentially Tokyo.
              </p>

              <TipCard title="Local Secret">
                <p>Skip the crowded main approach to Meiji Shrine and enter from the Harajuku side gate near the JR station. You will find yourself on a beautiful forested path with far fewer visitors, especially in the early afternoon.</p>
              </TipCard>

              {/* Day 1 Evening */}
              <h2 id="day-one-evening" className="text-2xl font-bold text-slate-900 dark:text-white mt-10 mb-4 scroll-mt-24">
                Day 1 Evening: Shinjuku
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                End your first day in the electric neighborhood of Shinjuku. Start with dinner at one of the tiny restaurants in Omoide Yokocho (Memory Lane), also known as Piss Alley. Despite the name, this narrow alley of smoky yakitori joints is an unforgettable atmospheric dining experience. Each stall seats only a handful of people, creating an intimate and lively atmosphere.
              </p>
              <p className="text-slate-600 leading-relaxed mt-4">
                After dinner, wander through the neon-drenched streets of Kabukicho, visit the free observation deck at the Tokyo Metropolitan Government Building for night views, or find a cozy jazz bar in Golden Gai, another network of narrow lanes packed with tiny themed bars.
              </p>

              <WarningCard>
                <p>Some bars in Golden Gai charge a seating fee (typically 500 to 1,000 yen) on top of drink prices. Check for signs before entering. Many bars have a maximum capacity of six to eight people, so you may need to try a few spots.</p>
              </WarningCard>

              {/* Day 2 Morning */}
              <h2 id="day-two-morning" className="text-2xl font-bold text-slate-900 dark:text-white mt-10 mb-4 scroll-mt-24">
                Day 2 Morning: Asakusa & Ueno
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Begin your second day at Senso-ji, Tokyo&apos;s oldest and most famous temple, in the Asakusa district. Arrive before 8 AM to avoid crowds and enjoy the peaceful morning atmosphere. Walk through the iconic Kaminarimon (Thunder Gate) and along Nakamise-dori shopping street, which has been selling traditional snacks and souvenirs for centuries.
              </p>
              <p className="text-slate-600 leading-relaxed mt-4">
                From Asakusa, take a short train ride to Ueno. Stroll through Ueno Park, home to several world-class museums. The Tokyo National Museum houses an extraordinary collection of Japanese art and artifacts. If the weather is pleasant, the park itself is a delight with its ponds, shrines, and wide walking paths.
              </p>

              {/* Day 2 Afternoon */}
              <h2 id="day-two-afternoon" className="text-2xl font-bold text-slate-900 dark:text-white mt-10 mb-4 scroll-mt-24">
                Day 2 Afternoon: Akihabara & Nihonbashi
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Head to Akihabara, the famous electronics and anime district. Even if you are not into anime culture, the sheer sensory overload of this neighborhood is worth experiencing. Visit a multi-story electronics store, try a themed cafe, or browse vintage video game shops. The energy here is unlike anywhere else in the world.
              </p>
              <p className="text-slate-600 leading-relaxed mt-4">
                Walk south to Nihonbashi, one of Tokyo&apos;s oldest commercial districts. Visit the beautifully renovated COREDO Muromachi complex for artisan crafts and traditional Japanese goods. This area offers a fascinating look at how Tokyo blends its merchant heritage with modern retail.
              </p>

              {/* Day 2 Evening */}
              <h2 id="day-two-evening" className="text-2xl font-bold text-slate-900 dark:text-white mt-10 mb-4 scroll-mt-24">
                Day 2 Evening: Roppongi & Tokyo Tower
              </h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Finish your 48 hours with a memorable evening. Visit the Mori Art Museum in Roppongi Hills for contemporary art and the observation deck on the 52nd floor. As darkness falls, make your way to Tokyo Tower, which glows orange against the night sky. The classic 1958 tower offers a different, more nostalgic vantage point than the newer Skytree.
              </p>
              <p className="text-slate-600 leading-relaxed mt-4">
                For your final dinner, treat yourself to a special meal. The Roppongi and Azabu-Juban areas have excellent sushi restaurants, izakayas, and international dining. End the night with a cocktail at a rooftop bar, watching the city lights stretch to the horizon.
              </p>

              <TipCard title="Dining Tip">
                <p>For an unforgettable sushi experience without the Michelin-star price tag, look for lunch-set menus (ranchi setto) at high-end sushi counters. Many top restaurants offer incredible quality at roughly half the dinner price when you visit between 11:30 AM and 2:00 PM.</p>
              </TipCard>

              {/* Practical Tips */}
              <h2 id="practical-tips" className="text-2xl font-bold text-slate-900 dark:text-white mt-10 mb-4 scroll-mt-24">
                Practical Tips
              </h2>
              <div className="space-y-4 text-slate-600">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                  <p><strong>Cash is still important.</strong> While credit cards are increasingly accepted, many smaller restaurants and shops are cash-only. Convenience store ATMs (7-Eleven and Lawson) accept foreign cards.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                  <p><strong>Pocket WiFi is essential.</strong> Rent a pocket WiFi device at the airport or order one in advance. It will be invaluable for navigation and translation.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                  <p><strong>Convenience stores are incredible.</strong> Japanese conbini (7-Eleven, Lawson, FamilyMart) are a destination in themselves. Fresh onigiri, sandwiches, and hot meals are all excellent quality.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                  <p><strong>Be mindful of etiquette.</strong> Avoid talking on phones in trains, walk on the left side of escalators in Tokyo, and never tip at restaurants.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                  <p><strong>Trains stop around midnight.</strong> The last trains are typically between 11:30 PM and 12:30 AM. If you miss them, taxis are expensive. Plan accordingly or budget for a late-night cab.</p>
                </div>
              </div>
            </div>

            {/* Related Guides */}
            <div className="mt-16 border-t border-slate-200 pt-10">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Related Guides</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {relatedGuides.map((rg) => (
                  <Link key={rg.id} href={`/guides/${rg.id}`} className="group">
                    <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
                      <div className="aspect-[3/2] overflow-hidden bg-slate-200">
                        <Image src={rg.image} alt={rg.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
                      </div>
                      <CardContent className="p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {rg.destination}
                        </p>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors line-clamp-2">
                          {rg.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {rg.readTime}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </motion.div>
  );
}
