'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { StatCard } from '@/components/stat-card';
import { formatNumber } from '@/lib/utils';
import { Eye, Users, TrendingUp, Clock } from 'lucide-react';

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

const viewsData = [
  { date: 'Mar 1', views: 1250 },
  { date: 'Mar 2', views: 1380 },
  { date: 'Mar 3', views: 1420 },
  { date: 'Mar 4', views: 1310 },
  { date: 'Mar 5', views: 1580 },
  { date: 'Mar 6', views: 1690 },
  { date: 'Mar 7', views: 1820 },
  { date: 'Mar 8', views: 1540 },
  { date: 'Mar 9', views: 1450 },
  { date: 'Mar 10', views: 1670 },
  { date: 'Mar 11', views: 1730 },
  { date: 'Mar 12', views: 1890 },
  { date: 'Mar 13', views: 1950 },
  { date: 'Mar 14', views: 2010 },
];

const topListings = [
  { name: 'Grand Plaza Hotel', views: 8450 },
  { name: 'Skyline Rooftop Bar', views: 5230 },
  { name: 'Central Park Walking Tour', views: 3890 },
  { name: 'The Olive Garden Bistro', views: 3120 },
  { name: 'Luxury Sedan Fleet', views: 2340 },
];

const ratingDistribution = [
  { name: '5 Stars', value: 45, color: '#10b981' },
  { name: '4 Stars', value: 28, color: '#6366f1' },
  { name: '3 Stars', value: 15, color: '#f59e0b' },
  { name: '2 Stars', value: 8, color: '#f97316' },
  { name: '1 Star', value: 4, color: '#ef4444' },
];

const trafficSources = [
  { source: 'Direct', visits: 4520 },
  { source: 'Search', visits: 8340 },
  { source: 'Social', visits: 2890 },
  { source: 'Referral', visits: 1680 },
];

const competitorData = {
  yourRating: 4.5,
  categoryAverage: 4.1,
  yourReviews: 3062,
  categoryAverageReviews: 1840,
};

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Track performance across your listings</p>
        </div>
        <div className="w-48">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
              { value: '365', label: 'Last 1 year' },
            ]}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={fadeInUp}><StatCard
          icon={<Eye className="h-5 w-5" />}
          label="Page Views"
          value={formatNumber(24581)}
          change={12.5}
        /></motion.div>
        <motion.div variants={fadeInUp}><StatCard
          icon={<Users className="h-5 w-5" />}
          label="Unique Visitors"
          value={formatNumber(18432)}
          change={9.3}
        /></motion.div>
        <motion.div variants={fadeInUp}><StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Booking Conversions"
          value="3.8%"
          change={0.4}
        /></motion.div>
        <motion.div variants={fadeInUp}><StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Avg Time on Page"
          value="2m 34s"
          change={-2.1}
        /></motion.div>
      </motion.div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Views Over Time */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Views Over Time</h3>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={viewsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="views"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Listings */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Top Performing Listings</h3>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topListings} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    stroke="#94a3b8"
                    width={140}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="views" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Rating Distribution</h3>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratingDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value}%)`}
                  >
                    {ratingDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                    formatter={(value) => [`${value}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Traffic Sources</h3>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficSources}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="source" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="visits" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competitor Benchmarking */}
      <Card>
        <CardHeader>
          <h3 className="text-base font-semibold text-slate-900">Competitor Benchmarking</h3>
          <p className="text-sm text-slate-500 mt-1">Your performance vs. category average</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Rating Comparison */}
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Average Rating</p>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">Your Rating</span>
                    <span className="text-sm font-semibold text-slate-900">{competitorData.yourRating}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${(competitorData.yourRating / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">Category Average</span>
                    <span className="text-sm font-semibold text-slate-900">{competitorData.categoryAverage}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full"
                      style={{ width: `${(competitorData.categoryAverage / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Comparison */}
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Total Reviews</p>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">Your Reviews</span>
                    <span className="text-sm font-semibold text-slate-900">{formatNumber(competitorData.yourReviews)}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${(competitorData.yourReviews / Math.max(competitorData.yourReviews, competitorData.categoryAverageReviews)) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">Category Average</span>
                    <span className="text-sm font-semibold text-slate-900">{formatNumber(competitorData.categoryAverageReviews)}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-400 rounded-full"
                      style={{ width: `${(competitorData.categoryAverageReviews / Math.max(competitorData.yourReviews, competitorData.categoryAverageReviews)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
