'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/stat-card';
import { formatNumber } from '@/lib/utils';
import {
  Gift,
  Plus,
  X,
  Power,
  PowerOff,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Calendar,
  Tag,
  Sparkles,
} from 'lucide-react';

/* ---------- Mock Data ---------- */

interface Perk {
  id: string;
  type: string;
  description: string;
  value: string;
  conditions: string;
  validFrom: string;
  validTo: string;
  active: boolean;
  redemptions: number;
  bookingInfluence: number;
  revenueImpact: number;
}

const initialPerks: Perk[] = [
  {
    id: 'pk1',
    type: 'Upgrade',
    description: 'Complimentary room upgrade to next category (subject to availability)',
    value: '$350 avg value',
    conditions: 'Minimum 2-night stay. Not combinable with other promotions.',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    active: true,
    redemptions: 142,
    bookingInfluence: 23.4,
    revenueImpact: 49700,
  },
  {
    id: 'pk2',
    type: 'Breakfast',
    description: 'Full breakfast for two daily at Le Jardin restaurant',
    value: '$120 per day',
    conditions: 'Available for all room categories. In-room breakfast available upon request.',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    active: true,
    redemptions: 298,
    bookingInfluence: 31.2,
    revenueImpact: 35760,
  },
  {
    id: 'pk3',
    type: 'Credit',
    description: '$100 hotel credit per stay',
    value: '$100',
    conditions: 'Applicable to spa, dining, or minibar. Cannot be exchanged for cash.',
    validFrom: '2026-01-01',
    validTo: '2026-06-30',
    active: true,
    redemptions: 187,
    bookingInfluence: 18.6,
    revenueImpact: 18700,
  },
  {
    id: 'pk4',
    type: 'Late Checkout',
    description: 'Guaranteed 4PM late checkout',
    value: '$150 avg value',
    conditions: 'Subject to operational requirements. Must request at check-in.',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    active: true,
    redemptions: 221,
    bookingInfluence: 15.8,
    revenueImpact: 33150,
  },
  {
    id: 'pk5',
    type: 'Welcome',
    description: 'Champagne & artisan macarons welcome amenity',
    value: '$85',
    conditions: 'Delivered to room within 30 minutes of check-in.',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    active: true,
    redemptions: 312,
    bookingInfluence: 12.1,
    revenueImpact: 26520,
  },
  {
    id: 'pk6',
    type: 'Experience',
    description: 'Complimentary private guided tour of Musee d\'Orsay',
    value: '$250',
    conditions: 'Minimum 3-night stay. Advance booking required (48 hours).',
    validFrom: '2026-03-01',
    validTo: '2026-09-30',
    active: false,
    redemptions: 34,
    bookingInfluence: 8.3,
    revenueImpact: 8500,
  },
];

const perkTypeOptions = [
  { value: 'Upgrade', label: 'Room Upgrade' },
  { value: 'Breakfast', label: 'Breakfast' },
  { value: 'Credit', label: 'Hotel Credit' },
  { value: 'Late Checkout', label: 'Late Checkout' },
  { value: 'Welcome', label: 'Welcome Amenity' },
  { value: 'Experience', label: 'Experience' },
  { value: 'Spa', label: 'Spa Treatment' },
  { value: 'Transfer', label: 'Airport Transfer' },
  { value: 'Dining', label: 'Dining Credit' },
];

const perkTypeColors: Record<string, string> = {
  Upgrade: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-300',
  Breakfast: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300',
  Credit: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Late Checkout': 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300',
  Welcome: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-900/30 dark:text-rose-300',
  Experience: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-900/30 dark:text-indigo-300',
  Spa: 'bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-900/30 dark:text-teal-300',
  Transfer: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-900/30 dark:text-sky-300',
  Dining: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-900/30 dark:text-orange-300',
};

/* ---------- Component ---------- */

export default function SupplierPerksPage() {
  const [perks, setPerks] = useState(initialPerks);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New perk form state
  const [newPerk, setNewPerk] = useState({
    type: 'Upgrade',
    description: '',
    value: '',
    conditions: '',
    validFrom: '',
    validTo: '',
  });

  const totalRedemptions = perks.reduce((s, p) => s + p.redemptions, 0);
  const avgInfluence = (perks.filter((p) => p.active).reduce((s, p) => s + p.bookingInfluence, 0) / perks.filter((p) => p.active).length).toFixed(1);
  const totalRevenue = perks.reduce((s, p) => s + p.revenueImpact, 0);
  const activeCount = perks.filter((p) => p.active).length;

  const togglePerk = (id: string) => {
    setPerks((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    );
  };

  const handleCreate = () => {
    const perk: Perk = {
      id: `pk${Date.now()}`,
      ...newPerk,
      active: true,
      redemptions: 0,
      bookingInfluence: 0,
      revenueImpact: 0,
    };
    setPerks((prev) => [perk, ...prev]);
    setNewPerk({ type: 'Upgrade', description: '', value: '', conditions: '', validFrom: '', validTo: '' });
    setShowCreateForm(false);
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Perks Management</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Create and manage exclusive perks for your guests</p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} icon={showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}>
          {showCreateForm ? 'Cancel' : 'New Perk'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Gift className="h-5 w-5" />} label="Active Perks" value={activeCount.toString()} change={2.0} />
        <StatCard icon={<Users className="h-5 w-5" />} label="Total Redemptions" value={formatNumber(totalRedemptions)} change={12.8} />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Avg Booking Influence" value={`${avgInfluence}%`} change={3.2} />
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Revenue Impact" value={`$${formatNumber(totalRevenue)}`} change={9.4} />
      </div>

      {/* Create Perk Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-brand-200 dark:border-brand-700 shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Create New Perk</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <Select
                    label="Perk Type"
                    value={newPerk.type}
                    onChange={(e) => setNewPerk({ ...newPerk, type: e.target.value })}
                    options={perkTypeOptions}
                  />
                  <Input
                    label="Value"
                    placeholder="e.g., $100 or $350 avg value"
                    value={newPerk.value}
                    onChange={(e) => setNewPerk({ ...newPerk, value: e.target.value })}
                  />
                  <div className="sm:col-span-2 lg:col-span-1">
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Valid From"
                        type="date"
                        value={newPerk.validFrom}
                        onChange={(e) => setNewPerk({ ...newPerk, validFrom: e.target.value })}
                      />
                      <Input
                        label="Valid To"
                        type="date"
                        value={newPerk.validTo}
                        onChange={(e) => setNewPerk({ ...newPerk, validTo: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <Textarea
                    label="Description"
                    placeholder="Describe the perk guests will receive..."
                    value={newPerk.description}
                    onChange={(e) => setNewPerk({ ...newPerk, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="mt-4">
                  <Textarea
                    label="Conditions"
                    placeholder="Any conditions or restrictions..."
                    value={newPerk.conditions}
                    onChange={(e) => setNewPerk({ ...newPerk, conditions: e.target.value })}
                    rows={2}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex justify-end gap-3 w-full">
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newPerk.description.trim() || !newPerk.value.trim()}
                    icon={<Plus className="h-4 w-4" />}
                  >
                    Create Perk
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Perks List */}
      <div className="space-y-4">
        {perks.map((perk) => {
          const isExpanded = expandedId === perk.id;

          return (
            <Card key={perk.id} className={!perk.active ? 'opacity-60' : ''}>
              <CardContent className="py-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                      <Gift className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          perkTypeColors[perk.type] || 'bg-slate-50 text-slate-700 ring-slate-200'
                        }`}
                      >
                        {perk.type}
                      </span>
                      <Badge variant={perk.active ? 'success' : 'outline'}>
                        {perk.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {perk.validFrom} to {perk.validTo}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1.5">{perk.description}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Tag className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm text-slate-500 dark:text-slate-400">{perk.value}</span>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Conditions</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{perk.conditions}</p>

                            {/* Performance Stats */}
                            <div className="grid grid-cols-3 gap-4 mt-4">
                              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{formatNumber(perk.redemptions)}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Redemptions</p>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{perk.bookingInfluence}%</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Booking Influence</p>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">${formatNumber(perk.revenueImpact)}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Revenue Impact</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => togglePerk(perk.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        perk.active
                          ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20'
                          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={perk.active ? 'Deactivate perk' : 'Activate perk'}
                    >
                      {perk.active ? <Power className="h-5 w-5" /> : <PowerOff className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : perk.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}
