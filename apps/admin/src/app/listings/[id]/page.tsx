'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowLeft, Save, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

type TabKey = 'details' | 'photos' | 'hours' | 'amenities';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'photos', label: 'Photos' },
  { key: 'hours', label: 'Hours' },
  { key: 'amenities', label: 'Amenities' },
];

const mockListing = {
  id: 'lst_001',
  name: 'Grand Plaza Hotel',
  description:
    'A luxurious 5-star hotel in the heart of Manhattan, offering stunning views of Central Park and world-class amenities. Our 300 rooms feature premium bedding, marble bathrooms, and state-of-the-art technology.',
  address: '768 Fifth Avenue, New York, NY 10019',
  phone: '+1 (212) 555-0100',
  email: 'info@grandplazahotel.com',
  website: 'https://grandplazahotel.com',
  category: 'Hotel',
  photos: [
    { id: 'p1', url: '/placeholder-1.jpg', alt: 'Hotel exterior' },
    { id: 'p2', url: '/placeholder-2.jpg', alt: 'Lobby' },
    { id: 'p3', url: '/placeholder-3.jpg', alt: 'Suite bedroom' },
    { id: 'p4', url: '/placeholder-4.jpg', alt: 'Rooftop pool' },
    { id: 'p5', url: '/placeholder-5.jpg', alt: 'Restaurant' },
    { id: 'p6', url: '/placeholder-6.jpg', alt: 'Spa' },
  ],
  hours: {
    Monday: { open: '00:00', close: '23:59' },
    Tuesday: { open: '00:00', close: '23:59' },
    Wednesday: { open: '00:00', close: '23:59' },
    Thursday: { open: '00:00', close: '23:59' },
    Friday: { open: '00:00', close: '23:59' },
    Saturday: { open: '00:00', close: '23:59' },
    Sunday: { open: '00:00', close: '23:59' },
  },
  amenities: [
    'Free WiFi',
    'Pool',
    'Spa',
    'Fitness Center',
    'Restaurant',
    'Room Service',
    'Concierge',
    'Valet Parking',
    'Business Center',
    'Laundry Service',
  ],
};

const allAmenities = [
  'Free WiFi',
  'Pool',
  'Spa',
  'Fitness Center',
  'Restaurant',
  'Room Service',
  'Bar',
  'Concierge',
  'Valet Parking',
  'Self Parking',
  'Business Center',
  'Laundry Service',
  'Airport Shuttle',
  'Pet Friendly',
  'Wheelchair Accessible',
  'Air Conditioning',
  'Heating',
  'Kitchen',
  'Balcony',
  'Ocean View',
  'Mountain View',
  'Hot Tub',
  'Fireplace',
  'EV Charging',
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState(mockListing.name);
  const [description, setDescription] = useState(mockListing.description);
  const [address, setAddress] = useState(mockListing.address);
  const [phone, setPhone] = useState(mockListing.phone);
  const [email, setEmail] = useState(mockListing.email);
  const [website, setWebsite] = useState(mockListing.website);
  const [category, setCategory] = useState(mockListing.category);
  const [hours, setHours] = useState(mockListing.hours);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(mockListing.amenities);
  const [photos] = useState(mockListing.photos);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity],
    );
  };

  const updateHours = (day: string, field: 'open' | 'close', value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day as keyof typeof prev], [field]: value },
    }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/listings">
            <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">ID: {params.id}</p>
          </div>
        </div>
        <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
          Save Changes
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Listing Details</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Input label="Listing Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'Hotel', label: 'Hotel' },
                  { value: 'Restaurant', label: 'Restaurant' },
                  { value: 'Experience', label: 'Experience' },
                  { value: 'Rental', label: 'Rental' },
                ]}
              />
              <div className="lg:col-span-2">
                <Textarea
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="lg:col-span-2">
                <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div className="lg:col-span-2">
                <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
              Save Details
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Photos Tab */}
      {activeTab === 'photos' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Photos ({photos.length})</h3>
              <Button variant="outline" size="sm" icon={<Upload className="h-4 w-4" />}>
                Upload Photos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative aspect-[4/3] bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                    <ImageIcon className="h-8 w-8 text-slate-300 dark:text-slate-500" />
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />}>
                      Delete
                    </Button>
                  </div>
                  <p className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-black/60 text-xs text-white truncate">
                    {photo.alt}
                  </p>
                </div>
              ))}

              {/* Upload placeholder */}
              <button className="aspect-[4/3] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
                <Upload className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                <span className="text-sm text-slate-500 dark:text-slate-400">Add photo</span>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hours Tab */}
      {activeTab === 'hours' && (
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Operating Hours</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {days.map((day) => (
                <div key={day} className="flex items-center gap-4">
                  <span className="w-28 text-sm font-medium text-slate-700 dark:text-slate-300">{day}</span>
                  <Input
                    type="time"
                    value={hours[day].open}
                    onChange={(e) => updateHours(day, 'open', e.target.value)}
                    className="w-36"
                  />
                  <span className="text-sm text-slate-500 dark:text-slate-400">to</span>
                  <Input
                    type="time"
                    value={hours[day].close}
                    onChange={(e) => updateHours(day, 'close', e.target.value)}
                    className="w-36"
                  />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
              Save Hours
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Amenities Tab */}
      {activeTab === 'amenities' && (
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Amenities ({selectedAmenities.length} selected)
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {allAmenities.map((amenity) => {
                const checked = selectedAmenities.includes(amenity);
                return (
                  <label
                    key={amenity}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      checked
                        ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/30 dark:text-brand-300'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 dark:border-slate-600 dark:hover:border-slate-500 dark:text-slate-300',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAmenity(amenity)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium">{amenity}</span>
                  </label>
                );
              })}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
              Save Amenities
            </Button>
          </CardFooter>
        </Card>
      )}
    </motion.div>
  );
}
