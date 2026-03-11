'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Car,
  Search,
  Users,
  Briefcase,
  Settings2,
  MapPin,
  Calendar,
  Clock,
  ArrowRightLeft,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface RentalCar {
  id: string;
  vehicleClass: string;
  name: string;
  seats: number;
  bags: number;
  transmission: 'Automatic' | 'Manual';
  provider: string;
  pricePerDay: number;
  color: string;
  features: string[];
}

const mockRentals: RentalCar[] = [
  {
    id: 'r1',
    vehicleClass: 'Economy',
    name: 'Toyota Yaris or similar',
    seats: 5,
    bags: 2,
    transmission: 'Automatic',
    provider: 'Hertz',
    pricePerDay: 35,
    color: 'bg-sky-200',
    features: ['Air conditioning', 'Bluetooth'],
  },
  {
    id: 'r2',
    vehicleClass: 'Compact',
    name: 'Honda Civic or similar',
    seats: 5,
    bags: 3,
    transmission: 'Automatic',
    provider: 'Enterprise',
    pricePerDay: 45,
    color: 'bg-emerald-200',
    features: ['Air conditioning', 'Bluetooth', 'Backup camera'],
  },
  {
    id: 'r3',
    vehicleClass: 'Midsize',
    name: 'Toyota Camry or similar',
    seats: 5,
    bags: 4,
    transmission: 'Automatic',
    provider: 'Avis',
    pricePerDay: 55,
    color: 'bg-amber-200',
    features: ['Air conditioning', 'Bluetooth', 'Cruise control'],
  },
  {
    id: 'r4',
    vehicleClass: 'Full-Size',
    name: 'Chevrolet Malibu or similar',
    seats: 5,
    bags: 4,
    transmission: 'Automatic',
    provider: 'National',
    pricePerDay: 62,
    color: 'bg-violet-200',
    features: ['Air conditioning', 'Bluetooth', 'Apple CarPlay'],
  },
  {
    id: 'r5',
    vehicleClass: 'SUV',
    name: 'Toyota RAV4 or similar',
    seats: 5,
    bags: 4,
    transmission: 'Automatic',
    provider: 'Budget',
    pricePerDay: 72,
    color: 'bg-orange-200',
    features: ['Air conditioning', 'All-wheel drive', 'Roof rack'],
  },
  {
    id: 'r6',
    vehicleClass: 'Premium SUV',
    name: 'BMW X5 or similar',
    seats: 5,
    bags: 5,
    transmission: 'Automatic',
    provider: 'Sixt',
    pricePerDay: 120,
    color: 'bg-slate-300',
    features: ['Leather seats', 'Navigation', 'Panoramic roof'],
  },
  {
    id: 'r7',
    vehicleClass: 'Luxury',
    name: 'Mercedes E-Class or similar',
    seats: 5,
    bags: 4,
    transmission: 'Automatic',
    provider: 'Hertz Prestige',
    pricePerDay: 145,
    color: 'bg-rose-200',
    features: ['Leather seats', 'Navigation', 'Heated seats'],
  },
  {
    id: 'r8',
    vehicleClass: 'Minivan',
    name: 'Chrysler Pacifica or similar',
    seats: 7,
    bags: 5,
    transmission: 'Automatic',
    provider: 'Enterprise',
    pricePerDay: 85,
    color: 'bg-teal-200',
    features: ['Third row seating', 'Stow-n-Go', 'Entertainment system'],
  },
];

const vehicleClasses = ['Economy', 'Compact', 'Midsize', 'Full-Size', 'SUV', 'Premium SUV', 'Luxury', 'Minivan'];

export default function RentalsPage() {
  const [sameDropOff, setSameDropOff] = useState(true);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedTransmission, setSelectedTransmission] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200]);

  function toggleClass(cls: string) {
    setSelectedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls],
    );
  }

  const filteredRentals = mockRentals.filter((car) => {
    if (selectedClasses.length > 0 && !selectedClasses.includes(car.vehicleClass)) return false;
    if (selectedTransmission !== 'all' && car.transmission !== selectedTransmission) return false;
    if (car.pricePerDay < priceRange[0] || car.pricePerDay > priceRange[1]) return false;
    return true;
  });

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero / Search */}
      <div className="bg-gradient-to-r from-sky-600 to-sky-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-bold mb-2">Rental Cars</h1>
          <p className="text-sky-100 mb-6">Compare prices from top providers worldwide</p>

          <Card className="bg-white text-slate-900">
            <CardContent className="py-5">
              {/* Same drop-off toggle */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setSameDropOff(true)}
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                    sameDropOff ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Same drop-off
                </button>
                <button
                  onClick={() => setSameDropOff(false)}
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                    !sameDropOff ? 'bg-sky-100 text-sky-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Different drop-off
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <Input
                  label="Pick-up location"
                  placeholder="City or airport"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  icon={<MapPin className="h-4 w-4" />}
                />
                {!sameDropOff && (
                  <Input
                    label="Drop-off location"
                    placeholder="City or airport"
                    value={dropoff}
                    onChange={(e) => setDropoff(e.target.value)}
                    icon={<MapPin className="h-4 w-4" />}
                  />
                )}
                <Input
                  label="Pick-up date"
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  icon={<Calendar className="h-4 w-4" />}
                />
                <Input
                  label="Drop-off date"
                  type="date"
                  value={dropoffDate}
                  onChange={(e) => setDropoffDate(e.target.value)}
                  icon={<Calendar className="h-4 w-4" />}
                />
                <div className="flex items-end">
                  <Button size="lg" className="w-full">
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filter Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-4 space-y-6">
              <Card>
                <CardContent>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </h3>

                  {/* Vehicle Class */}
                  <div className="mb-5">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Vehicle Class</h4>
                    <div className="space-y-2">
                      {vehicleClasses.map((cls) => (
                        <label key={cls} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedClasses.includes(cls)}
                            onChange={() => toggleClass(cls)}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                          <span className="text-sm text-slate-600 dark:text-slate-400">{cls}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Transmission */}
                  <div className="mb-5">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Transmission</h4>
                    <div className="space-y-2">
                      {['all', 'Automatic', 'Manual'].map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="transmission"
                            checked={selectedTransmission === opt}
                            onChange={() => setSelectedTransmission(opt)}
                            className="h-4 w-4 border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {opt === 'all' ? 'Any' : opt}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Price Range (per day)</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{formatCurrency(priceRange[0])}</span>
                      <span className="text-sm text-slate-400">-</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{formatCurrency(priceRange[1])}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={200}
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-full mt-2 accent-sky-600"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Results Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{filteredRentals.length} vehicles found</p>
              <select className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Recommended</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRentals.map((car) => (
                <Card key={car.id} className="hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <CardContent>
                    {/* Vehicle Image Placeholder */}
                    <div className={`${car.color} h-36 rounded-lg mb-4 flex items-center justify-center`}>
                      <Car className="h-16 w-16 text-slate-500 opacity-50" />
                    </div>

                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <Badge variant="outline" className="mb-1.5">{car.vehicleClass}</Badge>
                        <h3 className="font-semibold text-slate-900 dark:text-white">{car.name}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {car.seats}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {car.bags}
                      </span>
                      <span className="flex items-center gap-1">
                        <Settings2 className="h-4 w-4" />
                        {car.transmission}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {car.features.map((feat) => (
                        <Badge key={feat} variant="outline" className="text-[10px]">{feat}</Badge>
                      ))}
                    </div>

                    <div className="flex items-end justify-between pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">{car.provider}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatCurrency(car.pricePerDay)}
                          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/day</span>
                        </p>
                      </div>
                      <Button>Book</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
