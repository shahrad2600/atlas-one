'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { formatNumber } from '@/lib/utils';
import { Eye, Bookmark, CalendarCheck, TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/* ---------- Mock Data ---------- */

const engagementData = [
  { month: 'Apr', views: 12400, saves: 2100, bookingRequests: 380, conversions: 114 },
  { month: 'May', views: 13800, saves: 2350, bookingRequests: 420, conversions: 131 },
  { month: 'Jun', views: 16200, saves: 2890, bookingRequests: 510, conversions: 159 },
  { month: 'Jul', views: 19500, saves: 3420, bookingRequests: 620, conversions: 193 },
  { month: 'Aug', views: 21000, saves: 3680, bookingRequests: 680, conversions: 211 },
  { month: 'Sep', views: 18900, saves: 3310, bookingRequests: 590, conversions: 183 },
  { month: 'Oct', views: 16400, saves: 2870, bookingRequests: 510, conversions: 158 },
  { month: 'Nov', views: 14200, saves: 2480, bookingRequests: 440, conversions: 137 },
  { month: 'Dec', views: 15800, saves: 2770, bookingRequests: 490, conversions: 152 },
  { month: 'Jan', views: 13100, saves: 2290, bookingRequests: 410, conversions: 127 },
  { month: 'Feb', views: 15900, saves: 2780, bookingRequests: 510, conversions: 158 },
  { month: 'Mar', views: 18400, saves: 3840, bookingRequests: 624, conversions: 187 },
];

const rankingTrend = [
  { month: 'Apr', city: 6, country: 12, world: 58 },
  { month: 'May', city: 5, country: 11, world: 55 },
  { month: 'Jun', city: 5, country: 10, world: 52 },
  { month: 'Jul', city: 4, country: 9, world: 48 },
  { month: 'Aug', city: 4, country: 8, world: 46 },
  { month: 'Sep', city: 4, country: 8, world: 45 },
  { month: 'Oct', city: 3, country: 8, world: 44 },
  { month: 'Nov', city: 3, country: 7, world: 43 },
  { month: 'Dec', city: 3, country: 7, world: 43 },
  { month: 'Jan', city: 3, country: 7, world: 42 },
  { month: 'Feb', city: 3, country: 7, world: 42 },
  { month: 'Mar', city: 3, country: 7, world: 42 },
];

const scoreTrends = [
  { month: 'Apr', service: 91, physical: 88, dining: 86, location: 95, consistency: 84, emotional: 89 },
  { month: 'May', service: 92, physical: 89, dining: 87, location: 95, consistency: 85, emotional: 90 },
  { month: 'Jun', service: 93, physical: 90, dining: 88, location: 96, consistency: 85, emotional: 91 },
  { month: 'Jul', service: 93, physical: 90, dining: 88, location: 96, consistency: 86, emotional: 92 },
  { month: 'Aug', service: 94, physical: 91, dining: 89, location: 96, consistency: 87, emotional: 93 },
  { month: 'Sep', service: 94, physical: 91, dining: 89, location: 96, consistency: 87, emotional: 93 },
  { month: 'Oct', service: 95, physical: 92, dining: 90, location: 97, consistency: 88, emotional: 94 },
  { month: 'Nov', service: 95, physical: 92, dining: 90, location: 97, consistency: 88, emotional: 94 },
  { month: 'Dec', service: 95, physical: 92, dining: 90, location: 97, consistency: 88, emotional: 95 },
  { month: 'Jan', service: 96, physical: 93, dining: 91, location: 97, consistency: 89, emotional: 95 },
  { month: 'Feb', service: 96, physical: 93, dining: 91, location: 97, consistency: 89, emotional: 95 },
  { month: 'Mar', service: 96, physical: 93, dining: 91, location: 97, consistency: 89, emotional: 95 },
];

const reviewVolumeData = [
  { month: 'Apr', reviews: 18, avgScore: 89.2 },
  { month: 'May', reviews: 22, avgScore: 90.1 },
  { month: 'Jun', reviews: 28, avgScore: 91.4 },
  { month: 'Jul', reviews: 35, avgScore: 92.0 },
  { month: 'Aug', reviews: 38, avgScore: 92.3 },
  { month: 'Sep', reviews: 32, avgScore: 91.8 },
  { month: 'Oct', reviews: 26, avgScore: 92.5 },
  { month: 'Nov', reviews: 21, avgScore: 93.1 },
  { month: 'Dec', reviews: 24, avgScore: 93.4 },
  { month: 'Jan', reviews: 19, avgScore: 93.0 },
  { month: 'Feb', reviews: 23, avgScore: 93.6 },
  { month: 'Mar', reviews: 27, avgScore: 94.2 },
];

const competitors = [
  { name: 'The Langham, Paris (You)', score: 94.2, rank: 3, reviews: 313, trend: 'up' as const },
  { name: 'Le Bristol Paris', score: 96.1, rank: 1, reviews: 428, trend: 'stable' as const },
  { name: 'Four Seasons George V', score: 95.4, rank: 2, reviews: 512, trend: 'up' as const },
  { name: 'Ritz Paris', score: 93.8, rank: 4, reviews: 387, trend: 'down' as const },
  { name: 'Mandarin Oriental Paris', score: 93.1, rank: 5, reviews: 296, trend: 'up' as const },
  { name: 'Shangri-La Paris', score: 92.7, rank: 6, reviews: 341, trend: 'stable' as const },
];

const funnelData = [
  { stage: 'Views', value: 18432, pct: 100 },
  { stage: 'Saves', value: 3841, pct: 20.8 },
  { stage: 'Booking Requests', value: 624, pct: 3.4 },
  { stage: 'Conversions', value: 187, pct: 1.0 },
];

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '13px',
};

/* ---------- Component ---------- */

export default function SupplierAnalyticsPage() {
  const [dateRange, setDateRange] = useState('12');

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Supplier Analytics</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Performance metrics and competitive intelligence</p>
        </div>
        <div className="w-48">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: '3', label: 'Last 3 months' },
              { value: '6', label: 'Last 6 months' },
              { value: '12', label: 'Last 12 months' },
            ]}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={fadeUp}>
          <StatCard icon={<Eye className="h-5 w-5" />} label="Views (30d)" value={formatNumber(18432)} change={14.2} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard icon={<Bookmark className="h-5 w-5" />} label="Saves (30d)" value={formatNumber(3841)} change={8.7} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard icon={<CalendarCheck className="h-5 w-5" />} label="Booking Requests" value="624" change={11.3} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Conversion Rate" value="1.0%" change={6.1} />
        </motion.div>
      </motion.div>

      {/* Views/Saves/Booking Requests Over Time */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Engagement Over Time</h3>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="views" name="Views" stroke="#6366f1" fill="#6366f1" fillOpacity={0.08} strokeWidth={2} />
                <Area type="monotone" dataKey="saves" name="Saves" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} strokeWidth={2} />
                <Area type="monotone" dataKey="bookingRequests" name="Booking Requests" stroke="#10b981" fill="#10b981" fillOpacity={0.08} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking Trend */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Ranking Trend (12 Months)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Lower is better</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rankingTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" reversed />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="city" name="City (Paris)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="country" name="Country (France)" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="world" name="World" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Score Trends by Dimension */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Score Trends by Dimension</h3>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="service" name="Service" stroke="#6366f1" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="physical" name="Physical" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="dining" name="Dining" stroke="#10b981" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="location" name="Location" stroke="#ec4899" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="consistency" name="Consistency" stroke="#f97316" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="emotional" name="Emotional" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Volume and Average Scores */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Review Volume & Average Scores</h3>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reviewVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis yAxisId="right" orientation="right" domain={[85, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar yAxisId="left" dataKey="reviews" name="Reviews" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={28} />
                <Line yAxisId="right" type="monotone" dataKey="avgScore" name="Avg Score" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Competitor Benchmark Table */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Competitor Benchmark - Paris Luxury Hotels</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Your position vs. top 5 peers in the city</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Rank</TableHeader>
                <TableHeader>Property</TableHeader>
                <TableHeader>Luxury Score</TableHeader>
                <TableHeader>Reviews</TableHeader>
                <TableHeader>Trend</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {competitors.map((c) => {
                const isYou = c.name.includes('(You)');
                return (
                  <TableRow key={c.name} className={isYou ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}>
                    <TableCell>
                      <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                        c.rank <= 3
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {c.rank}
                      </span>
                    </TableCell>
                    <TableCell className={isYou ? 'font-semibold text-slate-900 dark:text-slate-100' : ''}>
                      {c.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${((c.score - 88) / 12) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{c.score}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatNumber(c.reviews)}</TableCell>
                    <TableCell>
                      {c.trend === 'up' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <ArrowUp className="h-3.5 w-3.5" /> Rising
                        </span>
                      )}
                      {c.trend === 'down' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                          <ArrowDown className="h-3.5 w-3.5" /> Falling
                        </span>
                      )}
                      {c.trend === 'stable' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <Minus className="h-3.5 w-3.5" /> Stable
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Conversion Funnel (Last 30 Days)</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnelData.map((step, idx) => {
              const colors = ['bg-indigo-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500'];
              const bgColors = ['bg-indigo-50 dark:bg-indigo-900/20', 'bg-amber-50 dark:bg-amber-900/20', 'bg-emerald-50 dark:bg-emerald-900/20', 'bg-purple-50 dark:bg-purple-900/20'];
              const dropOff = idx > 0 ? ((1 - funnelData[idx].value / funnelData[idx - 1].value) * 100).toFixed(1) : null;

              return (
                <div key={step.stage}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{step.stage}</span>
                      {dropOff && (
                        <span className="text-xs text-slate-400">
                          {dropOff}% drop-off
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatNumber(step.value)}</span>
                      <span className="text-xs text-slate-400">{step.pct}%</span>
                    </div>
                  </div>
                  <div className={`h-8 rounded-lg overflow-hidden ${bgColors[idx]}`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${step.pct}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.15 }}
                      className={`h-full rounded-lg ${colors[idx]} flex items-center justify-end pr-2`}
                      style={{ minWidth: step.pct > 5 ? undefined : '2rem' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
