'use client';

import { useState } from 'react';
import {
  Inbox,
  Clock,
  CheckCircle2,
  Star,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  CalendarCheck,
  Flag,
  MessageSquare,
  Send,
  PhoneCall,
  ShieldCheck,
  Gift,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const stats = [
  { label: 'Active Requests', value: '12', change: '+3 today', icon: Inbox, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  { label: 'Avg Response Time', value: '2.4 min', change: '-0.8 min', icon: Clock, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/30' },
  { label: 'Resolution Rate', value: '94%', change: '+2.1%', icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  { label: 'CSAT Score', value: '4.8/5', change: '+0.1', icon: Star, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30' },
];

interface PriorityRequest {
  id: string;
  travelerName: string;
  type: string;
  priority: 'urgent' | 'high' | 'normal';
  elapsed: string;
  subject: string;
}

const priorityRequests: PriorityRequest[] = [
  { id: 'REQ-4521', travelerName: 'James Morrison', type: 'Complaint', priority: 'urgent', elapsed: '5m ago', subject: 'Flight cancelled, need rebooking ASAP' },
  { id: 'REQ-4519', travelerName: 'Mei Lin Wu', type: 'Booking', priority: 'urgent', elapsed: '12m ago', subject: 'Honeymoon suite unavailable at Ritz Paris' },
  { id: 'REQ-4517', travelerName: 'Alessandro Ricci', type: 'Change', priority: 'high', elapsed: '28m ago', subject: 'Extend stay at Four Seasons Florence by 2 nights' },
  { id: 'REQ-4515', travelerName: 'Priya Sharma', type: 'Information', priority: 'high', elapsed: '45m ago', subject: 'Visa requirements for multi-country trip' },
  { id: 'REQ-4512', travelerName: 'Emma Thompson', type: 'Booking', priority: 'normal', elapsed: '1h ago', subject: 'Restaurant reservation for group of 8' },
];

const priorityConfig: Record<string, { label: string; color: string; border: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800', border: 'border-l-red-500' },
  high: { label: 'High', color: 'bg-amber-100 text-amber-800', border: 'border-l-amber-500' },
  normal: { label: 'Normal', color: 'bg-slate-100 text-slate-700', border: 'border-l-slate-400' },
};

interface ActivityEntry {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  text: string;
  time: string;
}

const recentActivity: ActivityEntry[] = [
  { id: 'a1', icon: UserPlus, iconColor: 'text-emerald-600', text: 'New request assigned from Mei Lin Wu', time: '2 min ago' },
  { id: 'a2', icon: CalendarCheck, iconColor: 'text-sky-600', text: 'Booking confirmed for Alessandro Ricci at Four Seasons', time: '8 min ago' },
  { id: 'a3', icon: Flag, iconColor: 'text-red-600', text: 'Review flagged for moderation - The Grand Budapest', time: '15 min ago' },
  { id: 'a4', icon: MessageSquare, iconColor: 'text-purple-600', text: 'Chat message from Emma Thompson about dinner plans', time: '22 min ago' },
  { id: 'a5', icon: Send, iconColor: 'text-emerald-600', text: 'Confirmation sent to Priya Sharma for visa documents', time: '35 min ago' },
  { id: 'a6', icon: PhoneCall, iconColor: 'text-amber-600', text: 'Escalation call completed with James Morrison', time: '48 min ago' },
  { id: 'a7', icon: ShieldCheck, iconColor: 'text-green-600', text: 'Moderation review approved - Sunset Beach Resort', time: '1h ago' },
  { id: 'a8', icon: Gift, iconColor: 'text-pink-600', text: 'Loyalty reward issued to David Park - 500 Trip Cash', time: '1h ago' },
];

export default function DashboardPage() {
  const { agent, updateStatus } = useAuth();
  const [status, setStatus] = useState<'online' | 'away'>(agent?.status === 'away' ? 'away' : 'online');

  const toggleStatus = () => {
    const next = status === 'online' ? 'away' : 'online';
    setStatus(next);
    updateStatus(next);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Concierge Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Welcome back, {agent?.displayName ?? 'Agent'}</p>
        </div>
        <button
          onClick={toggleStatus}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
            status === 'online'
              ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
          )}
        >
          <span className={cn('w-2 h-2 rounded-full', status === 'online' ? 'bg-green-500' : 'bg-amber-500')} />
          {status === 'online' ? 'Online' : 'Away'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4">
                <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl', stat.bg)}>
                  <Icon className={cn('h-6 w-6', stat.color)} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{stat.change}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Queue */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Priority Queue</h2>
            </div>
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {priorityRequests.map((req) => {
              const config = priorityConfig[req.priority];
              return (
                <div
                  key={req.id}
                  className={cn(
                    'flex items-start gap-3 px-6 py-4 border-l-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer',
                    config.border,
                  )}
                >
                  <Avatar name={req.travelerName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{req.travelerName}</span>
                      <Badge className={config.color}>{config.label}</Badge>
                      <Badge variant="outline">{req.type}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{req.subject}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{req.id} &middot; {req.elapsed}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">Updated just now</span>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {recentActivity.map((entry) => {
              const Icon = entry.icon;
              return (
                <div key={entry.id} className="flex items-start gap-3 px-6 py-3.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 shrink-0 mt-0.5">
                    <Icon className={cn('h-4 w-4', entry.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{entry.text}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{entry.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
