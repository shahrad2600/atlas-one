'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatCard } from '@/components/stat-card';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Star,
  MessageCircle,
  CheckCircle,
  ShieldCheck,
  Shield,
  ChevronDown,
  ChevronUp,
  Send,
  Award,
  TrendingUp,
  Filter,
} from 'lucide-react';

/* ---------- Mock Data ---------- */

interface LuxuryReview {
  id: string;
  guest: string;
  overallScore: number;
  dimensions: {
    service: number;
    physical: number;
    dining: number;
    location: number;
    consistency: number;
    emotional: number;
  };
  title: string;
  text: string;
  date: string;
  tripPurpose: 'Leisure' | 'Business' | 'Celebration' | 'Honeymoon' | 'Anniversary';
  verification: 'Confirmed Stay' | 'Verified Booking' | 'Unverified';
  trustScore: number;
  responded: boolean;
  responseText?: string;
  responseDate?: string;
  responseRole?: string;
}

const mockReviews: LuxuryReview[] = [
  {
    id: 'lr1',
    guest: 'Alexander V.',
    overallScore: 97,
    dimensions: { service: 99, physical: 96, dining: 95, location: 98, consistency: 96, emotional: 99 },
    title: 'The most exquisite palace hotel I have experienced in Europe',
    text: 'From the moment our car pulled up to the entrance, every detail was orchestrated with precision and warmth. The butler assigned to our suite anticipated our needs before we could articulate them. The room itself was a masterclass in understated luxury - hand-stitched linens, a curated art collection, and a bathroom that could rival any spa. The Michelin-starred restaurant delivered an unforgettable tasting menu with impeccable wine pairings. This is not merely a hotel stay; it is an experience that redefines what luxury hospitality means.',
    date: '2026-03-17',
    tripPurpose: 'Anniversary',
    verification: 'Confirmed Stay',
    trustScore: 98,
    responded: false,
  },
  {
    id: 'lr2',
    guest: 'Lady Catherine M.',
    overallScore: 95,
    dimensions: { service: 97, physical: 95, dining: 93, location: 98, consistency: 92, emotional: 96 },
    title: 'Impeccable attention to detail',
    text: 'The suite overlooking the Tuileries was breathtaking. Every surface gleamed, every amenity was thoughtfully placed. The staff remembered our preferences from previous visits - a remarkable feat of personalized service. The afternoon tea was among the finest I have enjoyed anywhere. My only minor observation is that the turndown service timing could be slightly more consistent.',
    date: '2026-03-14',
    tripPurpose: 'Leisure',
    verification: 'Confirmed Stay',
    trustScore: 96,
    responded: true,
    responseText: 'Lady Catherine, we are deeply honored by your gracious words. Your continued patronage means the world to our team. We have noted your feedback regarding turndown service timing and have already refined our scheduling. We look forward to welcoming you back.',
    responseDate: '2026-03-15',
    responseRole: 'General Manager',
  },
  {
    id: 'lr3',
    guest: 'Hiroshi T.',
    overallScore: 88,
    dimensions: { service: 92, physical: 90, dining: 94, location: 95, consistency: 80, emotional: 85 },
    title: 'Outstanding concierge and dining, room needs attention',
    text: 'The concierge team was extraordinary - securing last-minute reservations at fully booked restaurants and arranging a private after-hours museum tour. Breakfast could rival any Michelin restaurant. However, the bathroom fixtures in our room showed minor wear, and the air conditioning was inconsistent during our first night. These were addressed promptly when reported, but fell below the standard expected at this price point.',
    date: '2026-03-11',
    tripPurpose: 'Business',
    verification: 'Confirmed Stay',
    trustScore: 94,
    responded: true,
    responseText: 'Mr. Tanaka, thank you for your candid and thoughtful review. Your praise for our concierge and culinary teams is much appreciated. We take your feedback about the room maintenance very seriously. The fixtures in that room have since been replaced, and our engineering team has recalibrated the HVAC system. We hope you will give us the opportunity to exceed your expectations on your next visit.',
    responseDate: '2026-03-12',
    responseRole: 'Guest Relations Director',
  },
  {
    id: 'lr4',
    guest: 'Sofia R.',
    overallScore: 92,
    dimensions: { service: 94, physical: 93, dining: 90, location: 97, consistency: 88, emotional: 93 },
    title: 'A true sanctuary in the heart of Paris',
    text: 'From check-in to departure, this property operates at a level of grace that is increasingly rare in modern hospitality. The spa treatment was world-class, and the indoor pool area provided a serene escape from the bustling city. The location is simply unbeatable. Staff went above and beyond to celebrate my birthday with a surprise in the room.',
    date: '2026-03-08',
    tripPurpose: 'Celebration',
    verification: 'Verified Booking',
    trustScore: 91,
    responded: false,
  },
  {
    id: 'lr5',
    guest: 'James W. III',
    overallScore: 96,
    dimensions: { service: 98, physical: 96, dining: 95, location: 97, consistency: 94, emotional: 97 },
    title: 'Perfection personified',
    text: 'Our honeymoon suite was everything we dreamed of and more. The private terrace with Eiffel Tower views at sunset was magical. The champagne and rose petals on arrival set the tone for an extraordinary five-night stay. Every meal was an event, and the bar team crafted personalized cocktails for us each evening. This hotel understands that luxury is in the details.',
    date: '2026-03-05',
    tripPurpose: 'Honeymoon',
    verification: 'Confirmed Stay',
    trustScore: 97,
    responded: true,
    responseText: 'Mr. and Mrs. Whitfield, congratulations once again on your marriage! It was our absolute pleasure to be a part of your honeymoon celebrations. We are thrilled that the suite and our team met the importance of the occasion. Your kind words about our bar team have been shared with them. Until next time!',
    responseDate: '2026-03-06',
    responseRole: 'Owner',
  },
  {
    id: 'lr6',
    guest: 'Elena K.',
    overallScore: 85,
    dimensions: { service: 88, physical: 86, dining: 82, location: 96, consistency: 79, emotional: 83 },
    title: 'Good but not quite at the top tier',
    text: 'The hotel has a lovely location and the public spaces are stunning. However, compared to other palace hotels in Paris where I have stayed, the dining options felt limited and the breakfast buffet, while good, lacked the wow factor. The room was well-appointed but the bathroom products were generic rather than the bespoke offerings at competing properties.',
    date: '2026-03-02',
    tripPurpose: 'Leisure',
    verification: 'Confirmed Stay',
    trustScore: 93,
    responded: false,
  },
  {
    id: 'lr7',
    guest: 'Prince Ahmad A.',
    overallScore: 94,
    dimensions: { service: 97, physical: 94, dining: 92, location: 97, consistency: 91, emotional: 95 },
    title: 'Exceptional discretion and service caliber',
    text: 'The level of privacy and discretion offered here is paramount. Our security requirements were accommodated seamlessly without disrupting other guests. The Royal Penthouse is magnificent, and the butler service was world-class. The private dining arrangement was flawless. One of the very few hotels that truly understands the needs of high-profile guests.',
    date: '2026-02-25',
    tripPurpose: 'Business',
    verification: 'Confirmed Stay',
    trustScore: 99,
    responded: true,
    responseText: 'Your Highness, we are honored by your trust in our hotel. Discretion and personalized service are the cornerstones of our philosophy. We are delighted that every aspect of your stay met the standards you rightly expect. Our team looks forward to your return.',
    responseDate: '2026-02-26',
    responseRole: 'Owner',
  },
];

const dimensionLabels: Record<string, string> = {
  service: 'Service',
  physical: 'Physical',
  dining: 'Dining',
  location: 'Location',
  consistency: 'Consistency',
  emotional: 'Emotional',
};

/* ---------- Component ---------- */

function ScoreCircle({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' }) {
  const color = score >= 95 ? 'text-emerald-600 dark:text-emerald-400' : score >= 90 ? 'text-amber-600 dark:text-amber-400' : score >= 85 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400';
  const bg = score >= 95 ? 'bg-emerald-50 dark:bg-emerald-900/20' : score >= 90 ? 'bg-amber-50 dark:bg-amber-900/20' : score >= 85 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-red-50 dark:bg-red-900/20';

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold',
      bg, color,
      size === 'sm' ? 'h-8 w-8 text-xs' : 'h-12 w-12 text-base',
    )}>
      {score}
    </div>
  );
}

export default function SupplierReviewsPage() {
  const [verificationFilter, setVerificationFilter] = useState('All');
  const [scoreFilter, setScoreFilter] = useState('All');
  const [purposeFilter, setPurposeFilter] = useState('All');
  const [responseFilter, setResponseFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({});
  const [responseRoles, setResponseRoles] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return mockReviews.filter((r) => {
      if (verificationFilter !== 'All' && r.verification !== verificationFilter) return false;
      if (scoreFilter === '95+' && r.overallScore < 95) return false;
      if (scoreFilter === '90-94' && (r.overallScore < 90 || r.overallScore >= 95)) return false;
      if (scoreFilter === '85-89' && (r.overallScore < 85 || r.overallScore >= 90)) return false;
      if (scoreFilter === '<85' && r.overallScore >= 85) return false;
      if (purposeFilter !== 'All' && r.tripPurpose !== purposeFilter) return false;
      if (responseFilter === 'Responded' && !r.responded) return false;
      if (responseFilter === 'Pending' && r.responded) return false;
      return true;
    });
  }, [verificationFilter, scoreFilter, purposeFilter, responseFilter]);

  // Summary stats
  const avgOverall = (mockReviews.reduce((s, r) => s + r.overallScore, 0) / mockReviews.length).toFixed(1);
  const avgTrust = (mockReviews.reduce((s, r) => s + r.trustScore, 0) / mockReviews.length).toFixed(1);
  const responseRate = Math.round((mockReviews.filter((r) => r.responded).length / mockReviews.length) * 100);
  const pendingCount = mockReviews.filter((r) => !r.responded).length;

  // Avg by dimension
  const dimAvgs = Object.keys(dimensionLabels).reduce((acc, key) => {
    const sum = mockReviews.reduce((s, r) => s + (r.dimensions as Record<string, number>)[key], 0);
    acc[key] = (sum / mockReviews.length).toFixed(1);
    return acc;
  }, {} as Record<string, string>);

  // Trust score distribution
  const trustBuckets = [
    { label: '95-100', count: mockReviews.filter((r) => r.trustScore >= 95).length },
    { label: '90-94', count: mockReviews.filter((r) => r.trustScore >= 90 && r.trustScore < 95).length },
    { label: '85-89', count: mockReviews.filter((r) => r.trustScore >= 85 && r.trustScore < 90).length },
    { label: '<85', count: mockReviews.filter((r) => r.trustScore < 85).length },
  ];

  const handleSubmitResponse = async (reviewId: string) => {
    setSubmitting(reviewId);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(null);
    setResponseTexts((prev) => ({ ...prev, [reviewId]: '' }));
    setExpandedId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reviews Management</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Monitor and respond to luxury reviews</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Star className="h-5 w-5" />} label="Avg Score" value={avgOverall} change={1.8} />
        <StatCard icon={<ShieldCheck className="h-5 w-5" />} label="Avg Trust Score" value={avgTrust} change={0.5} />
        <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Response Rate" value={`${responseRate}%`} change={4.2} />
        <StatCard icon={<MessageCircle className="h-5 w-5" />} label="Pending Responses" value={pendingCount.toString()} change={-2.0} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Avg Scores Per Dimension */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Average Scores by Dimension</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(dimAvgs).map(([key, val]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{dimensionLabels[key]}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{val}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(parseFloat(val) / 100) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                      className={`h-full rounded-full ${
                        parseFloat(val) >= 95 ? 'bg-emerald-500' : parseFloat(val) >= 90 ? 'bg-amber-500' : 'bg-orange-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trust Score Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Trust Score Distribution</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trustBuckets.map((bucket) => {
                const pct = mockReviews.length > 0 ? (bucket.count / mockReviews.length) * 100 : 0;
                return (
                  <div key={bucket.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{bucket.label}</span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{bucket.count} reviews ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full bg-brand-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-400" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Trust scores factor in verification method, reviewer history, and review quality signals.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filters</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Verification' },
                { value: 'Confirmed Stay', label: 'Confirmed Stay' },
                { value: 'Verified Booking', label: 'Verified Booking' },
                { value: 'Unverified', label: 'Unverified' },
              ]}
            />
            <Select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Scores' },
                { value: '95+', label: '95+ (Exceptional)' },
                { value: '90-94', label: '90-94 (Excellent)' },
                { value: '85-89', label: '85-89 (Very Good)' },
                { value: '<85', label: 'Below 85' },
              ]}
            />
            <Select
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Purposes' },
                { value: 'Leisure', label: 'Leisure' },
                { value: 'Business', label: 'Business' },
                { value: 'Celebration', label: 'Celebration' },
                { value: 'Honeymoon', label: 'Honeymoon' },
                { value: 'Anniversary', label: 'Anniversary' },
              ]}
            />
            <Select
              value={responseFilter}
              onChange={(e) => setResponseFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Reviews' },
                { value: 'Responded', label: 'Responded' },
                { value: 'Pending', label: 'Pending Response' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Review List */}
      <div className="space-y-4">
        {filtered.map((review) => {
          const isExpanded = expandedId === review.id;

          return (
            <Card key={review.id}>
              <CardContent className="py-5">
                <div className="flex items-start gap-4">
                  {/* Score */}
                  <div className="flex-shrink-0">
                    <ScoreCircle score={review.overallScore} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{review.guest}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <ShieldCheck className="h-3 w-3" />
                        {review.verification}
                      </span>
                      <Badge variant={review.responded ? 'success' : 'warning'}>
                        {review.responded ? 'Responded' : 'Pending'}
                      </Badge>
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                        'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600',
                      )}>
                        {review.tripPurpose}
                      </span>
                    </div>

                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1.5">{review.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {isExpanded ? review.text : review.text.slice(0, 200) + (review.text.length > 200 ? '...' : '')}
                    </p>

                    {/* Dimension Scores (expanded) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {/* Dimension scores grid */}
                          <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
                            {Object.entries(review.dimensions).map(([key, val]) => (
                              <div key={key} className="text-center">
                                <ScoreCircle score={val} size="sm" />
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">{dimensionLabels[key]}</p>
                              </div>
                            ))}
                          </div>

                          {/* Trust score */}
                          <div className="mt-3 flex items-center gap-2">
                            <Shield className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs text-slate-500 dark:text-slate-400">Trust Score: <span className="font-semibold text-slate-700 dark:text-slate-300">{review.trustScore}</span></span>
                          </div>

                          {/* Existing Response */}
                          {review.responded && review.responseText && (
                            <div className="mt-4 ml-4 pl-4 border-l-2 border-amber-300 dark:border-amber-600">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Response from {review.responseRole}</p>
                                <span className="text-xs text-slate-400">{review.responseDate}</span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{review.responseText}</p>
                            </div>
                          )}

                          {/* Response Form */}
                          {!review.responded && (
                            <div className="mt-4 space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageCircle className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Write Response</span>
                              </div>
                              <div className="w-48">
                                <Select
                                  label="Responding as"
                                  value={responseRoles[review.id] || 'General Manager'}
                                  onChange={(e) => setResponseRoles((prev) => ({ ...prev, [review.id]: e.target.value }))}
                                  options={[
                                    { value: 'Owner', label: 'Owner' },
                                    { value: 'General Manager', label: 'General Manager' },
                                    { value: 'Guest Relations Director', label: 'Guest Relations Director' },
                                  ]}
                                />
                              </div>
                              <Textarea
                                placeholder="Write a thoughtful response..."
                                value={responseTexts[review.id] || ''}
                                onChange={(e) => setResponseTexts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                                rows={4}
                              />
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => handleSubmitResponse(review.id)}
                                  loading={submitting === review.id}
                                  disabled={!responseTexts[review.id]?.trim()}
                                  icon={<Send className="h-3.5 w-3.5" />}
                                >
                                  Submit Response
                                </Button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span>{review.date}</span>
                    </div>
                  </div>

                  {/* Expand */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : review.id)}
                    className="flex-shrink-0 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
              No reviews match your filters.
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
