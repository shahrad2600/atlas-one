'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Star,
  Camera,
  MessageSquare,
  ThumbsUp,
  Trophy,
  Lock,
  Clock,
  Gift,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Target,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabGroup, TabList, Tab, TabPanel } from '@/components/ui/tabs';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const contributorLevels = [
  { level: 1, name: 'New Traveler', minPoints: 0 },
  { level: 2, name: 'Explorer', minPoints: 500 },
  { level: 3, name: 'Adventurer', minPoints: 2000 },
  { level: 4, name: 'Pathfinder', minPoints: 5000 },
  { level: 5, name: 'Globetrotter', minPoints: 10000 },
  { level: 6, name: 'Destination Expert', minPoints: 25000 },
];

const mockUser = {
  tripCashBalance: 247.50,
  contributorLevel: 3,
  contributorPoints: 3450,
  stats: {
    reviewsWritten: 42,
    photosUploaded: 186,
    forumPosts: 23,
    helpfulVotes: 312,
  },
};

const currentLevelInfo = contributorLevels[mockUser.contributorLevel - 1];
const nextLevelInfo = contributorLevels[mockUser.contributorLevel];
const progressToNext = nextLevelInfo
  ? ((mockUser.contributorPoints - currentLevelInfo.minPoints) /
      (nextLevelInfo.minPoints - currentLevelInfo.minPoints)) * 100
  : 100;

const badges = [
  { id: 'first-review', name: 'First Review', description: 'Wrote your first review', icon: Star, earned: true, earnedDate: '2024-08-15' },
  { id: 'photo-enthusiast', name: 'Photo Enthusiast', description: 'Uploaded 100+ photos', icon: Camera, earned: true, earnedDate: '2025-06-20' },
  { id: 'helpful-reviewer', name: 'Helpful Reviewer', description: 'Received 100+ helpful votes', icon: ThumbsUp, earned: true, earnedDate: '2025-09-01' },
  { id: 'forum-contributor', name: 'Forum Contributor', description: 'Posted 20+ forum discussions', icon: MessageSquare, earned: true, earnedDate: '2025-11-10' },
  { id: 'world-traveler', name: 'World Traveler', description: 'Visited 10+ countries', icon: Trophy, earned: true, earnedDate: '2026-01-05' },
  { id: 'top-reviewer', name: 'Top Reviewer', description: 'Wrote 50+ reviews', icon: Award, earned: false, progress: 84 },
  { id: 'photo-master', name: 'Photo Master', description: 'Uploaded 500+ photos', icon: Camera, earned: false, progress: 37 },
  { id: 'expert-guide', name: 'Expert Guide', description: 'Became a destination expert', icon: Star, earned: false, progress: 15 },
  { id: 'social-butterfly', name: 'Social Butterfly', description: 'Gained 50+ followers', icon: TrendingUp, earned: false, progress: 60 },
  { id: 'globe-master', name: 'Globe Master', description: 'Visited 25+ countries', icon: Trophy, earned: false, progress: 44 },
  { id: 'dining-critic', name: 'Dining Critic', description: 'Reviewed 20+ restaurants', icon: Star, earned: false, progress: 70 },
  { id: 'early-adopter', name: 'Early Adopter', description: 'Joined Atlas One in its first year', icon: Gift, earned: true, earnedDate: '2024-06-01' },
];

const achievements = [
  { id: 'a1', name: 'Review Streak: 7 Days', description: 'Write a review every day for 7 days straight', icon: Star, completed: true },
  { id: 'a2', name: 'Continental Explorer', description: 'Visit at least 3 different continents', icon: Trophy, completed: true },
  { id: 'a3', name: 'Foodie Explorer', description: 'Review restaurants in 5 different countries', icon: Award, completed: true },
  { id: 'a4', name: 'Photo Story Teller', description: 'Create a trip with 50+ photos', icon: Camera, completed: false },
  { id: 'a5', name: 'Community Leader', description: 'Have a forum post with 100+ replies', icon: MessageSquare, completed: false },
  { id: 'a6', name: 'Luxury Connoisseur', description: 'Review 5 five-star hotels', icon: Star, completed: false },
];

const challenges = [
  { id: 'c1', name: 'Spring Review Sprint', description: 'Write 5 reviews in March 2026', progress: 60, reward: 25, daysRemaining: 23 },
  { id: 'c2', name: 'Photo Challenge', description: 'Upload 20 photos from your last trip', progress: 35, reward: 15, daysRemaining: 14 },
  { id: 'c3', name: 'Forum Helper', description: 'Reply to 10 forum topics with helpful advice', progress: 80, reward: 20, daysRemaining: 30 },
];

const history = [
  { id: 'h1', type: 'earned' as const, amount: 5.00, description: 'Review: Hotel Amalfi, Positano', date: '2026-03-06' },
  { id: 'h2', type: 'earned' as const, amount: 2.50, description: 'Photo upload bonus (10 photos)', date: '2026-03-04' },
  { id: 'h3', type: 'redeemed' as const, amount: -25.00, description: 'Redeemed on hotel booking #ATL-4521', date: '2026-03-01' },
  { id: 'h4', type: 'earned' as const, amount: 25.00, description: 'Referral bonus: Sarah M. joined', date: '2026-02-25' },
  { id: 'h5', type: 'earned' as const, amount: 10.00, description: 'Challenge completed: Winter Reviewer', date: '2026-02-20' },
  { id: 'h6', type: 'earned' as const, amount: 5.00, description: 'Review: Trattoria da Mario, Rome', date: '2026-02-18' },
  { id: 'h7', type: 'redeemed' as const, amount: -50.00, description: 'Redeemed on flight booking #ATL-3987', date: '2026-02-15' },
  { id: 'h8', type: 'earned' as const, amount: 15.00, description: 'Level up bonus: Adventurer (Level 3)', date: '2026-02-10' },
];

export default function LoyaltyPage() {
  const { user, loading } = useAuth();

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
            <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Sign In Required</h2>
            <p className="text-slate-600 mb-6">Log in to access your loyalty dashboard and Trip Cash balance.</p>
            <Link href="/login">
              <Button size="lg">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-bold">Loyalty Dashboard</h1>
          <p className="mt-1 text-sky-100">Track your rewards, badges, and travel contributions</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Hero Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Trip Cash */}
          <Card className="overflow-hidden">
            <CardContent className="py-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Trip Cash Balance</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(mockUser.tripCashBalance)}</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Use Trip Cash on any booking for instant savings.</p>
            </CardContent>
          </Card>

          {/* Contributor Level */}
          <Card className="overflow-hidden">
            <CardContent className="py-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Contributor Level</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    Level {mockUser.contributorLevel} - {currentLevelInfo.name}
                  </p>
                </div>
              </div>
              {nextLevelInfo && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-500 dark:text-slate-400">{mockUser.contributorPoints.toLocaleString()} pts</span>
                    <span className="text-slate-500 dark:text-slate-400">{nextLevelInfo.minPoints.toLocaleString()} pts ({nextLevelInfo.name})</span>
                  </div>
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${progressToNext}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Reviews Written', value: mockUser.stats.reviewsWritten, icon: Star },
            { label: 'Photos Uploaded', value: mockUser.stats.photosUploaded, icon: Camera },
            { label: 'Forum Posts', value: mockUser.stats.forumPosts, icon: MessageSquare },
            { label: 'Helpful Votes', value: mockUser.stats.helpfulVotes, icon: ThumbsUp },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-3 py-4">
                  <Icon className="h-5 w-5 text-sky-500 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <TabGroup defaultTab="badges">
          <TabList>
            <Tab value="badges">Badges</Tab>
            <Tab value="achievements">Achievements</Tab>
            <Tab value="challenges">Challenges</Tab>
            <Tab value="history">History</Tab>
          </TabList>

          {/* Badges Tab */}
          <TabPanel value="badges">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {badges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <Card key={badge.id} className={badge.earned ? '' : 'opacity-60'}>
                    <CardContent className="text-center py-6">
                      <div className={`h-14 w-14 rounded-full mx-auto mb-3 flex items-center justify-center ${
                        badge.earned ? 'bg-sky-100' : 'bg-slate-100'
                      }`}>
                        {badge.earned ? (
                          <Icon className="h-7 w-7 text-sky-600" />
                        ) : (
                          <Lock className="h-7 w-7 text-slate-400" />
                        )}
                      </div>
                      <h3 className="font-semibold text-sm text-slate-900">{badge.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{badge.description}</p>
                      {badge.earned ? (
                        <Badge variant="success" className="mt-2">Earned</Badge>
                      ) : (
                        <div className="mt-2">
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mx-4">
                            <div
                              className="h-full bg-sky-400 rounded-full"
                              style={{ width: `${badge.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 mt-1">{badge.progress}%</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabPanel>

          {/* Achievements Tab */}
          <TabPanel value="achievements">
            <div className="space-y-3">
              {achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <Card key={achievement.id}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                        achievement.completed ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        {achievement.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Icon className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 dark:text-white">{achievement.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{achievement.description}</p>
                      </div>
                      {achievement.completed ? (
                        <Badge variant="success">Complete</Badge>
                      ) : (
                        <Badge variant="outline">In Progress</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabPanel>

          {/* Challenges Tab */}
          <TabPanel value="challenges">
            <div className="space-y-4">
              {challenges.map((challenge) => (
                <Card key={challenge.id}>
                  <CardContent className="py-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{challenge.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{challenge.description}</p>
                      </div>
                      <Badge className="flex-shrink-0">
                        <Gift className="h-3 w-3 mr-1" />
                        {formatCurrency(challenge.reward)} Trip Cash
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all"
                            style={{ width: `${challenge.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 dark:text-slate-300">{challenge.progress}%</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                      <Clock className="h-3 w-3" />
                      {challenge.daysRemaining} days remaining
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabPanel>

          {/* History Tab */}
          <TabPanel value="history">
            <Card>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((item) => (
                  <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        item.type === 'earned' ? 'bg-green-100' : 'bg-amber-100'
                      }`}>
                        {item.type === 'earned' ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{item.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(item.date)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      item.type === 'earned' ? 'text-green-600' : 'text-amber-600'
                    }`}>
                      {item.type === 'earned' ? '+' : ''}{formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </TabPanel>
        </TabGroup>
      </div>

      {/* Bottom spacer */}
      <div className="h-12" />
    </motion.main>
  );
}
