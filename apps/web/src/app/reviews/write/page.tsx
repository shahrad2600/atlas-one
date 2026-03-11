'use client';

import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Star,
  Search,
  MapPin,
  ChevronRight,
  Upload,
  Camera,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ---------- mock search results ---------- */

const mockSearchResults = [
  { id: 'la-petite-cour', name: 'La Petite Cour', type: 'Restaurant', location: 'Paris, France', rating: 4.5 },
  { id: 'trattoria-romana', name: 'Trattoria Romana', type: 'Restaurant', location: 'Rome, Italy', rating: 4.6 },
  { id: 'grand-hotel-barcelona', name: 'Grand Hotel Barcelona', type: 'Hotel', location: 'Barcelona, Spain', rating: 4.7 },
  { id: 'rome-colosseum-tour', name: 'Colosseum Guided Tour', type: 'Experience', location: 'Rome, Italy', rating: 4.8 },
  { id: 'eiffel-tower', name: 'Eiffel Tower', type: 'Attraction', location: 'Paris, France', rating: 4.7 },
  { id: 'sakura-sushi-bar', name: 'Sakura Sushi Bar', type: 'Restaurant', location: 'Tokyo, Japan', rating: 4.8 },
];

const subRatingCategories: Record<string, string[]> = {
  Restaurant: ['Food', 'Service', 'Value', 'Atmosphere'],
  Hotel: ['Rooms', 'Service', 'Location', 'Cleanliness', 'Value'],
  Experience: ['Guide', 'Value', 'Organization', 'Fun Factor'],
  Attraction: ['Experience', 'Value', 'Accessibility', 'Crowds'],
};

const tripTypes = ['Family', 'Couple', 'Solo', 'Business', 'Friends'];

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const years = ['2026', '2025', '2024'];

/* ---------- star rating component ---------- */

function StarRating({
  value,
  onChange,
  size = 'md',
  label,
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const [hover, setHover] = useState(0);

  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-9 w-9',
  };

  const labels = ['', 'Terrible', 'Poor', 'Average', 'Very Good', 'Excellent'];

  return (
    <div>
      {label && <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</p>}
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => {
          const starValue = i + 1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(starValue)}
              onMouseEnter={() => setHover(starValue)}
              onMouseLeave={() => setHover(0)}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-colors cursor-pointer',
                  (hover || value) >= starValue
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-slate-200 text-slate-200 hover:fill-amber-200 hover:text-amber-200',
                )}
              />
            </button>
          );
        })}
        {(hover || value) > 0 && (
          <span className="ml-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
            {labels[hover || value]}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function WriteReviewPage() {
  const { user, loading: authLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<typeof mockSearchResults[0] | null>(null);

  const [overallRating, setOverallRating] = useState(0);
  const [subRatings, setSubRatings] = useState<Record<string, number>>({});
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visitMonth, setVisitMonth] = useState('March');
  const [visitYear, setVisitYear] = useState('2026');
  const [tripType, setTripType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredResults = searchQuery.length >= 2
    ? mockSearchResults.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.location.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const selectPlace = useCallback((place: typeof mockSearchResults[0]) => {
    setSelectedPlace(place);
    setSearchQuery('');
    setShowResults(false);
    setSubRatings({});
  }, []);

  const updateSubRating = useCallback((key: string, value: number) => {
    setSubRatings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitting(false);
    alert('Review submitted successfully!');
  };

  const isValid = selectedPlace && overallRating > 0 && title.trim().length >= 5 && body.trim().length >= 50 && tripType;

  // Auth guard
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <Star className="mx-auto h-12 w-12 text-amber-400 mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Sign in to Write a Review</h2>
            <p className="text-slate-500 mb-6">
              You need to be signed in to share your experience with the community.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/login">
                <Button>Sign In</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline">Create Account</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
    >
      {/* Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-sky-600">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900">Write a Review</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Write a Review</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Search for place */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-sm font-bold mr-2">1</span>
                Find a Place to Review
              </h2>
            </CardHeader>
            <CardContent>
              {!selectedPlace ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search for a hotel, restaurant, attraction, or experience..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />

                  {/* Dropdown */}
                  {showResults && filteredResults.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                      {filteredResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => selectPlace(result)}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <MapPin className="h-5 w-5 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{result.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{result.type} &middot; {result.location}</p>
                          </div>
                          <div className="flex items-center gap-1 text-sm shrink-0">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-medium">{result.rating}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {showResults && searchQuery.length >= 2 && filteredResults.length === 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      No results found for &ldquo;{searchQuery}&rdquo;
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">{selectedPlace.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{selectedPlace.type} &middot; {selectedPlace.location}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPlace(null)}
                    className="rounded-full p-1 hover:bg-slate-200 transition-colors"
                  >
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Rating */}
          {selectedPlace && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-sm font-bold mr-2">2</span>
                  Rate Your Experience
                </h2>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overall rating */}
                <StarRating
                  value={overallRating}
                  onChange={setOverallRating}
                  size="lg"
                  label="Overall Rating"
                />

                {/* Sub-ratings */}
                {selectedPlace && subRatingCategories[selectedPlace.type] && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Detailed Ratings (optional)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {subRatingCategories[selectedPlace.type].map((category) => (
                        <StarRating
                          key={category}
                          value={subRatings[category] || 0}
                          onChange={(val) => updateSubRating(category, val)}
                          size="sm"
                          label={category}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Write review */}
          {selectedPlace && overallRating > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-sm font-bold mr-2">3</span>
                  Write Your Review
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div>
                  <label htmlFor="review-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Review Title
                  </label>
                  <input
                    id="review-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarize your experience in a few words"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    maxLength={100}
                  />
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{title.length}/100 characters</p>
                </div>

                {/* Body */}
                <div>
                  <label htmlFor="review-body" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Your Review
                  </label>
                  <textarea
                    id="review-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Tell others about your experience. What did you like? What could be improved? Would you recommend it?"
                    rows={6}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y"
                    minLength={50}
                  />
                  <p className={cn('mt-1 text-xs', body.length < 50 ? 'text-amber-500' : 'text-slate-400')}>
                    {body.length}/50 minimum characters {body.length < 50 && `(${50 - body.length} more needed)`}
                  </p>
                </div>

                {/* Visit date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Month of Visit</label>
                    <select
                      value={visitMonth}
                      onChange={(e) => setVisitMonth(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {months.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Year of Visit</label>
                    <select
                      value={visitYear}
                      onChange={(e) => setVisitYear(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Trip type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trip Type</label>
                  <div className="flex flex-wrap gap-2">
                    {tripTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTripType(type)}
                        className={cn(
                          'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                          tripType === type
                            ? 'border-sky-600 bg-sky-50 text-sky-700'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Photos */}
          {selectedPlace && overallRating > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-sm font-bold mr-2">4</span>
                  Add Photos
                  <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">(optional)</span>
                </h2>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 dark:bg-slate-800 p-8 text-center hover:border-sky-400 hover:bg-sky-50/50 transition-colors cursor-pointer">
                  <Camera className="mx-auto h-10 w-10 text-slate-400 mb-3" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">
                    Drag and drop photos here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    JPEG, PNG, or WEBP up to 10MB each. Maximum 10 photos.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" type="button">
                    <Upload className="h-4 w-4 mr-1.5" />
                    Choose Photos
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          {selectedPlace && overallRating > 0 && (
            <div className="flex items-center justify-between gap-4 pt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your review will be posted publicly as <span className="font-medium text-slate-700">{user.displayName}</span>
              </p>
              <Button
                type="submit"
                size="lg"
                disabled={!isValid || submitting}
                loading={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </motion.div>
  );
}
