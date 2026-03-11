'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/stat-card';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Eye, CalendarCheck, DollarSign, Star, Plus, BarChart3, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const bookingsData = [
  { month: 'Jan', bookings: 45 },
  { month: 'Feb', bookings: 52 },
  { month: 'Mar', bookings: 61 },
  { month: 'Apr', bookings: 58 },
  { month: 'May', bookings: 73 },
  { month: 'Jun', bookings: 89 },
  { month: 'Jul', bookings: 102 },
  { month: 'Aug', bookings: 98 },
  { month: 'Sep', bookings: 85 },
  { month: 'Oct', bookings: 79 },
  { month: 'Nov', bookings: 67 },
  { month: 'Dec', bookings: 94 },
];

const revenueData = [
  { category: 'Hotel', revenue: 28500 },
  { category: 'Restaurant', revenue: 9800 },
  { category: 'Experience', revenue: 6930 },
];

const recentActivity = [
  {
    id: '1',
    type: 'Booking',
    description: 'New reservation at Grand Plaza Suite',
    date: '2026-03-08T09:15:00Z',
    status: 'confirmed' as const,
  },
  {
    id: '2',
    type: 'Review',
    description: 'New 5-star review from Jennifer L.',
    date: '2026-03-07T16:42:00Z',
    status: 'new' as const,
  },
  {
    id: '3',
    type: 'Booking',
    description: 'Cancellation request for Deluxe Room',
    date: '2026-03-07T14:20:00Z',
    status: 'cancelled' as const,
  },
  {
    id: '4',
    type: 'Payment',
    description: 'Payout of $3,450.00 processed',
    date: '2026-03-06T10:00:00Z',
    status: 'completed' as const,
  },
  {
    id: '5',
    type: 'Listing',
    description: 'Rooftop Bar listing approved',
    date: '2026-03-06T08:30:00Z',
    status: 'approved' as const,
  },
];

const statusBadgeMap: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'outline'> = {
  confirmed: 'success',
  new: 'default',
  cancelled: 'danger',
  completed: 'success',
  approved: 'success',
};

export default function DashboardPage() {
  const { user } = useAuth();

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Welcome back, {user?.displayName?.split(' ')[0] ?? 'Partner'}
        </h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">{dateStr}</p>
      </div>

      {/* Stat Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={item}>
          <StatCard
            icon={<Eye className="h-5 w-5" />}
            label="Total Views"
            value="24,581"
            change={12.5}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            icon={<CalendarCheck className="h-5 w-5" />}
            label="Bookings"
            value="342"
            change={8.2}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Revenue"
            value={formatCurrency(45230)}
            change={15.3}
          />
        </motion.div>
        <motion.div variants={item}>
          <StatCard
            icon={<Star className="h-5 w-5" />}
            label="Reviews"
            value="89"
            change={5.1}
          />
        </motion.div>
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Bookings Chart */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Bookings Over Time</h3>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bookingsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
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
                    dataKey="bookings"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={{ fill: '#4f46e5', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Revenue by Category</h3>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h3>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Status</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentActivity.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.type}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{formatDate(item.date)}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeMap[item.status] ?? 'outline'}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <h3 className="text-base font-semibold text-slate-900 mb-4 dark:text-slate-100">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/listings">
            <Button icon={<Plus className="h-4 w-4" />}>Add Listing</Button>
          </Link>
          <Link href="/analytics">
            <Button variant="outline" icon={<BarChart3 className="h-4 w-4" />}>
              View Analytics
            </Button>
          </Link>
          <Link href="/reviews">
            <Button variant="outline" icon={<MessageSquare className="h-4 w-4" />}>
              Respond to Reviews
            </Button>
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
