'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { StatCard } from '@/components/stat-card';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Plus, Mail, Star, BarChart3, Upload, Send } from 'lucide-react';

interface ReviewCampaign {
  id: string;
  name: string;
  listing: string;
  emailsSent: number;
  reviewsReceived: number;
  date: string;
  status: 'Sent' | 'Scheduled' | 'Draft';
}

const mockCampaigns: ReviewCampaign[] = [
  {
    id: 'rc_001',
    name: 'March Guest Follow-Up',
    listing: 'Grand Plaza Hotel',
    emailsSent: 245,
    reviewsReceived: 38,
    date: '2026-03-05T10:00:00Z',
    status: 'Sent',
  },
  {
    id: 'rc_002',
    name: 'February Dining Guests',
    listing: 'Skyline Rooftop Bar',
    emailsSent: 180,
    reviewsReceived: 24,
    date: '2026-02-28T09:00:00Z',
    status: 'Sent',
  },
  {
    id: 'rc_003',
    name: 'Tour Participants - Spring',
    listing: 'Central Park Walking Tour',
    emailsSent: 0,
    reviewsReceived: 0,
    date: '2026-03-15T08:00:00Z',
    status: 'Scheduled',
  },
];

const statusBadgeMap: Record<string, BadgeVariant> = {
  Sent: 'success',
  Scheduled: 'default',
  Draft: 'outline',
};

export default function ReviewExpressPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState('');
  const [emailMessage, setEmailMessage] = useState(
    'Dear Guest,\n\nThank you for choosing us for your recent visit. We hope you had a wonderful experience! Your feedback helps us improve and helps other travelers make informed decisions.\n\nWould you mind taking a moment to share your experience? It only takes a minute.\n\nBest regards,\nThe Team',
  );
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const totalSent = mockCampaigns.reduce((sum, c) => sum + c.emailsSent, 0);
  const totalReceived = mockCampaigns.reduce((sum, c) => sum + c.reviewsReceived, 0);
  const responseRate = totalSent > 0 ? ((totalReceived / totalSent) * 100).toFixed(1) : '0';

  const handleSend = async () => {
    if (!selectedListing) return;
    setSending(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSending(false);
    setCreateOpen(false);
    setSelectedListing('');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Review Express</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Send email campaigns to collect reviews from guests</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
          Create Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Mail className="h-5 w-5" />}
          label="Emails Sent"
          value={totalSent.toString()}
          change={18.2}
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Reviews Received"
          value={totalReceived.toString()}
          change={12.5}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Response Rate"
          value={`${responseRate}%`}
          change={1.8}
        />
      </div>

      {/* Campaign Table */}
      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Campaign Name</TableHeader>
              <TableHeader>Listing</TableHeader>
              <TableHeader>Emails Sent</TableHeader>
              <TableHeader>Reviews Received</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockCampaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium text-slate-900">{campaign.name}</TableCell>
                <TableCell>{campaign.listing}</TableCell>
                <TableCell>{campaign.emailsSent}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1">
                    {campaign.reviewsReceived}
                    {campaign.emailsSent > 0 && (
                      <span className="text-xs text-slate-400">
                        ({((campaign.reviewsReceived / campaign.emailsSent) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell>{formatDate(campaign.date)}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeMap[campaign.status]}>{campaign.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create Campaign Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Review Campaign" size="lg">
        <div className="space-y-5">
          <Select
            label="Select Listing"
            value={selectedListing}
            onChange={(e) => setSelectedListing(e.target.value)}
            placeholder="Choose a listing"
            options={[
              { value: 'Grand Plaza Hotel', label: 'Grand Plaza Hotel' },
              { value: 'Skyline Rooftop Bar', label: 'Skyline Rooftop Bar' },
              { value: 'Central Park Walking Tour', label: 'Central Park Walking Tour' },
              { value: 'The Olive Garden Bistro', label: 'The Olive Garden Bistro' },
            ]}
          />

          {/* Guest List Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Guest List</label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload CSV or Excel file</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Drag and drop or click to browse. Include name and email columns.</p>
            </div>
          </div>

          {/* Email Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Message</label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {showPreview ? (
              <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-800 min-h-[160px]">
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{emailMessage}</div>
              </div>
            ) : (
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={6}
              />
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              loading={sending}
              disabled={!selectedListing}
              icon={<Send className="h-4 w-4" />}
            >
              Send Campaign
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
