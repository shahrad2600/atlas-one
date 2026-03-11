'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Home,
  Building,
  Trees,
  Waves,
  Filter,
  Wifi,
  Car,
  UtensilsCrossed,
  Dog,
  WashingMachine,
  Star,
  Bed,
  Bath,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Rating } from '@/components/ui/rating';
import { formatCurrency } from '@/lib/utils';

interface VacationRental {
  id: string;
  name: string;
  location: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  color: string;
  amenities: string[];
  superhost: boolean;
}

const mockProperties: VacationRental[] = [
  {
    id: 'vr1',
    name: 'Charming Parisian Apartment near Eiffel Tower',
    location: 'Paris, France',
    type: 'Apartment',
    bedrooms: 2,
    bathrooms: 1,
    guests: 4,
    pricePerNight: 185,
    rating: 4.9,
    reviewCount: 234,
    color: 'bg-rose-100',
    amenities: ['Kitchen', 'WiFi', 'Washer'],
    superhost: true,
  },
  {
    id: 'vr2',
    name: 'Luxury Villa with Infinity Pool',
    location: 'Santorini, Greece',
    type: 'Villa',
    bedrooms: 4,
    bathrooms: 3,
    guests: 8,
    pricePerNight: 450,
    rating: 4.8,
    reviewCount: 128,
    color: 'bg-sky-100',
    amenities: ['Pool', 'Kitchen', 'WiFi', 'Parking'],
    superhost: true,
  },
  {
    id: 'vr3',
    name: 'Cozy Mountain Cabin with Hot Tub',
    location: 'Aspen, Colorado',
    type: 'Cabin',
    bedrooms: 3,
    bathrooms: 2,
    guests: 6,
    pricePerNight: 320,
    rating: 4.7,
    reviewCount: 189,
    color: 'bg-amber-100',
    amenities: ['Kitchen', 'WiFi', 'Parking', 'Pet Friendly'],
    superhost: false,
  },
  {
    id: 'vr4',
    name: 'Beachfront Bungalow on the Pacific',
    location: 'Tulum, Mexico',
    type: 'Beach House',
    bedrooms: 2,
    bathrooms: 2,
    guests: 4,
    pricePerNight: 225,
    rating: 4.6,
    reviewCount: 156,
    color: 'bg-teal-100',
    amenities: ['Pool', 'Kitchen', 'WiFi'],
    superhost: false,
  },
  {
    id: 'vr5',
    name: 'Modern Downtown Condo with City Views',
    location: 'Barcelona, Spain',
    type: 'Condo',
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    pricePerNight: 140,
    rating: 4.8,
    reviewCount: 312,
    color: 'bg-violet-100',
    amenities: ['Kitchen', 'WiFi', 'Washer'],
    superhost: true,
  },
  {
    id: 'vr6',
    name: 'Rustic Tuscan Farmhouse with Vineyard Views',
    location: 'Chianti, Italy',
    type: 'Villa',
    bedrooms: 5,
    bathrooms: 4,
    guests: 10,
    pricePerNight: 580,
    rating: 4.9,
    reviewCount: 97,
    color: 'bg-emerald-100',
    amenities: ['Pool', 'Kitchen', 'WiFi', 'Parking', 'Washer'],
    superhost: true,
  },
  {
    id: 'vr7',
    name: 'Stylish Loft in Shibuya',
    location: 'Tokyo, Japan',
    type: 'Apartment',
    bedrooms: 1,
    bathrooms: 1,
    guests: 3,
    pricePerNight: 165,
    rating: 4.7,
    reviewCount: 278,
    color: 'bg-pink-100',
    amenities: ['Kitchen', 'WiFi', 'Washer'],
    superhost: false,
  },
  {
    id: 'vr8',
    name: 'Oceanfront Beach House with Private Access',
    location: 'Byron Bay, Australia',
    type: 'Beach House',
    bedrooms: 3,
    bathrooms: 2,
    guests: 6,
    pricePerNight: 395,
    rating: 4.8,
    reviewCount: 145,
    color: 'bg-orange-100',
    amenities: ['Pool', 'Kitchen', 'WiFi', 'Parking', 'Pet Friendly'],
    superhost: true,
  },
];

const propertyTypes = ['Apartment', 'Villa', 'Cabin', 'Beach House', 'Condo'];

const amenityOptions = [
  { label: 'Kitchen', icon: UtensilsCrossed },
  { label: 'Pool', icon: Waves },
  { label: 'WiFi', icon: Wifi },
  { label: 'Parking', icon: Car },
  { label: 'Washer', icon: WashingMachine },
  { label: 'Pet Friendly', icon: Dog },
];

export default function VacationRentalsPage() {
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [bedroomMin, setBedroomMin] = useState(0);
  const [bathroomMin, setBathroomMin] = useState(0);
  const [priceMax, setPriceMax] = useState(600);

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  function toggleAmenity(amenity: string) {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity],
    );
  }

  const filteredProperties = mockProperties.filter((prop) => {
    if (selectedTypes.length > 0 && !selectedTypes.includes(prop.type)) return false;
    if (prop.bedrooms < bedroomMin) return false;
    if (prop.bathrooms < bathroomMin) return false;
    if (prop.pricePerNight > priceMax) return false;
    if (selectedAmenities.length > 0 && !selectedAmenities.every((a) => prop.amenities.includes(a))) return false;
    return true;
  });

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Vacation Rentals</h1>
          <p className="text-slate-600 mb-6">Discover unique homes, villas, and apartments worldwide</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Input
              label="Destination"
              placeholder="Where are you going?"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              icon={<MapPin className="h-4 w-4" />}
            />
            <Input
              label="Check-in"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              icon={<Calendar className="h-4 w-4" />}
            />
            <Input
              label="Check-out"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              icon={<Calendar className="h-4 w-4" />}
            />
            <Input
              label="Guests"
              type="number"
              placeholder="How many?"
              min={1}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              icon={<Users className="h-4 w-4" />}
            />
            <div className="flex items-end">
              <Button size="lg" className="w-full">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Filter Sidebar */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-4 space-y-6">
              <Card>
                <CardContent>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                  </h3>

                  {/* Property Type */}
                  <div className="mb-5">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Property Type</h4>
                    <div className="space-y-2">
                      {propertyTypes.map((type) => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTypes.includes(type)}
                            onChange={() => toggleType(type)}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                          <span className="text-sm text-slate-600 dark:text-slate-400">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Bedrooms */}
                  <div className="mb-5">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bedrooms</h4>
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setBedroomMin(num)}
                          className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                            bedroomMin === num
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {num === 0 ? 'Any' : `${num}+`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bathrooms */}
                  <div className="mb-5">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bathrooms</h4>
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map((num) => (
                        <button
                          key={num}
                          onClick={() => setBathroomMin(num)}
                          className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                            bathroomMin === num
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {num === 0 ? 'Any' : `${num}+`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="mb-5">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Amenities</h4>
                    <div className="space-y-2">
                      {amenityOptions.map((amenity) => {
                        const Icon = amenity.icon;
                        return (
                          <label key={amenity.label} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedAmenities.includes(amenity.label)}
                              onChange={() => toggleAmenity(amenity.label)}
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <Icon className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">{amenity.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Max Price / Night</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{formatCurrency(priceMax)}</p>
                    <input
                      type="range"
                      min={50}
                      max={600}
                      step={10}
                      value={priceMax}
                      onChange={(e) => setPriceMax(parseInt(e.target.value))}
                      className="w-full accent-sky-600"
                    />
                    <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                      <span>{formatCurrency(50)}</span>
                      <span>{formatCurrency(600)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Results Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">{filteredProperties.length} properties found</p>
              <select className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option>Recommended</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Rating</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProperties.map((property) => (
                <Card key={property.id} className="hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  {/* Image Placeholder */}
                  <div className={`${property.color} h-48 relative flex items-center justify-center`}>
                    <Home className="h-16 w-16 text-slate-500 opacity-30" />
                    {property.superhost && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-white/90 text-slate-700">
                          <Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />
                          Superhost
                        </Badge>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className="bg-white/90">{property.type}</Badge>
                    </div>
                  </div>
                  <CardContent>
                    <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-1">{property.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {property.location}
                    </div>

                    <div className="flex items-center gap-3 mt-3 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Bed className="h-4 w-4 text-slate-400" />
                        {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bath className="h-4 w-4 text-slate-400" />
                        {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-slate-400" />
                        {property.guests}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {property.amenities.map((amenity) => (
                        <Badge key={amenity} variant="outline" className="text-[10px]">{amenity}</Badge>
                      ))}
                    </div>

                    <div className="flex items-end justify-between mt-4 pt-3 border-t border-slate-100">
                      <div>
                        <Rating value={property.rating} count={property.reviewCount} />
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatCurrency(property.pricePerNight)}
                          <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/night</span>
                        </p>
                      </div>
                    </div>

                    <Button className="w-full mt-3">View Property</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-12" />
    </motion.main>
  );
}
