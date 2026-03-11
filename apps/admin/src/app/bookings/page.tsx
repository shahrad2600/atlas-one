'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { formatDate, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Eye, MessageSquare } from 'lucide-react';

type BookingTab = 'upcoming' | 'past' | 'cancelled';

interface Booking {
  id: string;
  guestName: string;
  listing: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled' | 'Completed';
  total: number;
}

const upcomingBookings: Booking[] = [
  {
    id: 'bk_001',
    guestName: 'James Wilson',
    listing: 'Grand Plaza Hotel - Suite',
    checkIn: '2026-03-15',
    checkOut: '2026-03-18',
    guests: 2,
    status: 'Confirmed',
    total: 1890,
  },
  {
    id: 'bk_002',
    guestName: 'Maria Santos',
    listing: 'Grand Plaza Hotel - Deluxe',
    checkIn: '2026-03-16',
    checkOut: '2026-03-20',
    guests: 3,
    status: 'Confirmed',
    total: 2440,
  },
  {
    id: 'bk_003',
    guestName: 'Robert Chen',
    listing: 'Central Park Walking Tour',
    checkIn: '2026-03-17',
    checkOut: '2026-03-17',
    guests: 4,
    status: 'Pending',
    total: 196,
  },
  {
    id: 'bk_004',
    guestName: 'Laura Kim',
    listing: 'Skyline Rooftop Bar - VIP Table',
    checkIn: '2026-03-19',
    checkOut: '2026-03-19',
    guests: 6,
    status: 'Confirmed',
    total: 480,
  },
  {
    id: 'bk_005',
    guestName: 'Thomas Wright',
    listing: 'Grand Plaza Hotel - Standard',
    checkIn: '2026-03-22',
    checkOut: '2026-03-25',
    guests: 2,
    status: 'Pending',
    total: 1350,
  },
];

const pastBookings: Booking[] = [
  {
    id: 'bk_006',
    guestName: 'Jennifer Adams',
    listing: 'Grand Plaza Hotel - Suite',
    checkIn: '2026-02-20',
    checkOut: '2026-02-23',
    guests: 2,
    status: 'Completed',
    total: 1890,
  },
  {
    id: 'bk_007',
    guestName: 'David Park',
    listing: 'The Olive Garden Bistro - Dinner',
    checkIn: '2026-02-18',
    checkOut: '2026-02-18',
    guests: 4,
    status: 'Completed',
    total: 320,
  },
  {
    id: 'bk_008',
    guestName: 'Amanda Foster',
    listing: 'Central Park Walking Tour',
    checkIn: '2026-02-15',
    checkOut: '2026-02-15',
    guests: 2,
    status: 'Completed',
    total: 98,
  },
  {
    id: 'bk_009',
    guestName: 'Michael Lee',
    listing: 'Luxury Sedan Fleet - Full Day',
    checkIn: '2026-02-10',
    checkOut: '2026-02-10',
    guests: 3,
    status: 'Completed',
    total: 450,
  },
  {
    id: 'bk_010',
    guestName: 'Sarah Johnson',
    listing: 'Grand Plaza Hotel - Deluxe',
    checkIn: '2026-02-05',
    checkOut: '2026-02-08',
    guests: 2,
    status: 'Completed',
    total: 1830,
  },
];

const cancelledBookings: Booking[] = [
  {
    id: 'bk_011',
    guestName: 'Peter Brown',
    listing: 'Grand Plaza Hotel - Standard',
    checkIn: '2026-03-10',
    checkOut: '2026-03-13',
    guests: 1,
    status: 'Cancelled',
    total: 1350,
  },
  {
    id: 'bk_012',
    guestName: 'Emily Davis',
    listing: 'Sunset Kayak Adventure',
    checkIn: '2026-03-08',
    checkOut: '2026-03-08',
    guests: 2,
    status: 'Cancelled',
    total: 130,
  },
  {
    id: 'bk_013',
    guestName: 'Chris Martinez',
    listing: 'Grand Plaza Hotel - Suite',
    checkIn: '2026-02-28',
    checkOut: '2026-03-03',
    guests: 2,
    status: 'Cancelled',
    total: 2520,
  },
  {
    id: 'bk_014',
    guestName: 'Rachel Green',
    listing: 'Skyline Rooftop Bar - VIP Table',
    checkIn: '2026-02-25',
    checkOut: '2026-02-25',
    guests: 8,
    status: 'Cancelled',
    total: 640,
  },
  {
    id: 'bk_015',
    guestName: 'Daniel Kim',
    listing: 'The Olive Garden Bistro - Dinner',
    checkIn: '2026-02-20',
    checkOut: '2026-02-20',
    guests: 2,
    status: 'Cancelled',
    total: 180,
  },
];

const statusBadgeMap: Record<string, BadgeVariant> = {
  Confirmed: 'success',
  Pending: 'warning',
  Cancelled: 'danger',
  Completed: 'default',
};

const tabData: Record<BookingTab, { label: string; bookings: Booking[] }> = {
  upcoming: { label: 'Upcoming', bookings: upcomingBookings },
  past: { label: 'Past', bookings: pastBookings },
  cancelled: { label: 'Cancelled', bookings: cancelledBookings },
};

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState<BookingTab>('upcoming');
  const currentBookings = tabData[activeTab].bookings;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bookings</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage reservations and bookings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-6">
          {(Object.keys(tabData) as BookingTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              )}
            >
              {tabData[tab].label}
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                {tabData[tab].bookings.length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Guest Name</TableHeader>
              <TableHeader>Listing</TableHeader>
              <TableHeader>Check-in</TableHeader>
              <TableHeader>Check-out</TableHeader>
              <TableHeader>Guests</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Total</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentBookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-medium text-slate-900">{booking.guestName}</TableCell>
                <TableCell>{booking.listing}</TableCell>
                <TableCell>{formatDate(booking.checkIn)}</TableCell>
                <TableCell>{formatDate(booking.checkOut)}</TableCell>
                <TableCell>{booking.guests}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeMap[booking.status]}>{booking.status}</Badge>
                </TableCell>
                <TableCell className="font-medium">{formatCurrency(booking.total)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" icon={<Eye className="h-3.5 w-3.5" />}>
                      View
                    </Button>
                    {activeTab === 'upcoming' && (
                      <Button variant="ghost" size="sm" icon={<MessageSquare className="h-3.5 w-3.5" />}>
                        Message
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
}
