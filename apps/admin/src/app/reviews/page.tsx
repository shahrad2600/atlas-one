'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StatCard } from '@/components/stat-card';
import { formatDate, truncate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Star, MessageCircle, CheckCircle, ChevronDown, ChevronUp, Send } from 'lucide-react';

interface Review {
  id: string;
  guestName: string;
  guestAvatar?: string;
  rating: number;
  title: string;
  text: string;
  date: string;
  listingName: string;
  response?: string;
  responseDate?: string;
}

const mockReviews: Review[] = [
  {
    id: 'rev_001',
    guestName: 'Jennifer L.',
    rating: 5,
    title: 'Absolutely stunning hotel!',
    text: 'We had the most wonderful stay at the Grand Plaza. The rooms were impeccably clean, the staff went above and beyond to make us feel welcome, and the rooftop pool had the most breathtaking views of Central Park. The concierge helped us book restaurant reservations and theater tickets with ease. Will definitely be returning!',
    date: '2026-03-07T16:42:00Z',
    listingName: 'Grand Plaza Hotel',
  },
  {
    id: 'rev_002',
    guestName: 'Michael T.',
    rating: 4,
    title: 'Great location, minor issues',
    text: 'The hotel is in a perfect location for exploring Manhattan. The room was spacious and well-appointed. My only complaint was that the air conditioning was a bit noisy at night. The breakfast buffet was excellent though, and the staff were very friendly.',
    date: '2026-03-05T10:15:00Z',
    listingName: 'Grand Plaza Hotel',
    response: 'Thank you for your feedback, Michael! We\'re glad you enjoyed your stay and the breakfast. We\'ve noted your concern about the AC and our maintenance team is already addressing it. We hope to welcome you back soon!',
    responseDate: '2026-03-05T14:30:00Z',
  },
  {
    id: 'rev_003',
    guestName: 'Sarah K.',
    rating: 5,
    title: 'Best rooftop bar in NYC',
    text: 'The Skyline Rooftop Bar is hands down the best cocktail experience in the city. The mixologists are incredibly talented, the ambiance is sophisticated yet relaxed, and the views are unmatched. The truffle fries were to die for!',
    date: '2026-03-04T20:00:00Z',
    listingName: 'Skyline Rooftop Bar',
    response: 'What a lovely review, Sarah! We\'re thrilled you enjoyed our cocktails and those truffle fries. Our team works hard to create a special atmosphere, and it\'s wonderful to hear it resonated with you. See you again soon!',
    responseDate: '2026-03-04T22:15:00Z',
  },
  {
    id: 'rev_004',
    guestName: 'David R.',
    rating: 3,
    title: 'Good but overpriced',
    text: 'The walking tour was informative and our guide was knowledgeable, but I felt the price point was too high for what was offered. The tour lasted about 2 hours, which was shorter than expected. The route through Central Park was lovely though.',
    date: '2026-03-03T12:30:00Z',
    listingName: 'Central Park Walking Tour',
  },
  {
    id: 'rev_005',
    guestName: 'Emily W.',
    rating: 2,
    title: 'Disappointing experience',
    text: 'Unfortunately our stay did not meet expectations. The room had not been properly cleaned when we arrived, and it took over an hour for housekeeping to address the issue. The front desk staff were apologetic but the overall experience left us disappointed.',
    date: '2026-03-01T09:00:00Z',
    listingName: 'Grand Plaza Hotel',
    response: 'We sincerely apologize for this experience, Emily. This is not the standard we hold ourselves to. Our General Manager would like to discuss this with you personally and make things right. Please contact us at your convenience.',
    responseDate: '2026-03-01T11:00:00Z',
  },
  {
    id: 'rev_006',
    guestName: 'Alex M.',
    rating: 4,
    title: 'Lovely bistro with great pasta',
    text: 'The Olive Garden Bistro surprised us with its authentic Italian flavors. The homemade pasta was outstanding and the tiramisu was the best I\'ve had outside of Italy. Service was attentive but the wait time for a table was longer than quoted.',
    date: '2026-02-28T19:45:00Z',
    listingName: 'The Olive Garden Bistro',
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={cn('text-lg', star <= rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600')}
        >
          &#9733;
        </span>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [ratingFilter, setRatingFilter] = useState('All');
  const [responseFilter, setResponseFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return mockReviews.filter((r) => {
      const matchRating = ratingFilter === 'All' || r.rating === parseInt(ratingFilter);
      const matchResponse =
        responseFilter === 'All' ||
        (responseFilter === 'Responded' && r.response) ||
        (responseFilter === 'Pending' && !r.response);
      return matchRating && matchResponse;
    });
  }, [ratingFilter, responseFilter]);

  const avgRating = (mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length).toFixed(1);
  const totalReviews = mockReviews.length;
  const responseRate = Math.round((mockReviews.filter((r) => r.response).length / mockReviews.length) * 100);

  const handleSubmitResponse = async (reviewId: string) => {
    setSubmitting(reviewId);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitting(null);
    setResponseTexts((prev) => ({ ...prev, [reviewId]: '' }));
    setExpandedId(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reviews</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage and respond to guest reviews</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Average Rating"
          value={avgRating}
          change={0.3}
        />
        <StatCard
          icon={<MessageCircle className="h-5 w-5" />}
          label="Total Reviews"
          value={totalReviews.toString()}
          change={5.1}
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Response Rate"
          value={`${responseRate}%`}
          change={2.4}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-44">
              <Select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                options={[
                  { value: 'All', label: 'All Ratings' },
                  { value: '5', label: '5 Stars' },
                  { value: '4', label: '4 Stars' },
                  { value: '3', label: '3 Stars' },
                  { value: '2', label: '2 Stars' },
                  { value: '1', label: '1 Star' },
                ]}
              />
            </div>
            <div className="w-full sm:w-44">
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
          </div>
        </CardContent>
      </Card>

      {/* Review List */}
      <div className="space-y-4">
        {filtered.map((review) => {
          const isExpanded = expandedId === review.id;
          return (
            <Card key={review.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0 h-10 w-10 bg-brand-100 dark:bg-brand-900/40 rounded-full flex items-center justify-center text-sm font-semibold text-brand-700 dark:text-brand-300">
                      {review.guestName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-slate-900 dark:text-slate-100">{review.guestName}</span>
                        <StarRating rating={review.rating} />
                        <Badge variant={review.response ? 'success' : 'warning'}>
                          {review.response ? 'Responded' : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">{review.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                        {isExpanded ? review.text : truncate(review.text, 180)}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{formatDate(review.date)}</span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span>{review.listingName}</span>
                      </div>

                      {/* Existing Response */}
                      {review.response && isExpanded && (
                        <div className="mt-4 ml-4 pl-4 border-l-2 border-brand-200 dark:border-brand-700">
                          <p className="text-xs font-semibold text-brand-700 dark:text-brand-400 mb-1">Your Response</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{review.response}</p>
                          {review.responseDate && (
                            <p className="text-xs text-slate-400 mt-1">{formatDate(review.responseDate)}</p>
                          )}
                        </div>
                      )}

                      {/* Response Form */}
                      {isExpanded && !review.response && (
                        <div className="mt-4 space-y-3">
                          <Textarea
                            placeholder="Write your response..."
                            value={responseTexts[review.id] || ''}
                            onChange={(e) =>
                              setResponseTexts((prev) => ({ ...prev, [review.id]: e.target.value }))
                            }
                            rows={3}
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
                    </div>
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : review.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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
