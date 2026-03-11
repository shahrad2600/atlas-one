'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Heart,
  Share2,
  MapPin,
  Clock,
  Users,
  ChevronRight,
  Check,
  X,
  ThumbsUp,
  Camera,
  Calendar,
  Shield,
  Zap,
  Globe,
  Info,
  CircleDot,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ---------- mock data ---------- */

const experience = {
  id: 'rome-colosseum-tour',
  name: 'Colosseum, Roman Forum & Palatine Hill Guided Tour',
  rating: 4.8,
  reviewCount: 12540,
  category: 'Tours',
  location: 'Rome, Italy',
  duration: '3 hours',
  maxGroupSize: 25,
  languages: ['English', 'Spanish', 'French', 'Italian'],
  price: 59,
  description:
    'Step back in time with this immersive guided tour of ancient Rome\'s most iconic landmarks. Your expert archaeologist guide will bring history to life as you explore the mighty Colosseum, the political heart of the Roman Forum, and the imperial residences of the Palatine Hill. With skip-the-line access, you will bypass the long queues and spend more time exploring. Learn about gladiatorial combat, Roman engineering marvels, and the daily life of ancient Romans through vivid storytelling and fascinating historical details.',
  photos: [
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=500&fit=crop',
    'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1529260830199-42c24126f198?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=400&h=300&fit=crop',
  ],
  highlights: [
    'Skip-the-line access to the Colosseum',
    'Expert archaeologist guide with deep historical knowledge',
    'Explore the Roman Forum and Palatine Hill',
    'Small group size for a personalized experience',
    'Learn about gladiators, emperors, and daily Roman life',
    'See the Arch of Titus and Temple of Vesta',
  ],
  included: [
    'Skip-the-line entrance tickets to Colosseum, Forum & Palatine',
    'Licensed English-speaking archaeologist guide',
    'Headsets for groups over 10 people',
    'Small group experience (max 25)',
  ],
  excluded: [
    'Hotel pickup and drop-off',
    'Food and drinks',
    'Tips for the guide',
    'Underground and arena floor access (available as upgrade)',
  ],
  meetingPoint: 'Piazza del Colosseo, next to the Arch of Constantine. Look for the guide holding an Atlas One sign.',
  itinerary: [
    {
      time: '9:00 AM',
      title: 'Meet at the Colosseum',
      description: 'Gather at the meeting point near the Arch of Constantine. Your guide will provide an introduction to ancient Rome before entering.',
    },
    {
      time: '9:15 AM',
      title: 'Enter the Colosseum (Skip the Line)',
      description: 'Walk past the queues with priority access. Explore the first and second tiers of the amphitheater while your guide explains the history of gladiatorial combat and the engineering feats that made this structure possible.',
    },
    {
      time: '10:00 AM',
      title: 'Roman Forum',
      description: 'Walk through the ruins of ancient Rome\'s political center. See the Temple of Saturn, the Arch of Septimius Severus, the Curia (Senate house), and the Via Sacra where triumphal processions once marched.',
    },
    {
      time: '10:45 AM',
      title: 'Palatine Hill',
      description: 'Climb the Palatine Hill to see the ruins of imperial palaces and enjoy panoramic views over the Forum and Circus Maximus. Learn about the emperors who lived here and the origins of Rome itself.',
    },
    {
      time: '11:45 AM',
      title: 'Tour Conclusion',
      description: 'The tour ends on the Palatine Hill. You are free to continue exploring the archaeological area at your own pace as your ticket is valid for the entire day.',
    },
  ],
  ratingBreakdown: { 5: 8140, 4: 2890, 3: 1010, 2: 350, 1: 150 },
};

const reviews = [
  {
    id: 'r1',
    author: 'Jessica W.',
    date: '2026-03-01',
    rating: 5,
    title: 'Best tour we took in Rome',
    text: 'Our guide Alessandro was phenomenal. His passion for Roman history was infectious and he made the ancient ruins come alive with his stories. The skip-the-line access was invaluable as the regular queue was incredibly long. The three hours flew by. Highly recommend this for anyone visiting Rome.',
    helpful: 67,
    tripType: 'Couple',
  },
  {
    id: 'r2',
    author: 'Robert P.',
    date: '2026-02-18',
    rating: 5,
    title: 'Worth every penny for the skip-the-line alone',
    text: 'We arrived to see a queue that wrapped around the Colosseum and walked right past it. Our guide Maria was incredibly knowledgeable and engaging. She covered so much detail about the Forum that I never would have appreciated otherwise. The headsets made it easy to hear even in the crowded areas.',
    helpful: 52,
    tripType: 'Family',
  },
  {
    id: 'r3',
    author: 'Hannah L.',
    date: '2026-02-05',
    rating: 4,
    title: 'Great tour, slightly large group',
    text: 'The content and guide were excellent. My only minor complaint is that our group was at the maximum of 25 people which made it a bit crowded at certain points inside the Colosseum. That said, the headsets helped and the guide managed the group well. The Palatine Hill views were stunning.',
    helpful: 28,
    tripType: 'Solo',
  },
];

/* ---------- tabs ---------- */
const tabOptions = ['Overview', 'Itinerary', 'Reviews', 'Policies'] as const;
type TabId = (typeof tabOptions)[number];

/* ---------- helpers ---------- */
function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 text-right text-slate-600">{star} star</span>
      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-slate-500 dark:text-slate-400">{count}</span>
    </div>
  );
}

/* ---------- page ---------- */

export default function ExperienceDetailPage() {
  const [activeTab, setActiveTab] = useState<TabId>('Overview');
  const [saved, setSaved] = useState(false);
  const [selectedDate, setSelectedDate] = useState('2026-03-20');

  const totalReviews = Object.values(experience.ratingBreakdown).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-sky-600">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/experiences" className="hover:text-sky-600">Experiences</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/destinations/rome" className="hover:text-sky-600">Rome</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900 truncate">{experience.name}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Photo Gallery */}
        <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-xl overflow-hidden h-[400px]">
          <div className="col-span-2 row-span-2 relative">
            <Image src={experience.photos[0]} alt={experience.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
          </div>
          {experience.photos.slice(1).map((photo, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={photo} alt={`Photo ${i + 2}`} fill className="object-cover" sizes="25vw" unoptimized />
              {i === 3 && (
                <button className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-semibold text-sm">
                  <Camera className="mr-2 h-5 w-5" />
                  See all photos
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col lg:flex-row gap-8">
          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div>
              <Badge variant="default" size="sm" className="mb-2">{experience.category}</Badge>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{experience.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('h-5 w-5', i < Math.round(experience.rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')} />
                  ))}
                  <span className="ml-1 text-lg font-bold">{experience.rating}</span>
                  <span className="text-slate-500 ml-1">({experience.reviewCount.toLocaleString()} reviews)</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  {experience.duration}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  {experience.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-400" />
                  Max {experience.maxGroupSize} people
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-slate-400" />
                  {experience.languages.join(', ')}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant={saved ? 'default' : 'outline'} size="sm" onClick={() => setSaved(!saved)}>
                <Heart className={cn('h-4 w-4 mr-1.5', saved && 'fill-current')} />
                {saved ? 'Saved' : 'Save'}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-1.5" />
                Share
              </Button>
            </div>

            {/* Highlights */}
            <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-5">
              <h3 className="font-semibold text-emerald-800 mb-3">Tour Highlights</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {experience.highlights.map((h) => (
                  <div key={h} className="flex items-start gap-2 text-sm text-emerald-700">
                    <Check className="h-4 w-4 mt-0.5 shrink-0" />
                    {h}
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 border-b border-slate-200 dark:border-slate-700">
              <nav className="flex gap-1 overflow-x-auto">
                {tabOptions.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                      activeTab === tab
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* Overview */}
            {activeTab === 'Overview' && (
              <div className="mt-6 space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">About This Experience</h2>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{experience.description}</p>
                </div>

                {/* What's Included / Excluded */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <Check className="h-5 w-5 text-emerald-500" />
                      What&apos;s Included
                    </h3>
                    <ul className="space-y-2">
                      {experience.included.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <X className="h-5 w-5 text-rose-500" />
                      Not Included
                    </h3>
                    <ul className="space-y-2">
                      {experience.excluded.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <X className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Meeting Point */}
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-slate-400" />
                    Meeting Point
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{experience.meetingPoint}</p>
                  <div className="mt-3 rounded-xl bg-slate-200 h-48 flex items-center justify-center">
                    <div className="text-center text-slate-500 dark:text-slate-400">
                      <MapPin className="mx-auto h-8 w-8 mb-2 text-slate-400" />
                      <p className="text-sm font-medium">Meeting Point Map</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Itinerary */}
            {activeTab === 'Itinerary' && (
              <div className="mt-6 space-y-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Tour Itinerary</h2>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-sky-200" />

                  <div className="space-y-6">
                    {experience.itinerary.map((stop, idx) => (
                      <div key={idx} className="relative flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white text-sm font-bold z-10">
                            {idx + 1}
                          </div>
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                              {stop.time}
                            </span>
                          </div>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{stop.title}</h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{stop.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Reviews */}
            {activeTab === 'Reviews' && (
              <div className="mt-6 space-y-6">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="text-center sm:text-left shrink-0">
                        <p className="text-5xl font-bold text-slate-900 dark:text-white">{experience.rating}</p>
                        <div className="mt-1 flex items-center justify-center sm:justify-start gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn('h-4 w-4', i < Math.round(experience.rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')} />
                          ))}
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{totalReviews.toLocaleString()} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((star) => (
                          <RatingBar key={star} star={star} count={experience.ratingBreakdown[star as keyof typeof experience.ratingBreakdown]} total={totalReviews} />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-semibold text-sm">
                              {review.author[0]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{review.author}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(review.date)}</p>
                            </div>
                          </div>
                          <Badge variant="outline" size="sm">{review.tripType}</Badge>
                        </div>
                        <div className="mt-3 flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={cn('h-4 w-4', i < review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200')} />
                          ))}
                        </div>
                        <h4 className="mt-2 font-semibold text-slate-900 dark:text-white">{review.title}</h4>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{review.text}</p>
                        <div className="mt-4">
                          <button className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-sky-600 transition-colors">
                            <ThumbsUp className="h-4 w-4" />
                            Helpful ({review.helpful})
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Policies */}
            {activeTab === 'Policies' && (
              <div className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cancellation Policy</h2>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">Free cancellation up to 24 hours before the start time for a full refund.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">If you cancel less than 24 hours before the start time, the amount paid will not be refunded.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <X className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-slate-600 dark:text-slate-400">No-shows will not be refunded.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Additional Information</h2>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-start gap-3">
                      <CircleDot className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <p>Confirmation will be received at time of booking.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CircleDot className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <p>Not wheelchair accessible. The route includes stairs and uneven terrain.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CircleDot className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <p>Comfortable walking shoes are recommended.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CircleDot className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <p>Bring water, sunscreen, and a hat in summer months.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CircleDot className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <p>This tour operates rain or shine. In case of extreme weather, you will be offered an alternative date or full refund.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            <Card className="border-sky-200 sticky top-24">
              <CardContent className="p-5">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-sm text-slate-500 dark:text-slate-400">From</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(experience.price)}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">per person</span>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Select Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Number of Travelers</label>
                    <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
                      <option>1 Traveler</option>
                      <option>2 Travelers</option>
                      <option>3 Travelers</option>
                      <option>4 Travelers</option>
                      <option>5+ Travelers</option>
                    </select>
                  </div>

                  <Button className="w-full" size="lg">Book Now</Button>

                  <div className="flex items-center gap-2 justify-center text-xs text-slate-500 dark:text-slate-400">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Instant Confirmation
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    Free cancellation up to 24 hours
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Clock className="h-4 w-4 text-slate-400" />
                    Duration: {experience.duration}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Users className="h-4 w-4 text-slate-400" />
                    Max group: {experience.maxGroupSize} people
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Globe className="h-4 w-4 text-slate-400" />
                    {experience.languages.join(', ')}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
