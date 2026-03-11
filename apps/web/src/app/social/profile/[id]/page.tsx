'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  MapPin,
  Calendar,
  Globe,
  Camera,
  Star,
  UserPlus,
  UserCheck,
  Map,
  List,
  Award,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Rating } from '@/components/ui/rating';
import { TabGroup, TabList, Tab, TabPanel } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const mockProfile = {
  id: 'u-12345',
  displayName: 'Elena Marchetti',
  location: 'Milan, Italy',
  memberSince: '2022-03-15',
  bio: 'Travel writer and food enthusiast. I have visited 38 countries and counting. Passionate about authentic local experiences, hidden restaurants, and off-the-beaten-path destinations. Always planning the next trip.',
  followers: 2847,
  following: 312,
  contributorLevel: 5,
  contributorTitle: 'Globetrotter',
};

const mockReviews = [
  {
    id: 'r1',
    placeName: 'Belmond Hotel Caruso',
    location: 'Ravello, Italy',
    rating: 5,
    date: '2026-02-20',
    title: 'A dream come true on the Amalfi Coast',
    text: 'The infinity pool with views over the coastline is unlike anything I have experienced. Service was impeccable, rooms are beautifully appointed with antique furnishings...',
    helpfulCount: 34,
  },
  {
    id: 'r2',
    placeName: 'Arpege',
    location: 'Paris, France',
    rating: 5,
    date: '2026-01-15',
    title: 'Three Michelin stars well deserved',
    text: 'Alain Passard continues to push boundaries with his vegetable-forward cuisine. Every dish was a work of art, and the sommelier pairing was extraordinary...',
    helpfulCount: 28,
  },
  {
    id: 'r3',
    placeName: 'Aman Tokyo',
    location: 'Tokyo, Japan',
    rating: 4,
    date: '2025-11-08',
    title: 'Serene luxury in the heart of Tokyo',
    text: 'Minimalist design meets Japanese tradition. The rooms are some of the largest I have seen in Tokyo. The spa is world-class. Only minor critique is the restaurant pricing...',
    helpfulCount: 45,
  },
  {
    id: 'r4',
    placeName: 'La Pergola',
    location: 'Rome, Italy',
    rating: 5,
    date: '2025-09-22',
    title: 'Rome\'s finest dining experience',
    text: 'Heinz Beck delivers perfection with every course. The rooftop setting with views of St. Peter\'s dome adds an unforgettable atmosphere to an already stellar meal...',
    helpfulCount: 52,
  },
];

const mockPhotos = Array.from({ length: 12 }, (_, i) => ({
  id: `p${i + 1}`,
  destination: [
    'Amalfi Coast', 'Paris', 'Tokyo', 'Santorini', 'Marrakech',
    'Kyoto', 'Barcelona', 'Dubrovnik', 'Bali', 'Reykjavik',
    'Cape Town', 'Petra',
  ][i],
  color: [
    'bg-sky-200', 'bg-rose-200', 'bg-violet-200', 'bg-amber-200', 'bg-orange-200',
    'bg-emerald-200', 'bg-red-200', 'bg-teal-200', 'bg-lime-200', 'bg-blue-200',
    'bg-pink-200', 'bg-yellow-200',
  ][i],
}));

const mockTrips = [
  {
    id: 't1',
    name: 'Southern Italy Food Tour',
    destinations: ['Naples', 'Amalfi', 'Ravello', 'Positano'],
    dates: 'Feb 10 - Feb 22, 2026',
    photoCount: 86,
  },
  {
    id: 't2',
    name: 'Two Weeks in Japan',
    destinations: ['Tokyo', 'Kyoto', 'Osaka', 'Hakone', 'Hiroshima'],
    dates: 'Oct 28 - Nov 10, 2025',
    photoCount: 142,
  },
  {
    id: 't3',
    name: 'Greek Island Hopping',
    destinations: ['Athens', 'Santorini', 'Mykonos', 'Crete'],
    dates: 'Jul 5 - Jul 18, 2025',
    photoCount: 108,
  },
];

const visitedCountries = [
  'Italy', 'France', 'Spain', 'Japan', 'Thailand', 'Greece', 'Portugal',
  'Croatia', 'Morocco', 'Turkey', 'Indonesia', 'Mexico', 'Peru', 'Iceland',
  'South Africa', 'Czech Republic', 'Austria', 'Netherlands', 'UK', 'Germany',
  'Switzerland', 'Sweden', 'Norway', 'Denmark', 'Ireland', 'Belgium',
  'Vietnam', 'Cambodia', 'Singapore', 'Australia', 'New Zealand', 'Argentina',
  'Chile', 'Colombia', 'Egypt', 'Jordan', 'India', 'Sri Lanka',
];

const mockLists = [
  { id: 'l1', name: 'Best Pizza in Naples', itemCount: 12, emoji: '' },
  { id: 'l2', name: 'Tokyo Must-Sees', itemCount: 18, emoji: '' },
  { id: 'l3', name: 'Romantic Hotels in Europe', itemCount: 15, emoji: '' },
  { id: 'l4', name: 'Street Food Around the World', itemCount: 24, emoji: '' },
  { id: 'l5', name: 'Hidden Beaches', itemCount: 9, emoji: '' },
];

export default function ProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Profile Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar name={mockProfile.displayName} size="xl" className="h-24 w-24 text-2xl" />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{mockProfile.displayName}</h1>
                <Badge className="self-center sm:self-auto">
                  <Award className="h-3 w-3 mr-1" />
                  Level {mockProfile.contributorLevel} - {mockProfile.contributorTitle}
                </Badge>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {mockProfile.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {formatDate(mockProfile.memberSince, { month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p className="mt-3 text-slate-600 max-w-2xl">{mockProfile.bio}</p>
              <div className="flex items-center justify-center sm:justify-start gap-6 mt-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{mockProfile.followers.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{mockProfile.following}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Following</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{visitedCountries.length}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Countries</p>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Button
                variant={isFollowing ? 'secondary' : 'default'}
                onClick={() => setIsFollowing(!isFollowing)}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <TabGroup defaultTab="reviews">
          <TabList>
            <Tab value="reviews">Reviews</Tab>
            <Tab value="photos">Photos</Tab>
            <Tab value="trips">Trips</Tab>
            <Tab value="map">Travel Map</Tab>
            <Tab value="lists">Lists</Tab>
          </TabList>

          {/* Reviews Tab */}
          <TabPanel value="reviews">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{review.placeName}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{review.location}</p>
                      </div>
                      <Rating value={review.rating} />
                    </div>
                    <h4 className="text-sm font-medium text-slate-800 mb-1">{review.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{review.text}</p>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{formatDate(review.date)}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{review.helpfulCount} found helpful</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabPanel>

          {/* Photos Tab */}
          <TabPanel value="photos">
            <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
              {mockPhotos.map((photo, i) => {
                const heights = ['h-40', 'h-56', 'h-48', 'h-64', 'h-44', 'h-52'];
                const height = heights[i % heights.length];
                return (
                  <div
                    key={photo.id}
                    className={`${photo.color} ${height} rounded-lg flex items-end p-3 break-inside-avoid`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-slate-600" />
                      <span className="text-xs font-medium text-slate-700">{photo.destination}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabPanel>

          {/* Trips Tab */}
          <TabPanel value="trips">
            <div className="space-y-4">
              {mockTrips.map((trip) => (
                <Card key={trip.id}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-lg">{trip.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{trip.dates}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {trip.destinations.map((dest) => (
                            <Badge key={dest} variant="outline">{dest}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Camera className="h-4 w-4" />
                          <span className="text-sm">{trip.photoCount}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabPanel>

          {/* Travel Map Tab */}
          <TabPanel value="map">
            <Card>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="h-6 w-6 text-sky-500" />
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {visitedCountries.length} Countries Visited
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {Math.round((visitedCountries.length / 195) * 100)}% of the world explored
                    </p>
                  </div>
                </div>
                {/* Map Placeholder */}
                <div className="h-72 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <Map className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Interactive travel map</p>
                  </div>
                </div>
                {/* Country List */}
                <div className="flex flex-wrap gap-2">
                  {visitedCountries.map((country) => (
                    <Badge key={country} variant="outline">{country}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Lists Tab */}
          <TabPanel value="lists">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mockLists.map((list) => (
                <Card key={list.id} className="hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  <CardContent className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                      <List className="h-6 w-6 text-sky-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{list.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{list.itemCount} items</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabPanel>
        </TabGroup>
      </div>

      {/* Bottom spacer */}
      <div className="h-12" />
    </motion.main>
  );
}
