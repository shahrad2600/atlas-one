"use client";

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Calendar, Camera, ThumbsUp, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TabGroup, TabList, Tab, TabPanel } from "@/components/ui/tabs";
import { Rating } from "@/components/ui/rating";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

const mockStats = { trips: 12, reviews: 34, photos: 156, helpful: 289 };

const mockReviews = [
  { id: "1", place: "The Ritz Paris", rating: 5, title: "Extraordinary stay", text: "Every detail was perfect. The staff went above and beyond.", date: "Feb 28, 2026" },
  { id: "2", place: "Aman Tokyo", rating: 4, title: "Serene and luxurious", text: "Beautiful design and incredible views of the city skyline.", date: "Jan 15, 2026" },
  { id: "3", place: "Trattoria da Mario", rating: 5, title: "Best pasta in Rome", text: "Authentic Italian cuisine in a cozy setting. The carbonara is a must.", date: "Dec 20, 2025" },
];

const mockTrips = [
  { id: "1", name: "Paris Getaway", destination: "Paris, France", dates: "Mar 15-22, 2026", status: "upcoming" as const },
  { id: "2", name: "Tokyo Adventure", destination: "Tokyo, Japan", dates: "Jan 5-12, 2026", status: "completed" as const },
  { id: "3", name: "Italian Summer", destination: "Rome, Italy", dates: "Jun 1-14, 2025", status: "completed" as const },
];

const mockBadges = [
  { name: "Explorer", icon: "🗺", description: "Visited 5+ countries" },
  { name: "Foodie", icon: "🍽", description: "Reviewed 10+ restaurants" },
  { name: "Photographer", icon: "📸", description: "Uploaded 100+ photos" },
  { name: "Helpful", icon: "👍", description: "Received 100+ helpful votes" },
  { name: "Globetrotter", icon: "✈", description: "Completed 10+ trips" },
  { name: "Top Reviewer", icon: "⭐", description: "Wrote 25+ reviews" },
];

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-6 mb-8">
          <Skeleton variant="circle" className="h-20 w-20" />
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" className="w-48 h-6" />
            <Skeleton variant="text" className="w-32 h-4" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar name={user.displayName} src={user.avatarUrl} size="xl" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{user.displayName}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />San Francisco, CA</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Joined {formatDate(user.createdAt)}</span>
              </div>
            </div>
            <Link href="/profile/settings">
              <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1" />Edit Profile</Button>
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-8">
            {[
              { label: "Trips", value: mockStats.trips },
              { label: "Reviews", value: mockStats.reviews },
              { label: "Photos", value: mockStats.photos },
              { label: "Helpful Votes", value: mockStats.helpful },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <TabGroup>
          <TabList>
            <Tab index={0}>Reviews</Tab>
            <Tab index={1}>Trips</Tab>
            <Tab index={2}>Photos</Tab>
            <Tab index={3}>Badges</Tab>
          </TabList>

          <TabPanel index={0}>
            <div className="space-y-4">
              {mockReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{review.place}</h3>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{review.date}</span>
                    </div>
                    <Rating value={review.rating} className="mb-2" />
                    <h4 className="font-medium text-slate-800 mb-1">{review.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{review.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabPanel>

          <TabPanel index={1}>
            <div className="space-y-4">
              {mockTrips.map((trip) => (
                <Card key={trip.id}>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{trip.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{trip.destination}</p>
                        <p className="text-xs text-slate-400 mt-1">{trip.dates}</p>
                      </div>
                      <Badge variant={trip.status === "upcoming" ? "default" : "outline"}>
                        {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabPanel>

          <TabPanel index={2}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="relative aspect-square rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <Image
                    src={`https://images.unsplash.com/photo-${1500000000000 + i * 100000}?w=300&q=80`}
                    alt={`Travel photo ${i + 1}`}
                    fill
                    className="object-cover hover:scale-105 transition-transform"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </TabPanel>

          <TabPanel index={3}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {mockBadges.map((badge) => (
                <Card key={badge.name}>
                  <CardContent className="text-center">
                    <span className="text-3xl mb-2 block">{badge.icon}</span>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{badge.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{badge.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabPanel>
        </TabGroup>
      </div>
    </motion.main>
  );
}
