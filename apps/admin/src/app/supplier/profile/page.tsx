'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Save,
  Plus,
  Trash2,
  Upload,
  Image,
  Check,
  X,
  GripVertical,
  Bed,
  UtensilsCrossed,
  Dumbbell,
  Waves,
  Flower2,
  Wine,
  Car,
  Wifi,
  ShieldCheck,
  Baby,
  Dog,
  Accessibility,
  Sparkles,
} from 'lucide-react';

/* ---------- Mock Data ---------- */

const initialProfile = {
  name: 'The Langham, Paris',
  type: 'Palace Hotel',
  description:
    'A legendary palace hotel nestled in the heart of Paris, offering an unparalleled blend of historic grandeur and contemporary luxury. Our 120 rooms and suites feature bespoke furnishings, marble bathrooms, and views of the Tuileries Gardens or the Paris skyline.',
  totalRooms: 120,
  totalSuites: 28,
  yearOpened: 1889,
  lastRenovated: 2023,
  checkIn: '15:00',
  checkOut: '12:00',
  starRating: '5',
  address: '2 Rue de Rivoli, 75001 Paris, France',
  phone: '+33 1 42 60 38 70',
  email: 'reservations@langham-paris.com',
  website: 'https://www.langham-paris.com',
};

const initialRooms = [
  {
    id: 'rm1',
    name: 'Deluxe King Room',
    category: 'Deluxe',
    size: 45,
    maxOccupancy: 2,
    bedType: 'King',
    view: 'Garden view overlooking Tuileries',
    description: 'Elegantly appointed with Louis XVI-inspired furnishings and Italian marble bathroom.',
    isQuietWing: false,
    isBestRoom: false,
  },
  {
    id: 'rm2',
    name: 'Premier Suite',
    category: 'Suite',
    size: 75,
    maxOccupancy: 3,
    bedType: 'King',
    view: 'Panoramic city view with Eiffel Tower glimpse',
    description: 'Spacious suite with separate living area, walk-in closet, and deep soaking tub.',
    isQuietWing: true,
    isBestRoom: true,
  },
  {
    id: 'rm3',
    name: 'Royal Penthouse',
    category: 'Penthouse',
    size: 180,
    maxOccupancy: 4,
    bedType: 'King',
    view: '360-degree Paris skyline including Eiffel Tower and Sacre-Coeur',
    description: 'The crown jewel of the hotel featuring private terrace, baby grand piano, butler pantry, and museum-quality art collection.',
    isQuietWing: true,
    isBestRoom: true,
  },
];

const initialPhotos = [
  { id: 'ph1', name: 'hotel-exterior.jpg', category: 'Exterior', size: '2.4 MB', uploaded: '2026-01-15' },
  { id: 'ph2', name: 'lobby-grand-hall.jpg', category: 'Lobby', size: '3.1 MB', uploaded: '2026-01-15' },
  { id: 'ph3', name: 'deluxe-king-room.jpg', category: 'Rooms', size: '2.8 MB', uploaded: '2026-01-16' },
  { id: 'ph4', name: 'premier-suite-living.jpg', category: 'Suites', size: '3.4 MB', uploaded: '2026-01-16' },
  { id: 'ph5', name: 'restaurant-le-jardin.jpg', category: 'Dining', size: '2.6 MB', uploaded: '2026-01-17' },
  { id: 'ph6', name: 'spa-pool.jpg', category: 'Spa & Pool', size: '2.9 MB', uploaded: '2026-01-17' },
  { id: 'ph7', name: 'rooftop-terrace.jpg', category: 'Amenities', size: '3.2 MB', uploaded: '2026-02-01' },
  { id: 'ph8', name: 'royal-penthouse.jpg', category: 'Suites', size: '4.1 MB', uploaded: '2026-02-10' },
];

interface AmenityGroup {
  label: string;
  icon: React.ReactNode;
  items: { key: string; label: string; checked: boolean }[];
}

const initialAmenities: AmenityGroup[] = [
  {
    label: 'Room Features',
    icon: <Bed className="h-4 w-4" />,
    items: [
      { key: 'minibar', label: 'Minibar', checked: true },
      { key: 'safe', label: 'In-room safe', checked: true },
      { key: 'turndown', label: 'Turndown service', checked: true },
      { key: 'pillow_menu', label: 'Pillow menu', checked: true },
      { key: 'bathrobes', label: 'Bathrobes & slippers', checked: true },
      { key: 'nespresso', label: 'Nespresso machine', checked: true },
      { key: 'iron', label: 'Iron & ironing board', checked: true },
      { key: 'blackout', label: 'Blackout curtains', checked: true },
    ],
  },
  {
    label: 'Dining',
    icon: <UtensilsCrossed className="h-4 w-4" />,
    items: [
      { key: 'restaurant', label: 'Restaurant on-site', checked: true },
      { key: 'room_service', label: '24h room service', checked: true },
      { key: 'bar', label: 'Bar/lounge', checked: true },
      { key: 'breakfast_buffet', label: 'Breakfast buffet', checked: true },
      { key: 'michelin', label: 'Michelin-starred dining', checked: true },
      { key: 'afternoon_tea', label: 'Afternoon tea', checked: true },
    ],
  },
  {
    label: 'Wellness',
    icon: <Flower2 className="h-4 w-4" />,
    items: [
      { key: 'spa', label: 'Spa', checked: true },
      { key: 'pool_indoor', label: 'Indoor pool', checked: true },
      { key: 'pool_outdoor', label: 'Outdoor pool', checked: false },
      { key: 'sauna', label: 'Sauna', checked: true },
      { key: 'steam_room', label: 'Steam room', checked: true },
      { key: 'hot_tub', label: 'Hot tub', checked: false },
    ],
  },
  {
    label: 'Fitness',
    icon: <Dumbbell className="h-4 w-4" />,
    items: [
      { key: 'gym', label: 'Fitness center', checked: true },
      { key: 'yoga', label: 'Yoga studio', checked: true },
      { key: 'personal_trainer', label: 'Personal trainer', checked: true },
    ],
  },
  {
    label: 'Services',
    icon: <Sparkles className="h-4 w-4" />,
    items: [
      { key: 'concierge', label: '24h concierge', checked: true },
      { key: 'butler', label: 'Butler service', checked: true },
      { key: 'valet', label: 'Valet parking', checked: true },
      { key: 'laundry', label: 'Laundry & dry cleaning', checked: true },
      { key: 'shoe_shine', label: 'Shoe shine', checked: true },
      { key: 'car_service', label: 'Airport transfer', checked: true },
      { key: 'babysitting', label: 'Babysitting', checked: true },
    ],
  },
  {
    label: 'Technology',
    icon: <Wifi className="h-4 w-4" />,
    items: [
      { key: 'wifi', label: 'Complimentary Wi-Fi', checked: true },
      { key: 'smart_tv', label: 'Smart TV', checked: true },
      { key: 'usb_outlets', label: 'USB charging outlets', checked: true },
      { key: 'tablet', label: 'In-room tablet', checked: true },
      { key: 'bluetooth_speaker', label: 'Bluetooth speaker', checked: true },
    ],
  },
];

const initialHouseRules = [
  'No smoking in rooms or public areas',
  'Quiet hours: 22:00 - 07:00',
  'Children of all ages welcome',
  'Pets allowed (max 10kg, surcharge applies)',
  'Formal dress code in restaurant after 19:00',
  'Pool hours: 07:00 - 21:00',
];

/* ---------- Component ---------- */

export default function SupplierProfilePage() {
  const [profile, setProfile] = useState(initialProfile);
  const [rooms] = useState(initialRooms);
  const [photos] = useState(initialPhotos);
  const [amenities, setAmenities] = useState(initialAmenities);
  const [houseRules, setHouseRules] = useState(initialHouseRules);
  const [newRule, setNewRule] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSaving(false);
  };

  const toggleAmenity = (groupIdx: number, itemKey: string) => {
    setAmenities((prev) =>
      prev.map((group, gi) =>
        gi === groupIdx
          ? {
              ...group,
              items: group.items.map((item) =>
                item.key === itemKey ? { ...item, checked: !item.checked } : item,
              ),
            }
          : group,
      ),
    );
  };

  const addHouseRule = () => {
    if (newRule.trim()) {
      setHouseRules((prev) => [...prev, newRule.trim()]);
      setNewRule('');
    }
  };

  const removeHouseRule = (idx: number) => {
    setHouseRules((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profile Management</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Edit your property details and amenities</p>
        </div>
        <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
          Save Changes
        </Button>
      </div>

      {/* Property Metadata */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-slate-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Property Details</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Input
              label="Property Name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
            <Select
              label="Property Type"
              value={profile.type}
              onChange={(e) => setProfile({ ...profile, type: e.target.value })}
              options={[
                { value: 'Palace Hotel', label: 'Palace Hotel' },
                { value: 'Luxury Hotel', label: 'Luxury Hotel' },
                { value: 'Boutique Hotel', label: 'Boutique Hotel' },
                { value: 'Resort', label: 'Resort' },
                { value: 'Villa', label: 'Villa' },
                { value: 'Private Island', label: 'Private Island' },
              ]}
            />
            <Select
              label="Star Rating"
              value={profile.starRating}
              onChange={(e) => setProfile({ ...profile, starRating: e.target.value })}
              options={[
                { value: '5', label: '5 Star' },
                { value: '4', label: '4 Star' },
                { value: '3', label: '3 Star' },
              ]}
            />
            <Input
              label="Total Rooms"
              type="number"
              value={profile.totalRooms.toString()}
              onChange={(e) => setProfile({ ...profile, totalRooms: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Total Suites"
              type="number"
              value={profile.totalSuites.toString()}
              onChange={(e) => setProfile({ ...profile, totalSuites: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Year Opened"
              type="number"
              value={profile.yearOpened.toString()}
              onChange={(e) => setProfile({ ...profile, yearOpened: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Last Renovated"
              type="number"
              value={profile.lastRenovated.toString()}
              onChange={(e) => setProfile({ ...profile, lastRenovated: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Check-in Time"
              type="time"
              value={profile.checkIn}
              onChange={(e) => setProfile({ ...profile, checkIn: e.target.value })}
            />
            <Input
              label="Check-out Time"
              type="time"
              value={profile.checkOut}
              onChange={(e) => setProfile({ ...profile, checkOut: e.target.value })}
            />
          </div>
          <div className="mt-5">
            <Textarea
              label="Property Description"
              value={profile.description}
              onChange={(e) => setProfile({ ...profile, description: e.target.value })}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
            <Input
              label="Address"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />
            <Input
              label="Phone"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
            <Input
              label="Website"
              value={profile.website}
              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Room/Unit Metadata */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Bed className="h-5 w-5 text-slate-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Room & Suite Directory</h3>
          </div>
          <Button size="sm" variant="outline" icon={<Plus className="h-4 w-4" />}>
            Add Room Type
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {rooms.map((room) => (
              <div key={room.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{room.name}</h4>
                      <Badge variant="outline">{room.category}</Badge>
                      {room.isBestRoom && (
                        <Badge variant="success">Best Room</Badge>
                      )}
                      {room.isQuietWing && (
                        <Badge variant="default">Quiet Wing</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{room.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{room.size} m&sup2;</span>
                      <span>{room.bedType} bed</span>
                      <span>Max {room.maxOccupancy} guests</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="font-medium">View:</span> {room.view}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-600">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photo Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-slate-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Photo Gallery</h3>
          </div>
          <Button size="sm" variant="outline" icon={<Upload className="h-4 w-4" />}>
            Upload Photos
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-[4/3] rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image className="h-8 w-8 text-slate-300 dark:text-slate-500" />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
                  <p className="text-xs font-medium text-white truncate">{photo.name}</p>
                  <p className="text-[10px] text-white/70">{photo.category} &middot; {photo.size}</p>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-md bg-white/90 text-red-600 hover:bg-white shadow-sm">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="absolute top-2 left-2">
                  <button className="p-1.5 rounded-md bg-white/90 text-slate-500 hover:bg-white shadow-sm cursor-grab">
                    <GripVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Upload placeholder */}
            <div className="aspect-[4/3] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-500 hover:border-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-500 cursor-pointer transition-colors">
              <Upload className="h-6 w-6" />
              <span className="text-xs font-medium">Drop files here</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amenity Truth Layer */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-500" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Amenity Truth Layer</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Accurately report your amenities. These feed into verified luxury scoring.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {amenities.map((group, gi) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex-shrink-0 p-1.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {group.icon}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{group.label}</h4>
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-3 cursor-pointer group/item"
                    >
                      <div
                        className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                          item.checked
                            ? 'bg-brand-600 border-brand-600 dark:bg-brand-500 dark:border-brand-500'
                            : 'border-slate-300 dark:border-slate-600 group-hover/item:border-slate-400'
                        }`}
                        onClick={() => toggleAmenity(gi, item.key)}
                      >
                        {item.checked && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span
                        className="text-sm text-slate-700 dark:text-slate-300 group-hover/item:text-slate-900 dark:group-hover/item:text-slate-100"
                        onClick={() => toggleAmenity(gi, item.key)}
                      >
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* House Rules */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">House Rules</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            {houseRules.map((rule, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg group"
              >
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-medium flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{rule}</span>
                <button
                  onClick={() => removeHouseRule(idx)}
                  className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Add a new house rule..."
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHouseRule()}
            />
            <Button size="sm" variant="outline" onClick={addHouseRule} icon={<Plus className="h-4 w-4" />}>
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Footer */}
      <div className="flex justify-end gap-3 pb-4">
        <Button variant="outline">Discard Changes</Button>
        <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
          Save All Changes
        </Button>
      </div>
    </motion.div>
  );
}
