'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Globe,
  Lightbulb,
  FileText,
  Plane,
  Building2,
  UtensilsCrossed,
  Users,
  MessageSquarePlus,
  MessageCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';

const forumCategories = [
  {
    id: 'destinations',
    icon: Globe,
    name: 'Destination Forums',
    description: 'Discuss specific destinations, ask locals for tips, and share your experiences from around the world.',
    topicCount: 14823,
    latestPost: { title: 'Hidden gems in Lisbon?', author: 'TravelJane', date: '2026-03-08T10:30:00Z' },
  },
  {
    id: 'tips',
    icon: Lightbulb,
    name: 'Travel Tips',
    description: 'General travel advice, packing tips, budgeting, solo travel guidance, and safety information.',
    topicCount: 8456,
    latestPost: { title: 'Best travel credit cards for 2026', author: 'PointsGuru', date: '2026-03-08T09:15:00Z' },
  },
  {
    id: 'trip-reports',
    icon: FileText,
    name: 'Trip Reports',
    description: 'Share detailed trip reports and itineraries to inspire and help fellow travelers plan their journeys.',
    topicCount: 5234,
    latestPost: { title: '14 days in Japan - full report', author: 'AsiaExplorer', date: '2026-03-07T22:00:00Z' },
  },
  {
    id: 'air-travel',
    icon: Plane,
    name: 'Air Travel',
    description: 'Airlines, airports, seat reviews, delays, frequent flyer programs, and booking strategies.',
    topicCount: 11392,
    latestPost: { title: 'Emirates vs Qatar Business Class', author: 'SkyMiles99', date: '2026-03-08T08:45:00Z' },
  },
  {
    id: 'hotels',
    icon: Building2,
    name: 'Hotels',
    description: 'Hotel reviews, loyalty programs, booking strategies, and accommodation recommendations.',
    topicCount: 9871,
    latestPost: { title: 'Marriott Bonvoy changes - worth it?', author: 'HotelHunter', date: '2026-03-08T07:20:00Z' },
  },
  {
    id: 'food-dining',
    icon: UtensilsCrossed,
    name: 'Food & Dining',
    description: 'Restaurant recommendations, food tours, cooking classes, and culinary travel experiences.',
    topicCount: 6745,
    latestPost: { title: 'Best street food in Bangkok', author: 'FoodieWanderer', date: '2026-03-07T18:30:00Z' },
  },
  {
    id: 'family-travel',
    icon: Users,
    name: 'Family Travel',
    description: 'Travel with kids, family-friendly destinations, tips for traveling with toddlers, teens, and grandparents.',
    topicCount: 4321,
    latestPost: { title: 'Disney World with a 3 year old', author: 'MomOfThree', date: '2026-03-08T06:50:00Z' },
  },
];

const recentDiscussions = [
  {
    id: 'topic-1',
    title: 'Best neighborhoods to stay in Rome?',
    author: 'ItalyDreamer',
    replyCount: 47,
    lastReply: { author: 'RomanLocal', date: '2026-03-08T11:20:00Z' },
    destination: 'Rome, Italy',
    category: 'Destination Forums',
  },
  {
    id: 'topic-2',
    title: 'Is it safe to travel to Colombia right now?',
    author: 'CautiousTraveler',
    replyCount: 32,
    lastReply: { author: 'BogotaGuide', date: '2026-03-08T10:45:00Z' },
    destination: 'Colombia',
    category: 'Travel Tips',
  },
  {
    id: 'topic-3',
    title: 'My 3-week Southeast Asia itinerary',
    author: 'BackpackerKate',
    replyCount: 18,
    lastReply: { author: 'SEAVeteran', date: '2026-03-08T09:30:00Z' },
    destination: 'Southeast Asia',
    category: 'Trip Reports',
  },
  {
    id: 'topic-4',
    title: 'JFK Terminal 1 new lounge - review',
    author: 'NYCFlyer',
    replyCount: 25,
    lastReply: { author: 'LoungeReviewer', date: '2026-03-08T08:15:00Z' },
    destination: 'New York, USA',
    category: 'Air Travel',
  },
  {
    id: 'topic-5',
    title: 'Santorini in October - too late?',
    author: 'GreekIslandFan',
    replyCount: 39,
    lastReply: { author: 'SantoriniExpert', date: '2026-03-08T07:00:00Z' },
    destination: 'Santorini, Greece',
    category: 'Destination Forums',
  },
  {
    id: 'topic-6',
    title: 'Michelin-starred restaurants in Paris under 100 EUR',
    author: 'GourmetTraveler',
    replyCount: 52,
    lastReply: { author: 'ParisianFoodie', date: '2026-03-07T23:45:00Z' },
    destination: 'Paris, France',
    category: 'Food & Dining',
  },
  {
    id: 'topic-7',
    title: 'All-inclusive resorts for family of 5?',
    author: 'BigFamilyTravel',
    replyCount: 28,
    lastReply: { author: 'ResortExpert', date: '2026-03-07T21:30:00Z' },
    destination: 'Caribbean',
    category: 'Family Travel',
  },
  {
    id: 'topic-8',
    title: 'Park Hyatt Tokyo vs Aman Tokyo',
    author: 'LuxuryNomad',
    replyCount: 41,
    lastReply: { author: 'TokyoHotelier', date: '2026-03-07T20:10:00Z' },
    destination: 'Tokyo, Japan',
    category: 'Hotels',
  },
];

export default function ForumsPage() {
  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Travel Forums</h1>
              <p className="mt-2 text-lg text-slate-600">
                Connect with millions of travelers. Ask questions, share experiences, and get expert advice.
              </p>
            </div>
            <Link href="/forums/new">
              <Button size="lg">
                <MessageSquarePlus className="h-5 w-5" />
                Start a Discussion
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Forum Categories */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Forum Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forumCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Link key={category.id} href={`/forums?category=${category.id}`}>
                  <Card className="h-full hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                    <CardContent className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5 h-10 w-10 rounded-lg bg-sky-100 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-sky-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white">{category.name}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{category.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {category.topicCount.toLocaleString()} topics
                        </span>
                        <span className="flex items-center gap-1 truncate ml-2">
                          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{category.latestPost.author}</span>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent Discussions */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Recent Discussions</h2>
          <Card>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentDiscussions.map((topic) => (
                <Link key={topic.id} href={`/forums/${topic.id}`} className="block">
                  <div className="px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={topic.author} size="sm" />
                        <div className="min-w-0">
                          <h3 className="font-medium text-slate-900 dark:text-white truncate">{topic.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500 dark:text-slate-400">{topic.author}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{topic.destination}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />
                          <span>{topic.replyCount}</span>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">Last reply by {topic.lastReply.author}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{formatDate(topic.lastReply.date)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </motion.main>
  );
}
