'use client';

import { useState } from 'react';
import {
  Search,
  ArrowUpDown,
  UserCheck,
  Eye,
  AlertTriangle,
  Clock,
  X,
  Send,
  MessageSquare,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';

type Priority = 'urgent' | 'high' | 'normal' | 'low';
type RequestType = 'Booking' | 'Change' | 'Cancel' | 'Information' | 'Complaint';
type TravelerTier = 'Standard' | 'Premium' | 'Luxury';
type FilterKey = 'all' | 'assigned' | 'unassigned' | 'urgent';

interface QueueRequest {
  id: string;
  travelerName: string;
  travelerTier: TravelerTier;
  type: RequestType;
  priority: Priority;
  subject: string;
  description: string;
  timeWaiting: string;
  assignedAgent: string | null;
  tripInfo?: string;
  history: string[];
}

const mockRequests: QueueRequest[] = [
  {
    id: 'REQ-4521',
    travelerName: 'James Morrison',
    travelerTier: 'Luxury',
    type: 'Complaint',
    priority: 'urgent',
    subject: 'Flight cancelled, need rebooking ASAP',
    description: 'My BA flight LHR-JFK tomorrow morning has been cancelled. I have a critical business meeting at 2pm ET and need to be rebooked on the earliest available flight. Willing to go via alternative airports if needed.',
    timeWaiting: '5m ago',
    assignedAgent: null,
    tripInfo: 'London to New York, Mar 9-14',
    history: ['Previous trip: Tokyo (Jan 2026)', '3 bookings this quarter', 'Luxury tier since 2024'],
  },
  {
    id: 'REQ-4519',
    travelerName: 'Mei Lin Wu',
    travelerTier: 'Premium',
    type: 'Booking',
    priority: 'urgent',
    subject: 'Honeymoon suite unavailable at Ritz Paris',
    description: 'We were promised a honeymoon suite at The Ritz Paris for March 20-25 but received a confirmation for a standard deluxe room. This is for our anniversary trip and the suite was specifically requested.',
    timeWaiting: '12m ago',
    assignedAgent: null,
    tripInfo: 'Paris, Mar 20-25',
    history: ['Member since 2023', 'Anniversary trip (5 years)', '12 trips booked total'],
  },
  {
    id: 'REQ-4517',
    travelerName: 'Alessandro Ricci',
    travelerTier: 'Luxury',
    type: 'Change',
    priority: 'high',
    subject: 'Extend stay at Four Seasons Florence by 2 nights',
    description: 'Would like to extend my current stay at the Four Seasons Florence from March 12 checkout to March 14. Same room if possible. Also need to adjust my return flight accordingly.',
    timeWaiting: '28m ago',
    assignedAgent: 'Sarah Chen',
    tripInfo: 'Florence, Mar 8-12 (extension requested)',
    history: ['VIP guest at Four Seasons', 'Frequent flyer - Delta Diamond', '28 trips this year'],
  },
  {
    id: 'REQ-4515',
    travelerName: 'Priya Sharma',
    travelerTier: 'Standard',
    type: 'Information',
    priority: 'high',
    subject: 'Visa requirements for multi-country trip',
    description: 'Planning a trip to Japan, South Korea, and Thailand in April. Indian passport holder. Need to know visa requirements, processing times, and if any can be done on arrival.',
    timeWaiting: '45m ago',
    assignedAgent: null,
    tripInfo: 'Japan-Korea-Thailand, Apr 5-20',
    history: ['New member', 'First international trip with Atlas', 'Researching phase'],
  },
  {
    id: 'REQ-4512',
    travelerName: 'Emma Thompson',
    travelerTier: 'Premium',
    type: 'Booking',
    priority: 'normal',
    subject: 'Restaurant reservation for group of 8',
    description: 'Need a reservation at a high-end restaurant in Barcelona for 8 people on March 15th, around 8:30pm. Preferably seafood or Mediterranean cuisine. One guest is vegetarian, one has a nut allergy.',
    timeWaiting: '1h ago',
    assignedAgent: 'Michael Park',
    tripInfo: 'Barcelona, Mar 13-18',
    history: ['Regular client', '6 dining reservations this year', 'Prefers Mediterranean cuisine'],
  },
  {
    id: 'REQ-4509',
    travelerName: 'David Park',
    travelerTier: 'Standard',
    type: 'Cancel',
    priority: 'normal',
    subject: 'Cancel Kyoto ryokan booking',
    description: 'Need to cancel my ryokan booking in Kyoto for March 22-24 due to a schedule change. Can I get a full refund? The booking was made 3 weeks ago.',
    timeWaiting: '1.5h ago',
    assignedAgent: null,
    tripInfo: 'Japan trip, Mar 18-28',
    history: ['2nd trip with Atlas', 'Cancelled once before', 'Budget-conscious traveler'],
  },
  {
    id: 'REQ-4507',
    travelerName: 'Sofia Martinez',
    travelerTier: 'Luxury',
    type: 'Booking',
    priority: 'high',
    subject: 'Private yacht charter in Santorini',
    description: 'Looking for a luxury private yacht charter in Santorini for June 10-12. Need a yacht that accommodates 6 guests with a private chef. Budget is flexible for the right experience.',
    timeWaiting: '2h ago',
    assignedAgent: 'Sarah Chen',
    tripInfo: 'Santorini, Jun 8-15',
    history: ['Top-tier client', 'Previous yacht charter in Amalfi', 'Avg booking value: $15k'],
  },
  {
    id: 'REQ-4504',
    travelerName: 'Robert Kim',
    travelerTier: 'Premium',
    type: 'Information',
    priority: 'low',
    subject: 'Loyalty points balance inquiry',
    description: 'Would like to know my current Trip Cash balance and what redemption options are available for my upcoming trip to Bali in May.',
    timeWaiting: '3h ago',
    assignedAgent: null,
    tripInfo: 'Bali, May 1-10',
    history: ['Trip Cash balance: 12,450 pts', 'Level 4 contributor', 'Active reviewer'],
  },
  {
    id: 'REQ-4501',
    travelerName: 'Hannah Weber',
    travelerTier: 'Standard',
    type: 'Complaint',
    priority: 'normal',
    subject: 'Hotel room not matching description',
    description: 'The room at Marina Bay Hotel Singapore does not match what was shown in the listing photos. The ocean view is actually a partial view with construction visible. Requesting a room change or compensation.',
    timeWaiting: '3.5h ago',
    assignedAgent: 'Michael Park',
    tripInfo: 'Singapore, Mar 5-10',
    history: ['First complaint filed', '4 trips total', 'Left 3 reviews'],
  },
  {
    id: 'REQ-4498',
    travelerName: 'Carlos Gutierrez',
    travelerTier: 'Premium',
    type: 'Change',
    priority: 'low',
    subject: 'Add airport transfer to existing booking',
    description: 'Would like to add a private airport transfer from Cancun International Airport to the resort on March 20. Arriving at 3:15pm on American Airlines flight 847. Party of 4 with luggage.',
    timeWaiting: '4h ago',
    assignedAgent: null,
    tripInfo: 'Cancun, Mar 20-27',
    history: ['Regular client', 'Previously booked transfers', 'Prefers private over shared'],
  },
];

const priorityConfig: Record<Priority, { label: string; color: string; border: string; sortWeight: number }> = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800', border: 'border-l-red-500', sortWeight: 4 },
  high: { label: 'High', color: 'bg-amber-100 text-amber-800', border: 'border-l-amber-500', sortWeight: 3 },
  normal: { label: 'Normal', color: 'bg-slate-100 text-slate-700', border: 'border-l-slate-400', sortWeight: 2 },
  low: { label: 'Low', color: 'bg-slate-50 text-slate-500', border: 'border-l-slate-300', sortWeight: 1 },
};

const tierConfig: Record<TravelerTier, { color: string }> = {
  Standard: { color: 'bg-slate-100 text-slate-700' },
  Premium: { color: 'bg-amber-100 text-amber-800' },
  Luxury: { color: 'bg-purple-100 text-purple-800' },
};

const typeConfig: Record<RequestType, { color: string }> = {
  Booking: { color: 'bg-emerald-100 text-emerald-800' },
  Change: { color: 'bg-sky-100 text-sky-800' },
  Cancel: { color: 'bg-red-100 text-red-800' },
  Information: { color: 'bg-slate-100 text-slate-700' },
  Complaint: { color: 'bg-amber-100 text-amber-800' },
};

const filterOptions: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'assigned', label: 'My Assigned' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'urgent', label: 'Urgent' },
];

const sortOptions = [
  { value: 'priority', label: 'Priority' },
  { value: 'time', label: 'Time Waiting' },
  { value: 'tier', label: 'Traveler Tier' },
];

export default function QueuePage() {
  const { agent } = useAuth();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState('priority');
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<QueueRequest | null>(null);
  const [replyText, setReplyText] = useState('');

  const filtered = mockRequests
    .filter((req) => {
      if (filter === 'assigned') return req.assignedAgent === agent?.displayName;
      if (filter === 'unassigned') return req.assignedAgent === null;
      if (filter === 'urgent') return req.priority === 'urgent';
      return true;
    })
    .filter((req) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        req.travelerName.toLowerCase().includes(q) ||
        req.subject.toLowerCase().includes(q) ||
        req.id.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === 'priority') return priorityConfig[b.priority].sortWeight - priorityConfig[a.priority].sortWeight;
      if (sort === 'tier') {
        const tierWeight: Record<TravelerTier, number> = { Luxury: 3, Premium: 2, Standard: 1 };
        return tierWeight[b.travelerTier] - tierWeight[a.travelerTier];
      }
      return 0;
    });

  return (
    <div className="flex h-full">
      {/* Left - Request List */}
      <div className={cn('flex flex-col flex-1 min-w-0', selectedRequest && 'max-w-[55%]')}>
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Request Queue</h1>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-slate-400" />
              <Select
                options={sortOptions}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-36"
              />
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 mb-4">
            {filterOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  filter === opt.key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Input
            placeholder="Search by name, subject, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        {/* Request Cards */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
          {filtered.map((req) => {
            const pConfig = priorityConfig[req.priority];
            const tConfig = tierConfig[req.travelerTier];
            const tyConfig = typeConfig[req.type];
            const isSelected = selectedRequest?.id === req.id;
            return (
              <Card
                key={req.id}
                className={cn(
                  'border-l-4 cursor-pointer hover:shadow-md transition-all',
                  pConfig.border,
                  isSelected && 'ring-2 ring-emerald-500',
                )}
                onClick={() => setSelectedRequest(req)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={req.travelerName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{req.travelerName}</span>
                        <Badge className={tConfig.color}>{req.travelerTier}</Badge>
                        <Badge className={tyConfig.color}>{req.type}</Badge>
                        <Badge className={pConfig.color}>{pConfig.label}</Badge>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">{req.subject}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {req.timeWaiting}
                        </span>
                        <span>{req.id}</span>
                        {req.assignedAgent && (
                          <span className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            {req.assignedAgent}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!req.assignedAgent && (
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); }}>
                          <UserCheck className="h-3.5 w-3.5" /> Assign
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      {req.priority !== 'urgent' && (
                        <Button variant="ghost" size="sm" className="text-amber-600 hover:bg-amber-50" onClick={(e) => { e.stopPropagation(); }}>
                          <AlertTriangle className="h-3.5 w-3.5" /> Escalate
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No requests match your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Right - Detail Panel */}
      {selectedRequest && (
        <div className="w-[45%] border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedRequest.id}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{selectedRequest.type} Request</p>
            </div>
            <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Traveler Info */}
            <div className="flex items-center gap-3">
              <Avatar name={selectedRequest.travelerName} size="lg" />
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{selectedRequest.travelerName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={tierConfig[selectedRequest.travelerTier].color}>{selectedRequest.travelerTier}</Badge>
                  <Badge className={priorityConfig[selectedRequest.priority].color}>{priorityConfig[selectedRequest.priority].label}</Badge>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Subject</p>
                <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">{selectedRequest.subject}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedRequest.description}</p>
              </div>
              {selectedRequest.tripInfo && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span>{selectedRequest.tripInfo}</span>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {selectedRequest.timeWaiting}</span>
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {selectedRequest.id}</span>
              </div>
            </div>

            {/* Assigned Agent */}
            <div>
              <p className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2">Assigned Agent</p>
              {selectedRequest.assignedAgent ? (
                <div className="flex items-center gap-2">
                  <Avatar name={selectedRequest.assignedAgent} size="sm" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedRequest.assignedAgent}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400 dark:text-slate-500 italic">Unassigned</span>
                  <Button variant="default" size="sm">
                    <UserCheck className="h-3.5 w-3.5" /> Assign to Me
                  </Button>
                </div>
              )}
            </div>

            {/* Traveler History */}
            <div>
              <p className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2">Traveler History</p>
              <ul className="space-y-1.5">
                {selectedRequest.history.map((item, i) => (
                  <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Response */}
            <div>
              <p className="text-xs font-medium uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-2">Quick Response</p>
              <Textarea
                placeholder="Type your response..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm">
                  <Send className="h-3.5 w-3.5" /> Send Response
                </Button>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-3.5 w-3.5" /> Open Chat
                </Button>
                <Button variant="ghost" size="sm" className="text-amber-600 hover:bg-amber-50 ml-auto">
                  <AlertTriangle className="h-3.5 w-3.5" /> Escalate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
