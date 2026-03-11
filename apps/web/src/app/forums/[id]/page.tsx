'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  BellOff,
  ThumbsUp,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const mockTopic = {
  id: 'topic-1',
  title: 'Best neighborhoods to stay in Rome?',
  author: {
    name: 'ItalyDreamer',
    memberSince: '2022-06-15',
    postCount: 87,
  },
  date: '2026-03-05T14:00:00Z',
  destination: 'Rome, Italy',
  content: `Hi everyone! My partner and I are planning our first trip to Rome this May and we're having trouble deciding where to stay. We'll be there for 5 nights and want to be within walking distance of the main sights, but we'd also love to experience a more "local" side of Rome.

We've narrowed it down to a few neighborhoods but would love to hear from people who've actually stayed there:

1. **Trastevere** - Seems charming and full of restaurants. Is it too touristy now?
2. **Monti** - Looks trendy and central. How's the noise level at night?
3. **Centro Storico** - Most convenient but probably the most expensive?
4. **Testaccio** - We've heard this is the "real Rome" for food lovers.

Our budget is around 150-200 EUR per night for a hotel or high-quality Airbnb. We love great food, walking, and want easy access to the Vatican and Colosseum.

Any recommendations would be hugely appreciated! Also, if anyone has specific hotel or Airbnb suggestions, please share. Thanks in advance!`,
  replyCount: 47,
};

const mockReplies = [
  {
    id: 'reply-1',
    author: { name: 'RomanLocal', memberSince: '2019-03-10', postCount: 1243 },
    date: '2026-03-05T16:30:00Z',
    content: `Great question! As someone who has lived in Rome for 15 years, here's my honest take:

**Trastevere** is still wonderful but yes, it's gotten more touristy over the years. That said, if you wander away from Piazza di Santa Maria, you'll find plenty of authentic spots. The nightlife can be noisy though.

**Monti** is my top recommendation for first-timers. It's walkable to the Colosseum and Forum, has amazing small restaurants and wine bars, and still feels genuinely Roman. Via dei Serpenti and the streets around it are lovely.

**Testaccio** is indeed a food lover's paradise. The market (Mercato di Testaccio) is excellent and far less touristy. It's a bit further from the Vatican but the metro gets you there quickly.

For your budget, I'd suggest looking at hotels in Monti. You should be able to find something nice for 180 EUR/night.`,
    helpfulCount: 23,
  },
  {
    id: 'reply-2',
    author: { name: 'EuroTraveler2024', memberSince: '2024-01-20', postCount: 56 },
    date: '2026-03-05T18:15:00Z',
    content: `We stayed in Monti last October and absolutely loved it! The neighborhood has a real village feel within the city. We found a lovely boutique hotel on Via Urbana for about 170 EUR/night.

One tip: book a table at La Barrique for dinner - incredible wine selection and the pasta was the best we had in our entire trip. It's a local favorite and fills up fast.

For the Vatican, we just took the metro from Cavour station - took about 20 minutes door to door. Really easy.`,
    helpfulCount: 15,
  },
  {
    id: 'reply-3',
    author: { name: 'FoodieWanderer', memberSince: '2021-08-05', postCount: 324 },
    date: '2026-03-06T09:00:00Z',
    content: `If food is your priority, I'd split your time between Testaccio and Trastevere. Testaccio for lunch (the market is phenomenal, try the supplì at 00100 Pizza) and Trastevere for evening ambience.

However, if you want one base, Monti is the best balance of everything. Central, authentic, great food, and walkable to most major sights.

Also, don't skip the Prati neighborhood near the Vatican. It's more residential, very safe, and has some excellent restaurants that are mostly frequented by Romans. Hotel prices are also reasonable.`,
    helpfulCount: 18,
  },
  {
    id: 'reply-4',
    author: { name: 'BudgetBackpacker', memberSince: '2023-05-12', postCount: 189 },
    date: '2026-03-06T12:45:00Z',
    content: `Just got back from Rome in February! Stayed in Trastevere at a wonderful small hotel. Yes, it's touristy around the main piazza, but walk 5 minutes in any direction and you're surrounded by locals.

The best thing about Trastevere is that you can walk everywhere. We walked to the Vatican in about 30 minutes through some beautiful streets, and the Colosseum was maybe 25 minutes the other direction.

At your budget, you'll find great options in any of those neighborhoods. I paid 160 EUR/night and was very happy.`,
    helpfulCount: 9,
  },
  {
    id: 'reply-5',
    author: { name: 'SantoriniExpert', memberSince: '2020-11-30', postCount: 567 },
    date: '2026-03-07T08:20:00Z',
    content: `Adding another vote for Monti. My wife and I have been to Rome four times and we keep coming back to that neighborhood. The atmosphere in the evening is magical - locals sitting outside at small restaurants, live music drifting from wine bars.

One specific suggestion: check out Hotel de Monti. Clean, modern, great location, and usually within your budget. The staff were incredibly helpful with restaurant recommendations too.`,
    helpfulCount: 12,
  },
];

export default function ForumTopicPage() {
  const params = useParams();
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [helpfulMap, setHelpfulMap] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const repliesPerPage = 5;

  const totalPages = Math.ceil(mockTopic.replyCount / repliesPerPage);

  function handleHelpful(replyId: string) {
    setHelpfulMap((prev) => ({ ...prev, [replyId]: !prev[replyId] }));
  }

  function handleSubmitReply() {
    if (!replyText.trim()) return;
    setReplyText('');
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/forums" className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700">
            <ArrowLeft className="h-4 w-4" />
            Back to Forums
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Topic Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{mockTopic.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline">{mockTopic.destination}</Badge>
                <Badge>
                  <MessageCircle className="h-3 w-3 mr-1" />
                  {mockTopic.replyCount} replies
                </Badge>
              </div>
            </div>
            <Button
              variant={subscribed ? 'secondary' : 'outline'}
              onClick={() => setSubscribed(!subscribed)}
            >
              {subscribed ? (
                <>
                  <BellOff className="h-4 w-4" />
                  Subscribed
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  Subscribe
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Original Post */}
        <Card className="mb-6">
          <CardContent>
            <div className="flex items-start gap-4">
              <Avatar name={mockTopic.author.name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-900 dark:text-white">{mockTopic.author.name}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                    Member since {formatDate(mockTopic.author.memberSince, { month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{mockTopic.author.postCount} posts</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{formatDate(mockTopic.date)}</p>
                <div className="prose prose-slate prose-sm max-w-none whitespace-pre-line">
                  {mockTopic.content}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Replies */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Replies ({mockTopic.replyCount})
          </h2>
          {mockReplies.map((reply) => {
            const isHelpful = helpfulMap[reply.id] ?? false;
            return (
              <Card key={reply.id}>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <Avatar name={reply.author.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">{reply.author.name}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{reply.author.postCount} posts</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{formatDate(reply.date)}</p>
                      <div className="prose prose-slate prose-sm max-w-none whitespace-pre-line">
                        {reply.content}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleHelpful(reply.id)}
                          className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
                            isHelpful ? 'text-sky-600 font-medium' : 'text-slate-500 hover:text-sky-600'
                          }`}
                        >
                          <ThumbsUp className={`h-4 w-4 ${isHelpful ? 'fill-current' : ''}`} />
                          Helpful ({reply.helpfulCount + (isHelpful ? 1 : 0)})
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            {totalPages > 5 && (
              <>
                <span className="text-slate-400">...</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)}>
                  {totalPages}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Reply Form */}
        <Card>
          <CardContent>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Post a Reply</h3>
            {user ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar name={user.displayName} size="md" />
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Share your experience or advice..."
                    rows={4}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSubmitReply} disabled={!replyText.trim()}>
                    Submit Reply
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-slate-600 mb-3">You need to be logged in to reply.</p>
                <Link href="/login">
                  <Button>Sign In to Reply</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.main>
  );
}
