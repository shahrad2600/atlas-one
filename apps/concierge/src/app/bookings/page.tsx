'use client';

import { useState } from 'react';
import {
  Hotel,
  Plane,
  UtensilsCrossed,
  Compass,
  Eye,
  Pencil,
  XCircle,
  Clock,
  CreditCard,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { TabGroup, TabList, Tab, TabPanel } from '@/components/ui/tabs';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';

type BookingType = 'Hotel' | 'Flight' | 'Experience' | 'Dining';
type BookingStatus = 'Confirmed' | 'Pending' | 'Modified' | 'Cancelled';

interface Booking {
  id: string;
  travelerName: string;
  type: BookingType;
  property: string;
  dates: string;
  status: BookingStatus;
  amount: number;
  createdAt: string;
  modificationHistory: { date: string; action: string; by: string }[];
  paymentInfo: { method: string; last4: string; charged: number; refunded: number };
  details: Record<string, string>;
}

const bookings: Booking[] = [
  {
    id: 'BKG-70291',
    travelerName: 'James Morrison',
    type: 'Flight',
    property: 'Virgin Atlantic VS003 LHR-JFK',
    dates: 'Mar 9, 2026',
    status: 'Confirmed',
    amount: 4200,
    createdAt: '2026-03-08T10:31:00Z',
    modificationHistory: [
      { date: 'Mar 8, 10:31 AM', action: 'Booking created (rebooking from cancelled BA flight)', by: 'Sarah Chen' },
    ],
    paymentInfo: { method: 'Visa', last4: '4821', charged: 4200, refunded: 0 },
    details: { cabin: 'Business', seat: '2A (Aisle)', meal: 'Nut-free', lounge: 'Clubhouse access included' },
  },
  {
    id: 'BKG-70285',
    travelerName: 'Mei Lin Wu',
    type: 'Hotel',
    property: 'The Ritz Paris - Honeymoon Suite',
    dates: 'Mar 20-25, 2026',
    status: 'Pending',
    amount: 6200,
    createdAt: '2026-02-15T09:00:00Z',
    modificationHistory: [
      { date: 'Mar 8, 9:15 AM', action: 'Room upgrade requested: Deluxe -> Honeymoon Suite', by: 'System' },
      { date: 'Feb 15, 9:00 AM', action: 'Booking created for Deluxe Room', by: 'Auto-book' },
    ],
    paymentInfo: { method: 'Mastercard', last4: '7192', charged: 4800, refunded: 0 },
    details: { room: 'Honeymoon Suite (pending upgrade)', nights: '5', guests: '2', breakfast: 'Included', specialRequests: 'Anniversary cake, champagne on arrival' },
  },
  {
    id: 'BKG-70278',
    travelerName: 'Alessandro Ricci',
    type: 'Hotel',
    property: 'Four Seasons Florence',
    dates: 'Mar 8-14, 2026',
    status: 'Modified',
    amount: 5600,
    createdAt: '2026-01-20T14:00:00Z',
    modificationHistory: [
      { date: 'Mar 8, 8:45 AM', action: 'Extended stay by 2 nights (Mar 12 -> Mar 14)', by: 'Sarah Chen' },
      { date: 'Jan 20, 2:00 PM', action: 'Original booking: Mar 8-12', by: 'Auto-book' },
    ],
    paymentInfo: { method: 'Amex', last4: '3456', charged: 5600, refunded: 0 },
    details: { room: 'Renaissance Suite', nights: '6 (extended from 4)', guests: '1', breakfast: 'Included', valet: 'Yes' },
  },
  {
    id: 'BKG-70271',
    travelerName: 'Emma Thompson',
    type: 'Dining',
    property: 'Tickets Barcelona',
    dates: 'Mar 15, 2026',
    status: 'Confirmed',
    amount: 220,
    createdAt: '2026-03-01T10:00:00Z',
    modificationHistory: [
      { date: 'Mar 8, 7:30 AM', action: 'Party size update requested: 8 -> 10', by: 'Traveler' },
      { date: 'Mar 1, 10:00 AM', action: 'Reservation created for 8 guests', by: 'Michael Park' },
    ],
    paymentInfo: { method: 'Visa', last4: '5567', charged: 220, refunded: 0 },
    details: { time: '8:30 PM', party: '10 (updated from 8)', cuisine: 'Avant-garde tapas', dietary: '1 vegetarian, 1 nut allergy' },
  },
  {
    id: 'BKG-70265',
    travelerName: 'Sofia Martinez',
    type: 'Experience',
    property: 'Private Yacht Charter - Santorini',
    dates: 'Jun 10-12, 2026',
    status: 'Pending',
    amount: 15800,
    createdAt: '2026-03-07T18:00:00Z',
    modificationHistory: [
      { date: 'Mar 7, 6:00 PM', action: 'Inquiry submitted for luxury yacht with private chef', by: 'Sarah Chen' },
    ],
    paymentInfo: { method: 'Amex', last4: '8901', charged: 0, refunded: 0 },
    details: { yacht: 'TBD - awaiting availability', guests: '6', chef: 'Private chef requested', duration: '3 days/2 nights' },
  },
  {
    id: 'BKG-70260',
    travelerName: 'David Park',
    type: 'Hotel',
    property: 'Kyoto Ryokan',
    dates: 'Mar 22-24, 2026',
    status: 'Cancelled',
    amount: 0,
    createdAt: '2026-02-10T08:00:00Z',
    modificationHistory: [
      { date: 'Mar 7, 11:00 AM', action: 'Booking cancelled by traveler - full refund issued', by: 'System' },
      { date: 'Feb 10, 8:00 AM', action: 'Booking created', by: 'Auto-book' },
    ],
    paymentInfo: { method: 'Visa', last4: '2233', charged: 680, refunded: 680 },
    details: { room: 'Traditional Tatami Room', nights: '2', guests: '1', onsen: 'Private bath included' },
  },
  {
    id: 'BKG-70255',
    travelerName: 'Carlos Gutierrez',
    type: 'Hotel',
    property: 'Rosewood Mayakoba',
    dates: 'Mar 20-27, 2026',
    status: 'Confirmed',
    amount: 4100,
    createdAt: '2026-02-05T12:00:00Z',
    modificationHistory: [
      { date: 'Feb 5, 12:00 PM', action: 'Booking created', by: 'Auto-book' },
    ],
    paymentInfo: { method: 'Mastercard', last4: '6789', charged: 4100, refunded: 0 },
    details: { room: 'Lagoon Suite', nights: '7', guests: '4', transfers: 'Airport transfer requested', spa: '2 sessions booked' },
  },
  {
    id: 'BKG-70250',
    travelerName: 'Hannah Weber',
    type: 'Hotel',
    property: 'Marina Bay Hotel Singapore',
    dates: 'Mar 5-10, 2026',
    status: 'Modified',
    amount: 1450,
    createdAt: '2026-01-15T09:00:00Z',
    modificationHistory: [
      { date: 'Mar 6, 5:15 AM', action: 'Complaint filed - room not matching description', by: 'Traveler' },
      { date: 'Jan 15, 9:00 AM', action: 'Booking created', by: 'Auto-book' },
    ],
    paymentInfo: { method: 'Visa', last4: '4455', charged: 1450, refunded: 0 },
    details: { room: 'Ocean View (partial - complaint pending)', nights: '5', guests: '1', issue: 'Room view does not match listing photos' },
  },
];

const typeIcons: Record<BookingType, React.ElementType> = {
  Hotel: Hotel,
  Flight: Plane,
  Experience: Compass,
  Dining: UtensilsCrossed,
};

const typeColors: Record<BookingType, string> = {
  Hotel: 'bg-sky-100 text-sky-800',
  Flight: 'bg-purple-100 text-purple-800',
  Experience: 'bg-emerald-100 text-emerald-800',
  Dining: 'bg-amber-100 text-amber-800',
};

const statusColors: Record<BookingStatus, string> = {
  Confirmed: 'bg-green-100 text-green-800',
  Pending: 'bg-amber-100 text-amber-800',
  Modified: 'bg-sky-100 text-sky-800',
  Cancelled: 'bg-red-100 text-red-800',
};

type TabFilter = 'active' | 'pending' | 'cancelled' | 'all';

export default function BookingsPage() {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<Booking | null>(null);

  const filterBookings = (tab: TabFilter) => {
    switch (tab) {
      case 'active': return bookings.filter((b) => b.status === 'Confirmed' || b.status === 'Modified');
      case 'pending': return bookings.filter((b) => b.status === 'Pending');
      case 'cancelled': return bookings.filter((b) => b.status === 'Cancelled');
      default: return bookings;
    }
  };

  const renderTable = (items: Booking[]) => (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-700 text-left">
          <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Booking ID</th>
          <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Traveler</th>
          <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Type</th>
          <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Property / Service</th>
          <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Dates</th>
          <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
          <th className="pb-3 font-medium text-slate-500 dark:text-slate-400 text-right">Amount</th>
          <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
        {items.map((b) => {
          const Icon = typeIcons[b.type];
          return (
            <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <td className="py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{b.id}</td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <Avatar name={b.travelerName} size="sm" />
                  <span className="text-slate-900 dark:text-slate-100 font-medium">{b.travelerName}</span>
                </div>
              </td>
              <td className="py-3">
                <Badge className={typeColors[b.type]}>
                  <Icon className="h-3 w-3 mr-1" />
                  {b.type}
                </Badge>
              </td>
              <td className="py-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{b.property}</td>
              <td className="py-3 text-slate-600 dark:text-slate-400 text-xs">{b.dates}</td>
              <td className="py-3">
                <Badge className={statusColors[b.status]}>{b.status}</Badge>
              </td>
              <td className="py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                {b.amount > 0 ? formatCurrency(b.amount) : '--'}
              </td>
              <td className="py-3">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(b)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {b.status !== 'Cancelled' && (
                    <>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setShowCancelConfirm(b)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
        {items.length === 0 && (
          <tr>
            <td colSpan={8} className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              No bookings found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Booking Management</h1>

      <TabGroup>
        <TabList>
          <Tab index={0}>Active ({filterBookings('active').length})</Tab>
          <Tab index={1}>Pending Changes ({filterBookings('pending').length})</Tab>
          <Tab index={2}>Cancelled ({filterBookings('cancelled').length})</Tab>
          <Tab index={3}>All ({bookings.length})</Tab>
        </TabList>

        <TabPanel index={0}>{renderTable(filterBookings('active'))}</TabPanel>
        <TabPanel index={1}>{renderTable(filterBookings('pending'))}</TabPanel>
        <TabPanel index={2}>{renderTable(filterBookings('cancelled'))}</TabPanel>
        <TabPanel index={3}>{renderTable(filterBookings('all'))}</TabPanel>
      </TabGroup>

      {/* Booking Detail Modal */}
      <Modal
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking ? `Booking ${selectedBooking.id}` : ''}
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={selectedBooking.travelerName} size="lg" />
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedBooking.travelerName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={typeColors[selectedBooking.type]}>{selectedBooking.type}</Badge>
                    <Badge className={statusColors[selectedBooking.status]}>{selectedBooking.status}</Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(selectedBooking.amount)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Created {formatDate(selectedBooking.createdAt)}</p>
              </div>
            </div>

            {/* Property Info */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">{selectedBooking.property}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{selectedBooking.dates}</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {Object.entries(selectedBooking.details).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">{key}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modification History */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" /> Modification History
              </h3>
              <div className="space-y-3">
                {selectedBooking.modificationHistory.map((mod, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{mod.action}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{mod.date} &middot; {mod.by}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-400 dark:text-slate-500" /> Payment Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Method</p>
                  <p className="text-slate-700 dark:text-slate-300">{selectedBooking.paymentInfo.method} ending {selectedBooking.paymentInfo.last4}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Amount Charged</p>
                  <p className="text-slate-700 dark:text-slate-300">{formatCurrency(selectedBooking.paymentInfo.charged)}</p>
                </div>
                {selectedBooking.paymentInfo.refunded > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Refunded</p>
                    <p className="text-red-600">{formatCurrency(selectedBooking.paymentInfo.refunded)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {selectedBooking.status !== 'Cancelled' && (
                <>
                  <Button variant="outline" size="sm">
                    <Pencil className="h-3.5 w-3.5" /> Modify Booking
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => { setSelectedBooking(null); setShowCancelConfirm(selectedBooking); }}>
                    <XCircle className="h-3.5 w-3.5" /> Cancel Booking
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" className="ml-auto">
                <FileText className="h-3.5 w-3.5" /> Export Details
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        open={!!showCancelConfirm}
        onClose={() => setShowCancelConfirm(null)}
        title="Cancel Booking"
        size="sm"
      >
        {showCancelConfirm && (
          <div>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
              Are you sure you want to cancel booking <span className="font-mono font-semibold">{showCancelConfirm.id}</span> for{' '}
              <span className="font-semibold">{showCancelConfirm.travelerName}</span>?
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700 dark:text-red-400">
                This will cancel the reservation at <span className="font-medium">{showCancelConfirm.property}</span> for{' '}
                {showCancelConfirm.dates}. A refund of {formatCurrency(showCancelConfirm.paymentInfo.charged)} will be processed.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCancelConfirm(null)}>
                Keep Booking
              </Button>
              <Button variant="danger" size="sm" onClick={() => setShowCancelConfirm(null)}>
                Confirm Cancellation
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
