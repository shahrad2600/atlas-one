'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Camera,
  Map,
  Award,
  Bookmark,
  Heart,
  MessageCircle,
  TrendingUp,
  UserPlus,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Rating } from '@/components/ui/rating';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

type ActivityType = 'review_posted' | 'photo_added' | 'trip_completed' | 'badge_earned' | 'place_saved';

interface ActivityItem {
  id: string;
  type: ActivityType;
  user: { name: string; avatarUrl?: string };
  timestamp: string;
  data: Record<string, unknown>;
}

const activityConfig: Record<ActivityType, { icon: typeof Star; color: string; bgColor: string }> = {
  review_posted: { icon: Star, color: 'text-amber-500', bgColor: 'bg-amber-50' },
  photo_added: { icon: Camera, color: 'text-sky-500', bgColor: 'bg-sky-50' },
  trip_completed: { icon: Map, color: 'text-green-500', bgColor: 'bg-green-50' },
  badge_earned: { icon: Award, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  place_saved: { icon: Bookmark, color: 'text-rose-500', bgColor: 'bg-rose-50' },
};

const mockActivities: ActivityItem[] = [
  {
    id: 'a1',
    type: 'review_posted',
    user: { name: 'Sarah Chen' },
    timestamp: '2026-03-08T10:30:00Z',
    data: {
      placeName: 'Le Cinq, Paris',
      rating: 5,
      snippet: 'An absolutely extraordinary dining experience. The tasting menu was a masterclass in French cuisine...',
    },
  },
  {
    id: 'a2',
    type: 'photo_added',
    user: { name: 'Marco Rossi' },
    timestamp: '2026-03-08T09:15:00Z',
    data: {
      count: 12,
      destination: 'Amalfi Coast, Italy',
    },
  },
  {
    id: 'a3',
    type: 'trip_completed',
    user: { name: 'Emily Tanaka' },
    timestamp: '2026-03-07T22:00:00Z',
    data: {
      tripName: 'Two Weeks in Japan',
      destinations: ['Tokyo', 'Kyoto', 'Osaka', 'Hakone'],
      days: 14,
    },
  },
  {
    id: 'a4',
    type: 'badge_earned',
    user: { name: 'James O\'Brien' },
    timestamp: '2026-03-07T18:45:00Z',
    data: {
      badgeName: 'World Traveler',
      badgeDescription: 'Visited 10+ countries',
    },
  },
  {
    id: 'a5',
    type: 'place_saved',
    user: { name: 'Aisha Patel' },
    timestamp: '2026-03-07T15:30:00Z',
    data: {
      placeName: 'Hotel Negresco, Nice',
      category: 'Hotels',
    },
  },
  {
    id: 'a6',
    type: 'review_posted',
    user: { name: 'David Kim' },
    timestamp: '2026-03-07T12:00:00Z',
    data: {
      placeName: 'Ritz-Carlton, Bali',
      rating: 4,
      snippet: 'Stunning property with incredible views. The infinity pool overlooking the Indian Ocean is unforgettable...',
    },
  },
  {
    id: 'a7',
    type: 'photo_added',
    user: { name: 'Lisa Johansson' },
    timestamp: '2026-03-07T08:20:00Z',
    data: {
      count: 8,
      destination: 'Reykjavik, Iceland',
    },
  },
  {
    id: 'a8',
    type: 'trip_completed',
    user: { name: 'Carlos Mendez' },
    timestamp: '2026-03-06T20:30:00Z',
    data: {
      tripName: 'Patagonia Adventure',
      destinations: ['Buenos Aires', 'El Calafate', 'Torres del Paine'],
      days: 10,
    },
  },
];

const suggestedPeople = [
  { id: 'u1', name: 'Priya Sharma', bio: 'Foodie & hotel reviewer', reviewCount: 156 },
  { id: 'u2', name: 'Thomas Wright', bio: 'Adventure travel blogger', reviewCount: 89 },
  { id: 'u3', name: 'Yuki Nakamura', bio: 'Luxury travel expert', reviewCount: 234 },
];

const trendingDestinations = [
  { name: 'Tulum, Mexico', growth: '+18%' },
  { name: 'Dubrovnik, Croatia', growth: '+15%' },
  { name: 'Kyoto, Japan', growth: '+12%' },
  { name: 'Marrakech, Morocco', growth: '+10%' },
  { name: 'Porto, Portugal', growth: '+9%' },
];

function getActionText(activity: ActivityItem): string {
  switch (activity.type) {
    case 'review_posted':
      return `reviewed ${activity.data.placeName}`;
    case 'photo_added':
      return `added ${activity.data.count} photos from ${activity.data.destination}`;
    case 'trip_completed':
      return `completed the trip "${activity.data.tripName}"`;
    case 'badge_earned':
      return `earned the "${activity.data.badgeName}" badge`;
    case 'place_saved':
      return `saved ${activity.data.placeName} to their list`;
    default:
      return '';
  }
}

export default function ActivityFeedPage() {
  const { user, loading } = useAuth();
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [loadingMore, setLoadingMore] = useState(false);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-sky-600 border-t-transparent rounded-full" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-10">
            <Heart className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Sign In Required</h2>
            <p className="text-slate-600 mb-6">Log in to see activity from travelers you follow.</p>
            <Link href="/login">
              <Button size="lg">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  function handleFollow(userId: string) {
    setFollowingMap((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  function handleLike(activityId: string) {
    setLikedMap((prev) => ({ ...prev, [activityId]: !prev[activityId] }));
  }

  function handleLoadMore() {
    setLoadingMore(true);
    setTimeout(() => setLoadingMore(false), 1500);
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
    >
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Activity Feed</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">See what travelers you follow have been up to</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Feed Column */}
          <div className="flex-1 min-w-0 space-y-4">
            {mockActivities.map((activity) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;
              const liked = likedMap[activity.id] ?? false;

              return (
                <Card key={activity.id}>
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <Link href={`/social/profile/${activity.id}`}>
                        <Avatar name={activity.user.name} size="md" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/social/profile/${activity.id}`} className="font-semibold text-slate-900 dark:text-white hover:text-sky-600 text-sm">
                            {activity.user.name}
                          </Link>
                          <span className="text-sm text-slate-500 dark:text-slate-400">{getActionText(activity)}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDate(activity.timestamp)}</p>

                        {/* Content Preview */}
                        <div className={`mt-3 rounded-lg p-3 ${config.bgColor}`}>
                          {activity.type === 'review_posted' && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Rating value={activity.data.rating as number} />
                              </div>
                              <p className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300">{activity.data.snippet as string}</p>
                            </div>
                          )}
                          {activity.type === 'photo_added' && (
                            <div className="flex gap-2">
                              {Array.from({ length: Math.min(activity.data.count as number, 4) }).map((_, i) => (
                                <div key={i} className="h-16 w-16 rounded-md bg-slate-200 flex items-center justify-center">
                                  <Camera className="h-5 w-5 text-slate-400" />
                                </div>
                              ))}
                              {(activity.data.count as number) > 4 && (
                                <div className="h-16 w-16 rounded-md bg-slate-300 flex items-center justify-center text-sm font-medium text-slate-600">
                                  +{(activity.data.count as number) - 4}
                                </div>
                              )}
                            </div>
                          )}
                          {activity.type === 'trip_completed' && (
                            <div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {(activity.data.days as number)} days
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {(activity.data.destinations as string[]).map((dest) => (
                                  <Badge key={dest} variant="outline" className="text-xs">{dest}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {activity.type === 'badge_earned' && (
                            <div className="flex items-center gap-2">
                              <Award className="h-8 w-8 text-purple-500" />
                              <div>
                                <p className="font-medium text-sm text-slate-900">{activity.data.badgeName as string}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{activity.data.badgeDescription as string}</p>
                              </div>
                            </div>
                          )}
                          {activity.type === 'place_saved' && (
                            <div className="flex items-center gap-2">
                              <Bookmark className="h-5 w-5 text-rose-500" />
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">{activity.data.placeName as string}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{activity.data.category as string}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-3">
                          <button
                            onClick={() => handleLike(activity.id)}
                            className={`flex items-center gap-1 text-sm transition-colors ${
                              liked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                            Like
                          </button>
                          <button className="flex items-center gap-1 text-sm text-slate-400 hover:text-sky-500 transition-colors">
                            <MessageCircle className="h-4 w-4" />
                            Comment
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Load More */}
            <div className="text-center pt-4">
              <Button variant="outline" onClick={handleLoadMore} loading={loadingMore}>
                {loadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block w-80 flex-shrink-0 space-y-6">
            {/* People You Might Know */}
            <Card>
              <CardContent>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-sky-500" />
                  People You Might Know
                </h3>
                <div className="space-y-4">
                  {suggestedPeople.map((person) => (
                    <div key={person.id} className="flex items-center gap-3">
                      <Avatar name={person.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <Link href={`/social/profile/${person.id}`} className="text-sm font-medium text-slate-900 dark:text-white hover:text-sky-600 block truncate">
                          {person.name}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{person.bio}</p>
                      </div>
                      <Button
                        variant={followingMap[person.id] ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => handleFollow(person.id)}
                      >
                        {followingMap[person.id] ? 'Following' : 'Follow'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trending Destinations */}
            <Card>
              <CardContent>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-sky-500" />
                  Trending Destinations
                </h3>
                <div className="space-y-3">
                  {trendingDestinations.map((dest, i) => (
                    <div key={dest.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-400 w-4">{i + 1}</span>
                        <span className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-300">{dest.name}</span>
                      </div>
                      <Badge variant="success" className="text-[10px]">{dest.growth}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Your Stats */}
            <Card>
              <CardContent>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Your Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Followers</span>
                    <span className="font-medium text-slate-900 dark:text-white">128</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Following</span>
                    <span className="font-medium text-slate-900 dark:text-white">67</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Reviews</span>
                    <span className="font-medium text-slate-900 dark:text-white">42</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Countries Visited</span>
                    <span className="font-medium text-slate-900 dark:text-white">14</span>
                  </div>
                </div>
                <Link href="/social/profile/me" className="block mt-3">
                  <Button variant="outline" size="sm" className="w-full">View Profile</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
