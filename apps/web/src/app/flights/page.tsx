'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import {
  Plane,
  ArrowRightLeft,
  Calendar,
  Users,
  Search,
  Clock,
  ArrowRight,
  ChevronDown,
  Luggage,
  Wifi,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ---------- mock data ---------- */

const mockFlights = [
  {
    id: 'fl1',
    airline: 'Air France',
    airlineCode: 'AF',
    flightNumber: 'AF 1234',
    departure: { time: '08:30', airport: 'JFK', city: 'New York' },
    arrival: { time: '21:45', airport: 'CDG', city: 'Paris' },
    duration: '7h 15m',
    stops: 0,
    price: 487,
    class: 'Economy',
    amenities: ['wifi', 'meals', 'entertainment'],
  },
  {
    id: 'fl2',
    airline: 'Delta Air Lines',
    airlineCode: 'DL',
    flightNumber: 'DL 402',
    departure: { time: '10:15', airport: 'JFK', city: 'New York' },
    arrival: { time: '23:30', airport: 'CDG', city: 'Paris' },
    duration: '7h 15m',
    stops: 0,
    price: 512,
    class: 'Economy',
    amenities: ['wifi', 'meals', 'entertainment'],
  },
  {
    id: 'fl3',
    airline: 'United Airlines',
    airlineCode: 'UA',
    flightNumber: 'UA 57',
    departure: { time: '17:00', airport: 'EWR', city: 'Newark' },
    arrival: { time: '06:50', airport: 'CDG', city: 'Paris' },
    duration: '7h 50m',
    stops: 0,
    price: 445,
    class: 'Economy',
    amenities: ['wifi', 'meals'],
  },
  {
    id: 'fl4',
    airline: 'British Airways',
    airlineCode: 'BA',
    flightNumber: 'BA 178',
    departure: { time: '20:00', airport: 'JFK', city: 'New York' },
    arrival: { time: '11:25', airport: 'CDG', city: 'Paris' },
    duration: '9h 25m',
    stops: 1,
    stopInfo: 'LHR (1h 30m layover)',
    price: 398,
    class: 'Economy',
    amenities: ['wifi', 'meals', 'entertainment'],
  },
  {
    id: 'fl5',
    airline: 'Lufthansa',
    airlineCode: 'LH',
    flightNumber: 'LH 411',
    departure: { time: '16:30', airport: 'JFK', city: 'New York' },
    arrival: { time: '09:15', airport: 'CDG', city: 'Paris' },
    duration: '10h 45m',
    stops: 1,
    stopInfo: 'FRA (2h 00m layover)',
    price: 372,
    class: 'Economy',
    amenities: ['wifi', 'meals'],
  },
  {
    id: 'fl6',
    airline: 'Norse Atlantic',
    airlineCode: 'N0',
    flightNumber: 'N0 101',
    departure: { time: '22:00', airport: 'JFK', city: 'New York' },
    arrival: { time: '11:20', airport: 'CDG', city: 'Paris' },
    duration: '7h 20m',
    stops: 0,
    price: 289,
    class: 'Economy',
    amenities: ['wifi'],
  },
];

const sortOptions = ['Price', 'Duration', 'Departure Time', 'Arrival Time'];

/* ---------- page ---------- */

export default function FlightsPage() {
  const [tripType, setTripType] = useState<'round' | 'one'>('round');
  const [from, setFrom] = useState('New York (JFK)');
  const [to, setTo] = useState('Paris (CDG)');
  const [departDate, setDepartDate] = useState('2026-04-15');
  const [returnDate, setReturnDate] = useState('2026-04-22');
  const [passengers, setPassengers] = useState('1');
  const [cabinClass, setCabinClass] = useState('Economy');
  const [searched, setSearched] = useState(true);
  const [sortBy, setSortBy] = useState('Price');

  const sorted = [...mockFlights].sort((a, b) => {
    switch (sortBy) {
      case 'Price': return a.price - b.price;
      case 'Duration': return a.duration.localeCompare(b.duration);
      case 'Departure Time': return a.departure.time.localeCompare(b.departure.time);
      case 'Arrival Time': return a.arrival.time.localeCompare(b.arrival.time);
      default: return 0;
    }
  });

  const swapCities = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Search Section */}
      <div className="bg-gradient-to-br from-slate-900 to-sky-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Plane className="h-8 w-8" />
            Search Flights
          </h1>

          {/* Trip type toggle */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setTripType('round')}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                tripType === 'round' ? 'bg-white text-slate-900' : 'bg-white/10 text-white/80 hover:bg-white/20',
              )}
            >
              Round Trip
            </button>
            <button
              onClick={() => setTripType('one')}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                tripType === 'one' ? 'bg-white text-slate-900' : 'bg-white/10 text-white/80 hover:bg-white/20',
              )}
            >
              One Way
            </button>
          </div>

          {/* Search form */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-end">
              {/* From */}
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-white/70 mb-1.5">From</label>
                <div className="relative">
                  <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-[-45deg]" />
                  <input
                    type="text"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur pl-10 pr-3 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="City or airport"
                  />
                </div>
              </div>

              {/* Swap button */}
              <button
                onClick={swapCities}
                className="hidden md:flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors shrink-0"
                title="Swap cities"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>

              {/* To */}
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-white/70 mb-1.5">To</label>
                <div className="relative">
                  <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 rotate-45" />
                  <input
                    type="text"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur pl-10 pr-3 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="City or airport"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-end">
              {/* Departure */}
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-white/70 mb-1.5">Departure</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={departDate}
                    onChange={(e) => setDepartDate(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur pl-10 pr-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              {/* Return */}
              {tripType === 'round' && (
                <div className="flex-1 w-full">
                  <label className="block text-xs font-medium text-white/70 mb-1.5">Return</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur pl-10 pr-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                </div>
              )}

              {/* Passengers */}
              <div className="w-full md:w-40">
                <label className="block text-xs font-medium text-white/70 mb-1.5">Passengers</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur pl-10 pr-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400 appearance-none"
                  >
                    <option value="1" className="text-slate-900">1 Passenger</option>
                    <option value="2" className="text-slate-900">2 Passengers</option>
                    <option value="3" className="text-slate-900">3 Passengers</option>
                    <option value="4" className="text-slate-900">4 Passengers</option>
                    <option value="5" className="text-slate-900">5+ Passengers</option>
                  </select>
                </div>
              </div>

              {/* Class */}
              <div className="w-full md:w-40">
                <label className="block text-xs font-medium text-white/70 mb-1.5">Class</label>
                <select
                  value={cabinClass}
                  onChange={(e) => setCabinClass(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/10 backdrop-blur px-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-400 appearance-none"
                >
                  <option value="Economy" className="text-slate-900">Economy</option>
                  <option value="Premium Economy" className="text-slate-900">Premium Economy</option>
                  <option value="Business" className="text-slate-900">Business</option>
                  <option value="First" className="text-slate-900">First</option>
                </select>
              </div>
            </div>

            <Button
              onClick={() => setSearched(true)}
              className="w-full md:w-auto bg-sky-500 hover:bg-sky-400 text-white px-8"
              size="lg"
            >
              <Search className="h-4 w-4 mr-2" />
              Search Flights
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="mx-auto max-w-5xl px-4 py-6">
          {/* Sort bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-white">{sorted.length}</span> flights found &middot; {from.split(' (')[0]} to {to.split(' (')[0]}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {sortOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Flight cards */}
          <div className="space-y-4">
            {sorted.map((flight) => (
              <Card key={flight.id} className="hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Flight info */}
                    <div className="flex-1 p-5">
                      {/* Airline */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600">
                          {flight.airlineCode}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{flight.airline}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{flight.flightNumber}</p>
                        </div>
                      </div>

                      {/* Times */}
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{flight.departure.time}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{flight.departure.airport}</p>
                        </div>

                        <div className="flex-1 flex flex-col items-center px-4">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{flight.duration}</span>
                          <div className="w-full flex items-center gap-1 my-1">
                            <div className="h-0.5 flex-1 bg-slate-300" />
                            {flight.stops > 0 ? (
                              <div className="h-2 w-2 rounded-full bg-amber-400" />
                            ) : null}
                            <Plane className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                          <span className={cn('text-xs', flight.stops === 0 ? 'text-emerald-600 font-medium' : 'text-amber-600')}>
                            {flight.stops === 0 ? 'Nonstop' : `${flight.stops} stop`}
                          </span>
                          {flight.stopInfo && (
                            <span className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{flight.stopInfo}</span>
                          )}
                        </div>

                        <div className="text-center">
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">{flight.arrival.time}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{flight.arrival.airport}</p>
                        </div>
                      </div>

                      {/* Amenities */}
                      <div className="mt-3 flex items-center gap-3">
                        {flight.amenities.includes('wifi') && (
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Wifi className="h-3.5 w-3.5" /> WiFi
                          </span>
                        )}
                        {flight.amenities.includes('meals') && (
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <UtensilsCrossed className="h-3.5 w-3.5" /> Meals
                          </span>
                        )}
                        {flight.amenities.includes('entertainment') && (
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Zap className="h-3.5 w-3.5" /> Entertainment
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Luggage className="h-3.5 w-3.5" /> {flight.class}
                        </span>
                      </div>
                    </div>

                    {/* Price + Select */}
                    <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-200 px-5 py-4 md:py-5 md:w-48">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(flight.price)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">per person</p>
                      </div>
                      <Button size="sm">Select</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Info note */}
          <div className="mt-6 rounded-lg bg-sky-50 border border-sky-200 p-4 text-sm text-sky-700">
            <p className="font-medium">Price Guarantee</p>
            <p className="mt-1 text-sky-600">
              All prices include taxes and fees. If you find a lower price elsewhere within 24 hours of booking, we will refund the difference.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
