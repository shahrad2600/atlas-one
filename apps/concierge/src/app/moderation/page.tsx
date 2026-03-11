'use client';

import { useState } from 'react';
import {
  Shield,
  Clock,
  Flag,
  CheckCircle2,
  Star,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  Trash2,
  Eye,
  MessageSquare,
  Image,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { TabGroup, TabList, Tab, TabPanel } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PendingReview {
  id: string;
  reviewerName: string;
  listing: string;
  listingType: string;
  rating: number;
  text: string;
  flagReason: string | null;
  submittedAt: string;
}

interface FlaggedItem {
  id: string;
  type: 'review' | 'photo' | 'forum_post';
  contentPreview: string;
  authorName: string;
  listing?: string;
  reporterName: string;
  reason: string;
  flaggedAt: string;
}

interface UserReport {
  id: string;
  reporterName: string;
  reportedUser: string;
  reportedContent: string;
  category: 'Spam' | 'Inappropriate' | 'Fake' | 'Other';
  description: string;
  reportedAt: string;
}

const pendingReviews: PendingReview[] = [
  {
    id: 'REV-8901',
    reviewerName: 'Linda Chen',
    listing: 'Grand Hotel Vienna',
    listingType: 'Hotel',
    rating: 2,
    text: 'Absolutely terrible experience. The room was dirty, staff was rude, and the "city view" was actually a parking lot. I would not recommend this hotel to anyone. The breakfast was cold and the coffee machine was broken for 3 days straight.',
    flagReason: 'Potential policy violation - strong language detected',
    submittedAt: '25 min ago',
  },
  {
    id: 'REV-8899',
    reviewerName: 'Tom Bradley',
    listing: 'Skyline Restaurant NYC',
    listingType: 'Restaurant',
    rating: 5,
    text: 'Best dining experience in NYC! The chef came out to our table personally. The wagyu was cooked to perfection and the sommelier picked the perfect wine pairing. Worth every penny of the $450 bill.',
    flagReason: null,
    submittedAt: '1h ago',
  },
  {
    id: 'REV-8897',
    reviewerName: 'Maria Santos',
    listing: 'Island Hopping Tour - Phuket',
    listingType: 'Experience',
    rating: 1,
    text: 'DO NOT BOOK THIS. The boat was overcrowded (25+ people when they said max 15), the guide spoke barely any English, and we spent 30 minutes at each island when it was supposed to be an hour. Total scam and waste of money.',
    flagReason: 'Auto-flagged: extreme negative sentiment',
    submittedAt: '2h ago',
  },
  {
    id: 'REV-8895',
    reviewerName: 'Jake Wilson',
    listing: 'Sunset Beach Resort Bali',
    listingType: 'Hotel',
    rating: 4,
    text: 'Great resort with beautiful beachfront. The infinity pool is stunning. Only downside was the Wi-Fi being spotty in the rooms. Staff was incredibly helpful and the spa treatments were top-notch. Would definitely return.',
    flagReason: null,
    submittedAt: '3h ago',
  },
  {
    id: 'REV-8893',
    reviewerName: 'Anonymous User',
    listing: 'Boutique Hotel Marrakech',
    listingType: 'Hotel',
    rating: 5,
    text: 'Amazing place! Click here for 50% discount code on all bookings: www dot fake-deals dot com. Best hotel in Morocco, everyone should visit and use our special link for deals!',
    flagReason: 'Auto-flagged: spam/promotional content detected',
    submittedAt: '4h ago',
  },
];

const flaggedItems: FlaggedItem[] = [
  {
    id: 'FLG-3401',
    type: 'review',
    contentPreview: 'This hotel is run by incompetent people who clearly have no idea...',
    authorName: 'angry_traveler_99',
    listing: 'The Grand Budapest Hotel',
    reporterName: 'Hotel Manager',
    reason: 'Harassing and defamatory content',
    flaggedAt: '30 min ago',
  },
  {
    id: 'FLG-3399',
    type: 'photo',
    contentPreview: '[Photo showing competitor hotel pricing/advertisement]',
    authorName: 'BestDeals_Travel',
    listing: 'Ritz-Carlton Singapore',
    reporterName: 'Community moderator',
    reason: 'Competitive spam / advertising',
    flaggedAt: '1h ago',
  },
  {
    id: 'FLG-3397',
    type: 'forum_post',
    contentPreview: 'I know someone at the front desk who can get you a free upgrade if you mention...',
    authorName: 'insider_tips_2026',
    reporterName: 'AutoMod',
    reason: 'Potentially fraudulent advice',
    flaggedAt: '2h ago',
  },
  {
    id: 'FLG-3395',
    type: 'review',
    contentPreview: 'My cousin owns this restaurant so trust me it is the best in town...',
    authorName: 'FoodieExpert',
    listing: 'Trattoria Roma',
    reporterName: 'Community member',
    reason: 'Undisclosed relationship / fake review',
    flaggedAt: '3h ago',
  },
  {
    id: 'FLG-3393',
    type: 'photo',
    contentPreview: '[Photo containing personal information of staff member]',
    authorName: 'vacation_pics_2026',
    listing: 'Mandarin Oriental Bangkok',
    reporterName: 'Hotel staff',
    reason: 'Privacy violation - staff personal info visible',
    flaggedAt: '5h ago',
  },
];

const userReports: UserReport[] = [
  {
    id: 'RPT-2201',
    reporterName: 'Sarah Kim',
    reportedUser: 'ReviewBomber42',
    reportedContent: 'Multiple 1-star reviews across 15 hotels in 24 hours',
    category: 'Fake',
    description: 'This user left 15 identical 1-star reviews across different hotels within a single day. All reviews contain the same copy-pasted text. Clearly a fake review campaign.',
    reportedAt: '45 min ago',
  },
  {
    id: 'RPT-2199',
    reporterName: 'Hotel Concord Manager',
    reportedUser: 'NeverHappy_Guest',
    reportedContent: 'Threatening review demanding free stay',
    category: 'Inappropriate',
    description: 'User is threatening to leave negative reviews unless they receive a complimentary stay. This constitutes review extortion and violates our community guidelines.',
    reportedAt: '2h ago',
  },
  {
    id: 'RPT-2197',
    reporterName: 'Community Mod',
    reportedUser: 'TravelDeals_Bot',
    reportedContent: 'Forum posts with affiliate links',
    category: 'Spam',
    description: 'Account has been posting replies to forum threads with disguised affiliate links to third-party booking sites. All posts follow the same pattern.',
    reportedAt: '4h ago',
  },
  {
    id: 'RPT-2195',
    reporterName: 'Alex Wright',
    reportedUser: 'Luxury_Reviewer_Pro',
    reportedContent: 'Suspicious review pattern',
    category: 'Fake',
    description: 'This user only reviews luxury hotels with exactly 5 stars and similar wording. Suspected paid review account. Reviews appear within 24 hours of hotel listing creation.',
    reportedAt: '6h ago',
  },
  {
    id: 'RPT-2193',
    reporterName: 'Emily Zhang',
    reportedUser: 'TravelerMike',
    reportedContent: 'Offensive forum comments',
    category: 'Inappropriate',
    description: 'User has been making discriminatory comments about destinations and local cultures in multiple forum threads. Several community members have complained.',
    reportedAt: '8h ago',
  },
];

const typeIcons: Record<string, React.ElementType> = {
  review: MessageSquare,
  photo: Image,
  forum_post: FileText,
};

const categoryColors: Record<string, string> = {
  Spam: 'bg-purple-100 text-purple-800',
  Inappropriate: 'bg-red-100 text-red-800',
  Fake: 'bg-amber-100 text-amber-800',
  Other: 'bg-slate-100 text-slate-700',
};

export default function ModerationPage() {
  const [actionsTaken, setActionsTaken] = useState<Record<string, string>>({});

  const handleAction = (id: string, action: string) => {
    setActionsTaken((prev) => ({ ...prev, [id]: action }));
  };

  const isActioned = (id: string) => !!actionsTaken[id];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Content Moderation</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review flagged content and manage reports</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-400">Pending: 23</span>
          </div>
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            <Flag className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-800 dark:text-red-400">Flagged: 8</span>
          </div>
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800 dark:text-green-400">Resolved Today: 15</span>
          </div>
        </div>
      </div>

      <TabGroup>
        <TabList>
          <Tab index={0}>Pending Reviews ({pendingReviews.length})</Tab>
          <Tab index={1}>Flagged Content ({flaggedItems.length})</Tab>
          <Tab index={2}>Reports ({userReports.length})</Tab>
        </TabList>

        {/* Pending Reviews Tab */}
        <TabPanel index={0}>
          <div className="space-y-4">
            {pendingReviews.map((review) => {
              const actioned = isActioned(review.id);
              return (
                <Card key={review.id} className={cn(actioned && 'opacity-50')}>
                  <CardContent>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={review.reviewerName} size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{review.reviewerName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{review.listing} &middot; {review.listingType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                'h-4 w-4',
                                i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-600',
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{review.submittedAt}</span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">{review.text}</p>

                    {review.flagReason && (
                      <div className="flex items-center gap-2 mb-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-800 dark:text-amber-400">{review.flagReason}</p>
                      </div>
                    )}

                    {actioned ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Action taken: <span className="font-medium capitalize">{actionsTaken[review.id]}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleAction(review.id, 'approved')}>
                          <ThumbsUp className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleAction(review.id, 'rejected')}>
                          <ThumbsDown className="h-3.5 w-3.5" /> Reject
                        </Button>
                        <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleAction(review.id, 'flagged')}>
                          <Flag className="h-3.5 w-3.5" /> Flag
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabPanel>

        {/* Flagged Content Tab */}
        <TabPanel index={1}>
          <div className="space-y-4">
            {flaggedItems.map((item) => {
              const Icon = typeIcons[item.type];
              const actioned = isActioned(item.id);
              return (
                <Card key={item.id} className={cn(actioned && 'opacity-50')}>
                  <CardContent>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700">
                          <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize">{item.type.replace('_', ' ')}</p>
                            {item.listing && <span className="text-xs text-slate-400">&middot; {item.listing}</span>}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">By: {item.authorName}</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">{item.flaggedAt}</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300 italic">{item.contentPreview}</p>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Flag className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">Reported by <span className="font-medium">{item.reporterName}</span>: {item.reason}</span>
                    </div>

                    {actioned ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Action taken: <span className="font-medium capitalize">{actionsTaken[item.id]}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button variant="danger" size="sm" onClick={() => handleAction(item.id, 'removed')}>
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </Button>
                        <Button size="sm" onClick={() => handleAction(item.id, 'kept')}>
                          <Eye className="h-3.5 w-3.5" /> Keep
                        </Button>
                        <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => handleAction(item.id, 'warned')}>
                          <AlertTriangle className="h-3.5 w-3.5" /> Warn User
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel index={2}>
          <div className="space-y-4">
            {userReports.map((report) => {
              const actioned = isActioned(report.id);
              return (
                <Card key={report.id} className={cn(actioned && 'opacity-50')}>
                  <CardContent>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={report.reporterName} size="sm" />
                        <div>
                          <p className="text-sm text-slate-500">
                            <span className="font-medium text-slate-900 dark:text-slate-100">{report.reporterName}</span> reported{' '}
                            <span className="font-medium text-red-700 dark:text-red-400">{report.reportedUser}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={categoryColors[report.category]}>{report.category}</Badge>
                        <span className="text-xs text-slate-400">{report.reportedAt}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Reported Content</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{report.reportedContent}</p>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{report.description}</p>

                    {actioned ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Action taken: <span className="font-medium capitalize">{actionsTaken[report.id]}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select
                          options={[
                            { value: '', label: 'Take Action...' },
                            { value: 'warn', label: 'Warn User' },
                            { value: 'suspend', label: 'Suspend User (7 days)' },
                            { value: 'ban', label: 'Ban User' },
                            { value: 'remove_content', label: 'Remove Content' },
                            { value: 'dismiss', label: 'Dismiss Report' },
                          ]}
                          className="w-48"
                          onChange={(e) => {
                            if (e.target.value) handleAction(report.id, e.target.value);
                          }}
                        />
                        <Button variant="outline" size="sm">
                          <Eye className="h-3.5 w-3.5" /> View Full Profile
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabPanel>
      </TabGroup>
    </motion.div>
  );
}
