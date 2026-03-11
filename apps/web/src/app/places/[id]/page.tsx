'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Heart,
  Share2,
  PenLine,
  MapPin,
  Clock,
  Phone,
  Globe,
  ChevronRight,
  ThumbsUp,
  Camera,
  MessageCircle,
  CalendarDays,
  Users,
  DollarSign,
  Check,
  ChevronDown,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ---------- mock data ---------- */

const place = {
  id: 'la-petite-cour',
  name: 'La Petite Cour',
  type: 'restaurant' as const,
  rating: 4.5,
  reviewCount: 1847,
  priceLevel: '$$$',
  address: '8 Rue Mabillon, 75006 Paris, France',
  phone: '+33 1 43 26 52 26',
  website: 'https://lapetitecour.fr',
  categories: ['French', 'European', 'Vegetarian Friendly'],
  description:
    'Nestled in the heart of Saint-Germain-des-Pres, La Petite Cour is a charming Parisian restaurant known for its intimate courtyard dining and refined French cuisine. The menu features seasonal ingredients sourced from local markets, with a focus on traditional French techniques elevated by contemporary flair. The romantic setting, complete with ivy-covered walls and candlelit tables, makes it a favorite among couples and discerning food lovers alike.',
  hours: [
    { day: 'Monday', hours: '12:00 PM - 2:30 PM, 7:00 PM - 10:30 PM' },
    { day: 'Tuesday', hours: '12:00 PM - 2:30 PM, 7:00 PM - 10:30 PM' },
    { day: 'Wednesday', hours: '12:00 PM - 2:30 PM, 7:00 PM - 10:30 PM' },
    { day: 'Thursday', hours: '12:00 PM - 2:30 PM, 7:00 PM - 10:30 PM' },
    { day: 'Friday', hours: '12:00 PM - 2:30 PM, 7:00 PM - 11:00 PM' },
    { day: 'Saturday', hours: '12:00 PM - 3:00 PM, 7:00 PM - 11:00 PM' },
    { day: 'Sunday', hours: 'Closed' },
  ],
  photos: [
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop',
  ],
  ratingBreakdown: { 5: 892, 4: 541, 3: 246, 2: 112, 1: 56 },
};

const reviews = [
  {
    id: 'r1',
    author: 'Sarah M.',
    avatar: null,
    date: '2026-02-15',
    rating: 5,
    title: 'An absolutely magical dining experience',
    text: 'We visited La Petite Cour for our anniversary and it exceeded all expectations. The courtyard setting is truly enchanting, especially in the evening with the soft lighting. We started with the foie gras terrine which was perfectly balanced, followed by the duck confit which was hands-down the best I have ever had. The wine pairing suggested by our sommelier was spot on. Service was attentive without being overbearing. Definitely book in advance as it fills up quickly.',
    helpful: 24,
    tripType: 'Couple',
  },
  {
    id: 'r2',
    author: 'James T.',
    avatar: null,
    date: '2026-01-28',
    rating: 4,
    title: 'Great food, slightly slow service',
    text: 'The food quality is outstanding and the courtyard ambiance is lovely. We had the prix fixe menu which was excellent value. The onion soup was rich and flavorful, and the beef bourguignon melted in your mouth. Only minor complaint was the wait time between courses, but honestly the food was worth it. Would recommend making a reservation.',
    helpful: 18,
    tripType: 'Friends',
  },
  {
    id: 'r3',
    author: 'Yuki K.',
    avatar: null,
    date: '2026-01-10',
    rating: 5,
    title: 'Hidden gem in Saint-Germain',
    text: 'Found this place through a local recommendation and I am so glad I did. The courtyard in winter with the heaters on is cozy and romantic. The mushroom risotto was creamy perfection and the creme brulee to finish was the best I have tasted in Paris. Staff spoke excellent English too which was helpful. A must-visit.',
    helpful: 31,
    tripType: 'Solo',
  },
  {
    id: 'r4',
    author: 'Marco P.',
    avatar: null,
    date: '2025-12-20',
    rating: 4,
    title: 'Lovely atmosphere and solid French cuisine',
    text: 'Came here for a birthday dinner and the staff made it special with a complimentary dessert. The escargot starter was classic and well-prepared. Main courses were generous portions. Prices are reasonable for the area and the quality. The courtyard is the main draw here and it truly is beautiful.',
    helpful: 12,
    tripType: 'Family',
  },
  {
    id: 'r5',
    author: 'Emily R.',
    avatar: null,
    date: '2025-12-05',
    rating: 3,
    title: 'Good but not exceptional',
    text: 'I had high expectations based on reviews but found it a bit overrated. The courtyard is charming for sure, but the food was good rather than great. The steak was cooked well but the sauce was overly rich. Desserts were the highlight. Service was friendly though, and the wine list is impressive.',
    helpful: 8,
    tripType: 'Couple',
  },
];

const questions = [
  {
    id: 'q1',
    question: 'Is there outdoor seating available in winter?',
    askedBy: 'TravellerMike',
    date: '2026-01-15',
    answers: 3,
    topAnswer: {
      text: 'Yes, the courtyard is heated and covered in winter. They have outdoor heaters and blankets available. It is still very cozy even in December.',
      author: 'ParisLocal42',
      helpful: 14,
    },
  },
  {
    id: 'q2',
    question: 'Do they have a kids menu or are they child-friendly?',
    askedBy: 'FamilyTravels',
    date: '2025-12-20',
    answers: 2,
    topAnswer: {
      text: 'They do not have a specific kids menu, but the staff were very accommodating and offered smaller portions of some dishes. My 8 year old loved the pasta dish. I would say it is more suited for an older family dinner rather than young toddlers.',
      author: 'DiningWithKids',
      helpful: 9,
    },
  },
  {
    id: 'q3',
    question: 'What is the dress code?',
    askedBy: 'SmartCasual22',
    date: '2025-11-30',
    answers: 4,
    topAnswer: {
      text: 'Smart casual is perfectly fine. No sneakers or shorts. Most diners were dressed nicely but not overly formal. Think a nice shirt or blouse with trousers.',
      author: 'ParisianDiner',
      helpful: 22,
    },
  },
];

const nearbyPlaces = [
  { id: 'n1', name: 'Cafe de Flore', type: 'Cafe', rating: 4.3, distance: '200m', href: '/places/cafe-de-flore' },
  { id: 'n2', name: 'Le Procope', type: 'French', rating: 4.1, distance: '350m', href: '/places/le-procope' },
  { id: 'n3', name: 'Brasserie Lipp', type: 'French', rating: 4.2, distance: '400m', href: '/places/brasserie-lipp' },
];

const similarPlaces = [
  { id: 's1', name: 'Le Comptoir', type: 'French', rating: 4.4, price: '$$$', href: '/places/le-comptoir' },
  { id: 's2', name: 'Chez Janou', type: 'Bistro', rating: 4.5, price: '$$', href: '/places/chez-janou' },
  { id: 's3', name: 'Bouillon Racine', type: 'Traditional', rating: 4.3, price: '$$', href: '/places/bouillon-racine' },
];

const masonryPhotos = [
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=350&fit=crop',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=450&fit=crop',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=350&fit=crop',
];

/* ---------- tabs ---------- */
const tabs = ['Overview', 'Reviews', 'Q&A', 'Photos'] as const;
type TabId = (typeof tabs)[number];

/* ---------- helpers ---------- */

function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 text-right text-slate-600">{star} star</span>
      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-slate-500 dark:text-slate-400">{count}</span>
    </div>
  );
}

function ReviewCard({
  author,
  date,
  rating,
  title,
  text,
  helpful,
  tripType,
}: {
  author: string;
  date: string;
  rating: number;
  title: string;
  text: string;
  helpful: number;
  tripType: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-semibold text-sm">
              {author[0]}
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">{author}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(date)}</p>
            </div>
          </div>
          <Badge variant="outline" size="sm">{tripType}</Badge>
        </div>

        <div className="mt-3 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'h-4 w-4',
                i < rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200',
              )}
            />
          ))}
        </div>

        <h4 className="mt-2 font-semibold text-slate-900 dark:text-white">{title}</h4>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{text}</p>

        <div className="mt-4 flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-sky-600 transition-colors">
            <ThumbsUp className="h-4 w-4" />
            Helpful ({helpful})
          </button>
          <button className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-sky-600 transition-colors">
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- page ---------- */

export default function PlaceDetailPage() {
  const [activeTab, setActiveTab] = useState<TabId>('Overview');
  const [saved, setSaved] = useState(false);
  const [sortBy, setSortBy] = useState('recent');

  const totalReviews = Object.values(place.ratingBreakdown).reduce((a, b) => a + b, 0);

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
            <Link href="/destinations/paris" className="hover:text-sky-600">Paris</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/restaurants" className="hover:text-sky-600">Restaurants</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900">{place.name}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Photo Gallery */}
        <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-xl overflow-hidden h-[400px]">
          <div className="col-span-2 row-span-2 relative">
            <Image src={place.photos[0]} alt={place.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" unoptimized />
          </div>
          {place.photos.slice(1).map((photo, i) => (
            <div key={i} className="relative">
              <img
                src={photo}
                alt={`${place.name} photo ${i + 2}`}
                className="h-full w-full object-cover"
              />
              {i === 3 && (
                <button className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-semibold text-sm hover:bg-black/60 transition-colors">
                  <Camera className="mr-2 h-5 w-5" />
                  See all photos
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title + Rating */}
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{place.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-5 w-5',
                        i < Math.round(place.rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 text-slate-200',
                      )}
                    />
                  ))}
                  <span className="ml-1 text-lg font-bold text-slate-900 dark:text-white">{place.rating}</span>
                </div>
                <span className="text-slate-500 dark:text-slate-400">({place.reviewCount.toLocaleString()} reviews)</span>
                <span className="text-slate-500 dark:text-slate-400">{place.priceLevel}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {place.categories.map((cat) => (
                  <Badge key={cat} variant="outline" size="sm">
                    {cat}
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                <MapPin className="h-4 w-4 text-slate-400" />
                {place.address}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap gap-3">
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
              <Link href="/reviews/write">
                <Button variant="outline" size="sm">
                  <PenLine className="h-4 w-4 mr-1.5" />
                  Write a Review
                </Button>
              </Link>
            </div>

            {/* Tabs */}
            <div className="mt-6 border-b border-slate-200 dark:border-slate-700">
              <nav className="flex gap-1" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
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

            {/* Overview Tab */}
            {activeTab === 'Overview' && (
              <div className="mt-6 space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">About</h2>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{place.description}</p>
                </div>

                {/* Hours of Operation */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-slate-400" />
                    Hours of Operation
                  </h2>
                  <div className="space-y-2">
                    {place.hours.map((h) => (
                      <div key={h.day} className="flex justify-between text-sm">
                        <span className="font-medium text-slate-700 w-28">{h.day}</span>
                        <span className={h.hours === 'Closed' ? 'text-rose-500' : 'text-slate-600'}>
                          {h.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Contact</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {place.phone}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <a href={place.website} className="text-sky-600 hover:underline" target="_blank" rel="noopener noreferrer">
                        Visit Website
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {place.address}
                    </div>
                  </div>
                </div>

                {/* Map placeholder */}
                <div className="rounded-xl bg-slate-200 h-64 flex items-center justify-center">
                  <div className="text-center text-slate-500 dark:text-slate-400">
                    <MapPin className="mx-auto h-8 w-8 mb-2 text-slate-400" />
                    <p className="text-sm font-medium">Location Map</p>
                    <p className="text-xs text-slate-400 mt-1">{place.address}</p>
                  </div>
                </div>

                {/* Nearby Places */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Nearby Places</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {nearbyPlaces.map((np) => (
                      <Link key={np.id} href={np.href}>
                        <Card className="hover:shadow-md hover:-translate-y-1 transition-all duration-300 p-4">
                          <h4 className="font-medium text-slate-900 dark:text-white">{np.name}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{np.type}</p>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-medium">{np.rating}</span>
                            </div>
                            <span className="text-slate-400">{np.distance}</span>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'Reviews' && (
              <div className="mt-6 space-y-6">
                {/* Rating breakdown */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="text-center sm:text-left shrink-0">
                        <p className="text-5xl font-bold text-slate-900 dark:text-white">{place.rating}</p>
                        <div className="mt-1 flex items-center justify-center sm:justify-start gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                'h-4 w-4',
                                i < Math.round(place.rating) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200',
                              )}
                            />
                          ))}
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{totalReviews.toLocaleString()} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((star) => (
                          <RatingBar
                            key={star}
                            star={star}
                            count={place.ratingBreakdown[star as keyof typeof place.ratingBreakdown]}
                            total={totalReviews}
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sort */}
                <div className="flex items-center justify-between">
                  <Link href="/reviews/write">
                    <Button>
                      <PenLine className="h-4 w-4 mr-1.5" />
                      Write a Review
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="recent">Most Recent</option>
                      <option value="helpful">Most Helpful</option>
                      <option value="highest">Highest Rating</option>
                      <option value="lowest">Lowest Rating</option>
                    </select>
                  </div>
                </div>

                {/* Review cards */}
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} {...review} />
                  ))}
                </div>
              </div>
            )}

            {/* Q&A Tab */}
            {activeTab === 'Q&A' && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Questions & Answers</h2>
                  <Button>
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    Ask a Question
                  </Button>
                </div>

                <div className="space-y-4">
                  {questions.map((q) => (
                    <Card key={q.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                            Q
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 dark:text-white">{q.question}</p>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Asked by {q.askedBy} on {formatDate(q.date)} &middot; {q.answers} answers
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 ml-11 rounded-lg bg-slate-50 dark:bg-slate-800 p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">
                              A
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{q.topAnswer.text}</p>
                              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <span>by {q.topAnswer.author}</span>
                                <button className="flex items-center gap-1 hover:text-sky-600 transition-colors">
                                  <ThumbsUp className="h-3 w-3" />
                                  Helpful ({q.topAnswer.helpful})
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Photos Tab */}
            {activeTab === 'Photos' && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Photos</h2>
                  <Button variant="outline">
                    <Camera className="h-4 w-4 mr-1.5" />
                    Add a Photo
                  </Button>
                </div>

                <div className="columns-2 md:columns-3 gap-3 space-y-3">
                  {masonryPhotos.map((photo, i) => (
                    <div key={i} className="break-inside-avoid overflow-hidden rounded-lg">
                      <img
                        src={photo}
                        alt={`Photo ${i + 1}`}
                        className="w-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            {/* Reservation CTA */}
            <Card className="border-sky-200 bg-sky-50/50">
              <CardContent className="p-5">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {place.type === 'restaurant' ? 'Make a Reservation' : 'Book Now'}
                </h3>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      defaultValue="2026-03-15"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
                      <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option>7:00 PM</option>
                        <option>7:30 PM</option>
                        <option>8:00 PM</option>
                        <option>8:30 PM</option>
                        <option>9:00 PM</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Party size</label>
                      <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option>2 guests</option>
                        <option>3 guests</option>
                        <option>4 guests</option>
                        <option>5 guests</option>
                        <option>6+ guests</option>
                      </select>
                    </div>
                  </div>
                  <Button className="w-full">
                    {place.type === 'restaurant' ? 'Reserve a Table' : 'Check Availability'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Price Range */}
            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Price Range</h3>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">{place.priceLevel} &middot; $25 - $65 per person</span>
                </div>
              </CardContent>
            </Card>

            {/* Similar Places */}
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Similar Restaurants</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {similarPlaces.map((sp) => (
                  <Link key={sp.id} href={sp.href} className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{sp.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{sp.type} &middot; {sp.price}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-medium">{sp.rating}</span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
