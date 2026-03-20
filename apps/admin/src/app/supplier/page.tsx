'use client';

import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/stat-card';
import { formatNumber } from '@/lib/utils';
import {
  Eye,
  Bookmark,
  CalendarCheck,
  TrendingUp,
  Crown,
  MapPin,
  Globe,
  Award,
  ShieldCheck,
  Gift,
  Star,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/* ---------- Mock Data ---------- */

const property = {
  name: 'The Langham, Paris',
  type: 'Palace Hotel',
  truthLabel: 'Verified Luxury',
  overallScore: 94.2,
  city: 'Paris',
  country: 'France',
  imageUrl: null,
};

const dimensionScores = [
  { dimension: 'Service Excellence', score: 96, max: 100 },
  { dimension: 'Physical Product', score: 93, max: 100 },
  { dimension: 'Dining & Beverage', score: 91, max: 100 },
  { dimension: 'Location & Access', score: 97, max: 100 },
  { dimension: 'Consistency', score: 89, max: 100 },
  { dimension: 'Emotional Impact', score: 95, max: 100 },
];

const rankings = {
  city: { rank: 3, total: 142, label: 'Paris' },
  country: { rank: 7, total: 890, label: 'France' },
  world: { rank: 42, total: 12450, label: 'World' },
};

const quickStats = {
  views: 18432,
  viewsChange: 14.2,
  saves: 3841,
  savesChange: 8.7,
  bookingRequests: 624,
  bookingRequestsChange: 11.3,
  conversions: 187,
  conversionsChange: 6.1,
};

const recentReviews = [
  {
    id: 'r1',
    guest: 'Alexander V.',
    rating: 97,
    snippet: 'The most exquisite palace hotel I have experienced in Europe. Service is otherworldly.',
    date: '2026-03-17',
    responded: false,
    verification: 'Confirmed Stay',
  },
  {
    id: 'r2',
    guest: 'Lady Catherine M.',
    rating: 95,
    snippet: 'Impeccable attention to detail. The suite overlooking the Tuileries was breathtaking.',
    date: '2026-03-14',
    responded: true,
    verification: 'Confirmed Stay',
  },
  {
    id: 'r3',
    guest: 'Hiroshi T.',
    rating: 88,
    snippet: 'Wonderful property with outstanding concierge. Breakfast could rival any Michelin restaurant.',
    date: '2026-03-11',
    responded: true,
    verification: 'Confirmed Stay',
  },
  {
    id: 'r4',
    guest: 'Sofia R.',
    rating: 92,
    snippet: 'A true sanctuary in the heart of Paris. The spa is world-class.',
    date: '2026-03-08',
    responded: false,
    verification: 'Verified Booking',
  },
];

const activePerks = [
  { id: 'p1', type: 'Upgrade', description: 'Complimentary room upgrade (subject to availability)', active: true },
  { id: 'p2', type: 'Breakfast', description: 'Full breakfast for two daily at Le Jardin', active: true },
  { id: 'p3', type: 'Credit', description: '$100 hotel credit per stay', active: true },
  { id: 'p4', type: 'Late Checkout', description: 'Guaranteed 4PM late checkout', active: true },
  { id: 'p5', type: 'Welcome', description: 'Champagne & macarons welcome amenity', active: true },
];

const perkTypeColors: Record<string, string> = {
  Upgrade: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-300',
  Breakfast: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300',
  Credit: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Late Checkout': 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300',
  Welcome: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-300',
};

/* ---------- Component ---------- */

export default function SupplierDashboardPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Property Profile Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-8 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="flex-shrink-0 h-20 w-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                <Crown className="h-10 w-10 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">{property.name}</h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-inset ring-amber-400/30">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {property.truthLabel}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-amber-400" />
                    {property.type}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {property.city}, {property.country}
                  </span>
                </div>
              </div>
            </div>

            {/* Luxury Standard Score */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="relative">
                  <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#334155" strokeWidth="6" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke="url(#score-gradient)" strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${(property.overallScore / 100) * 264} 264`}
                    />
                    <defs>
                      <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{property.overallScore}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-medium">Luxury Score</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Score Dimensions */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Dimension Scores</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            {dimensionScores.map((d) => (
              <div key={d.dimension}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{d.dimension}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{d.score}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.score / d.max) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`h-full rounded-full ${
                      d.score >= 95
                        ? 'bg-emerald-500'
                        : d.score >= 90
                        ? 'bg-amber-500'
                        : 'bg-orange-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(rankings).map(([scope, data]) => (
          <Card key={scope} className="relative overflow-hidden">
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {data.label}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">#{data.rank}</span>
                    <span className="text-sm text-slate-400">/ {formatNumber(data.total)}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  {scope === 'city' && <MapPin className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
                  {scope === 'country' && <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
                  {scope === 'world' && <Globe className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={fadeUp}>
          <StatCard icon={<Eye className="h-5 w-5" />} label="Views (30d)" value={formatNumber(quickStats.views)} change={quickStats.viewsChange} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard icon={<Bookmark className="h-5 w-5" />} label="Saves (30d)" value={formatNumber(quickStats.saves)} change={quickStats.savesChange} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard icon={<CalendarCheck className="h-5 w-5" />} label="Booking Requests" value={formatNumber(quickStats.bookingRequests)} change={quickStats.bookingRequestsChange} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Conversions" value={formatNumber(quickStats.conversions)} change={quickStats.conversionsChange} />
        </motion.div>
      </motion.div>

      {/* Recent Reviews + Active Perks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent Reviews</h3>
            <Link href="/supplier/reviews" className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {recentReviews.map((review) => (
                <div key={review.id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{review.guest}</span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {review.rating}
                        </span>
                        <Badge variant={review.responded ? 'success' : 'warning'}>
                          {review.responded ? 'Responded' : 'Awaiting'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{review.snippet}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-slate-400">{review.date}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <ShieldCheck className="h-3 w-3" />
                          {review.verification}
                        </span>
                      </div>
                    </div>
                    {!review.responded && (
                      <Link href="/supplier/reviews">
                        <span className="flex-shrink-0 p-1.5 rounded-md text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/20 transition-colors">
                          <MessageCircle className="h-4 w-4" />
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Perks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Active Perks</h3>
            <Link href="/supplier/perks" className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Manage perks
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {activePerks.map((perk) => (
                <div key={perk.id} className="px-6 py-4 flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Gift className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          perkTypeColors[perk.type] || 'bg-slate-50 text-slate-700 ring-slate-200'
                        }`}
                      >
                        {perk.type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{perk.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
