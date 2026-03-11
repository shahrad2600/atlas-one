'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Plus, Pause, Play, BarChart3, MousePointer, Eye as EyeIcon, DollarSign } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  type: 'CPC' | 'CPM';
  status: 'Active' | 'Paused' | 'Draft';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

const mockCampaigns: Campaign[] = [
  {
    id: 'camp_001',
    name: 'Spring Hotel Promotion',
    type: 'CPC',
    status: 'Active',
    budget: 2500,
    spent: 1847.50,
    impressions: 125430,
    clicks: 3215,
    ctr: 2.56,
  },
  {
    id: 'camp_002',
    name: 'Rooftop Bar Brand Awareness',
    type: 'CPM',
    status: 'Active',
    budget: 1000,
    spent: 623.80,
    impressions: 89200,
    clicks: 1580,
    ctr: 1.77,
  },
  {
    id: 'camp_003',
    name: 'Summer Experience Deals',
    type: 'CPC',
    status: 'Draft',
    budget: 3000,
    spent: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
  },
];

const statusBadgeMap: Record<string, BadgeVariant> = {
  Active: 'success',
  Paused: 'warning',
  Draft: 'outline',
};

export default function AdvertisingPage() {
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('CPC');
  const [newBudget, setNewBudget] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [creating, setCreating] = useState(false);

  const toggleStatus = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return { ...c, status: c.status === 'Active' ? 'Paused' : 'Active' } as Campaign;
      }),
    );
  };

  const handleCreate = async () => {
    if (!newName || !newBudget) return;
    setCreating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const newCampaign: Campaign = {
      id: `camp_${Date.now()}`,
      name: newName,
      type: newType as 'CPC' | 'CPM',
      status: 'Draft',
      budget: parseFloat(newBudget),
      spent: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
    };
    setCampaigns((prev) => [...prev, newCampaign]);
    setNewName('');
    setNewType('CPC');
    setNewBudget('');
    setNewLocation('');
    setCreating(false);
    setCreateOpen(false);
  };

  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Advertising Campaigns</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Promote your listings to reach more travelers</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} icon={<Plus className="h-4 w-4" />}>
          Create Campaign
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-600 dark:text-brand-400">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Spent</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-600 dark:text-brand-400">
                <EyeIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Impressions</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(totalImpressions)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-600 dark:text-brand-400">
                <MousePointer className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Clicks</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(totalClicks)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-600 dark:text-brand-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Avg CTR</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Cards */}
      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardContent className="py-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{campaign.name}</h3>
                    <Badge variant={statusBadgeMap[campaign.status]}>{campaign.status}</Badge>
                    <Badge variant="outline">{campaign.type}</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Budget</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(campaign.budget)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Spent</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(campaign.spent)}</p>
                      {campaign.budget > 0 && (
                        <div className="mt-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-500 rounded-full"
                            style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Impressions</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatNumber(campaign.impressions)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Clicks</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatNumber(campaign.clicks)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">CTR</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{campaign.ctr.toFixed(2)}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {campaign.status !== 'Draft' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(campaign.id)}
                      icon={
                        campaign.status === 'Active' ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      {campaign.status === 'Active' ? 'Pause' : 'Resume'}
                    </Button>
                  )}
                  {campaign.status === 'Draft' && (
                    <Button size="sm" icon={<Play className="h-3.5 w-3.5" />}>
                      Launch
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Campaign Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Campaign" size="md">
        <div className="space-y-4">
          <Input
            label="Campaign Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Summer Hotel Promotion"
          />
          <Select
            label="Campaign Type"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            options={[
              { value: 'CPC', label: 'Cost Per Click (CPC)' },
              { value: 'CPM', label: 'Cost Per Thousand Impressions (CPM)' },
            ]}
          />
          <Input
            label="Daily Budget ($)"
            type="number"
            value={newBudget}
            onChange={(e) => setNewBudget(e.target.value)}
            placeholder="50.00"
          />
          <Input
            label="Target Locations"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="e.g., New York, Los Angeles, Miami"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!newName || !newBudget}
              icon={<Plus className="h-4 w-4" />}
            >
              Create Campaign
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
