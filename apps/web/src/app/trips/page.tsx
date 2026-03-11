"use client";

import { motion } from 'framer-motion';
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Plane } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { TripCard } from "@/components/trip-card";
import { TabGroup, TabList, Tab, TabPanel } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const upcomingTrips = [
  { name: "Paris Spring Getaway", destination: "Paris, France", dates: "Mar 15 - 22, 2026", status: "upcoming" as const, travelers: 2, budget: "$4,500", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80", href: "/trips/paris-spring" },
  { name: "Bali Beach Retreat", destination: "Bali, Indonesia", dates: "Apr 10 - 20, 2026", status: "upcoming" as const, travelers: 4, budget: "$6,200", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80", href: "/trips/bali-retreat" },
];

const pastTrips = [
  { name: "Tokyo Adventure", destination: "Tokyo, Japan", dates: "Jan 5 - 12, 2026", status: "completed" as const, travelers: 2, budget: "$5,800", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80", href: "/trips/tokyo-adventure" },
  { name: "Italian Summer", destination: "Rome & Florence, Italy", dates: "Jun 1 - 14, 2025", status: "completed" as const, travelers: 3, budget: "$7,200", image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80", href: "/trips/italian-summer" },
  { name: "NYC Weekend", destination: "New York, USA", dates: "Nov 20 - 23, 2025", status: "completed" as const, travelers: 1, budget: "$1,800", image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80", href: "/trips/nyc-weekend" },
];

const draftTrips = [
  { name: "Greek Islands", destination: "Santorini & Mykonos, Greece", dates: "TBD", status: "draft" as const, travelers: 2, budget: "$5,000", image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80", href: "/trips/greek-islands" },
];

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <Plane className="h-12 w-12 text-slate-300 mx-auto mb-4" />
      <p className="text-lg font-medium text-slate-700">{message}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Start planning your next adventure</p>
      <Link href="/trips/new" className="mt-4 inline-block">
        <Button><Plus className="h-4 w-4 mr-1" />Plan a New Trip</Button>
      </Link>
    </div>
  );
}

export default function TripsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-12">
        <Skeleton variant="text" className="w-48 h-8 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
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
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Trips</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Plan, organize, and relive your adventures</p>
            </div>
            <Link href="/trips/new">
              <Button size="lg"><Plus className="h-4 w-4 mr-1" />Plan a New Trip</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <TabGroup>
          <TabList>
            <Tab index={0}>Upcoming ({upcomingTrips.length})</Tab>
            <Tab index={1}>Past ({pastTrips.length})</Tab>
            <Tab index={2}>Drafts ({draftTrips.length})</Tab>
          </TabList>

          <TabPanel index={0}>
            {upcomingTrips.length === 0 ? (
              <EmptyState message="No upcoming trips" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {upcomingTrips.map((trip) => (<TripCard key={trip.name} {...trip} />))}
              </div>
            )}
          </TabPanel>

          <TabPanel index={1}>
            {pastTrips.length === 0 ? (
              <EmptyState message="No past trips" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {pastTrips.map((trip) => (<TripCard key={trip.name} {...trip} />))}
              </div>
            )}
          </TabPanel>

          <TabPanel index={2}>
            {draftTrips.length === 0 ? (
              <EmptyState message="No draft trips" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {draftTrips.map((trip) => (<TripCard key={trip.name} {...trip} />))}
              </div>
            )}
          </TabPanel>
        </TabGroup>
      </div>
    </motion.main>
  );
}
