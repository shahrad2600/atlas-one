'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Plus, Tag, Percent, Calendar, TicketCheck } from 'lucide-react';

interface SpecialOffer {
  id: string;
  listingName: string;
  title: string;
  description: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Scheduled' | 'Expired';
  redemptions: number;
}

const mockOffers: SpecialOffer[] = [
  {
    id: 'offer_001',
    listingName: 'Grand Plaza Hotel',
    title: 'Spring Getaway Special',
    description: 'Book 3 nights and get 20% off your entire stay. Includes complimentary breakfast and late checkout.',
    discountPercent: 20,
    startDate: '2026-03-01',
    endDate: '2026-04-30',
    status: 'Active',
    redemptions: 47,
  },
  {
    id: 'offer_002',
    listingName: 'Skyline Rooftop Bar',
    title: 'Happy Hour Extended',
    description: 'Enjoy 15% off all cocktails and appetizers every weekday from 4-7pm.',
    discountPercent: 15,
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    status: 'Active',
    redemptions: 123,
  },
  {
    id: 'offer_003',
    listingName: 'Central Park Walking Tour',
    title: 'Early Bird Summer Tours',
    description: 'Book your summer walking tour now and save 25%. Perfect for families and groups.',
    discountPercent: 25,
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    status: 'Scheduled',
    redemptions: 0,
  },
  {
    id: 'offer_004',
    listingName: 'The Olive Garden Bistro',
    title: 'Valentine Dinner Package',
    description: 'Three-course prix fixe dinner for two with a bottle of wine. Was $180, now 30% off.',
    discountPercent: 30,
    startDate: '2026-02-01',
    endDate: '2026-02-14',
    status: 'Expired',
    redemptions: 89,
  },
];

const statusBadgeMap: Record<string, BadgeVariant> = {
  Active: 'success',
  Scheduled: 'default',
  Expired: 'outline',
};

export default function OffersPage() {
  const [offers, setOffers] = useState(mockOffers);
  const [createOpen, setCreateOpen] = useState(false);
  const [newListing, setNewListing] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newListing || !newTitle || !newDiscount || !newStart || !newEnd) return;
    setCreating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const newOffer: SpecialOffer = {
      id: `offer_${Date.now()}`,
      listingName: newListing,
      title: newTitle,
      description: newDescription,
      discountPercent: parseFloat(newDiscount),
      startDate: newStart,
      endDate: newEnd,
      status: new Date(newStart) > new Date() ? 'Scheduled' : 'Active',
      redemptions: 0,
    };
    setOffers((prev) => [...prev, newOffer]);
    setNewListing('');
    setNewTitle('');
    setNewDescription('');
    setNewDiscount('');
    setNewStart('');
    setNewEnd('');
    setCreating(false);
    setCreateOpen(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Special Offers</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Create and manage promotional offers for your listings</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
          Create Offer
        </Button>
      </div>

      {/* Offer Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {offers.map((offer) => (
          <Card key={offer.id}>
            <CardContent className="py-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">{offer.listingName}</p>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{offer.title}</h3>
                </div>
                <Badge variant={statusBadgeMap[offer.status]}>{offer.status}</Badge>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{offer.description}</p>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Discount</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{offer.discountPercent}% off</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Valid</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatDate(offer.startDate, { month: 'short', day: 'numeric' })} - {formatDate(offer.endDate, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TicketCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Redemptions</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{offer.redemptions}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Offer Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Special Offer" size="lg">
        <div className="space-y-4">
          <Select
            label="Listing"
            value={newListing}
            onChange={(e) => setNewListing(e.target.value)}
            placeholder="Select a listing"
            options={[
              { value: 'Grand Plaza Hotel', label: 'Grand Plaza Hotel' },
              { value: 'Skyline Rooftop Bar', label: 'Skyline Rooftop Bar' },
              { value: 'Central Park Walking Tour', label: 'Central Park Walking Tour' },
              { value: 'The Olive Garden Bistro', label: 'The Olive Garden Bistro' },
              { value: 'Luxury Sedan Fleet', label: 'Luxury Sedan Fleet' },
              { value: 'Sunset Kayak Adventure', label: 'Sunset Kayak Adventure' },
            ]}
          />
          <Input
            label="Offer Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g., Summer Special - 20% Off"
          />
          <Textarea
            label="Description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Describe the offer details..."
            rows={3}
          />
          <Input
            label="Discount Percentage"
            type="number"
            value={newDiscount}
            onChange={(e) => setNewDiscount(e.target.value)}
            placeholder="e.g., 20"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!newListing || !newTitle || !newDiscount || !newStart || !newEnd}
              icon={<Tag className="h-4 w-4" />}
            >
              Create Offer
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
