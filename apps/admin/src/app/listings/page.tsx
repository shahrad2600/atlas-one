'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/table';
import { Plus, Search, Pencil, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Listing {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'Active' | 'Pending' | 'Closed';
  rating: number;
  reviews: number;
  updatedAt: string;
}

const mockListings: Listing[] = [
  {
    id: 'lst_001',
    name: 'Grand Plaza Hotel',
    type: 'Hotel',
    location: 'New York, NY',
    status: 'Active',
    rating: 4.7,
    reviews: 1284,
    updatedAt: '2026-03-05T10:30:00Z',
  },
  {
    id: 'lst_002',
    name: 'Skyline Rooftop Bar',
    type: 'Restaurant',
    location: 'New York, NY',
    status: 'Active',
    rating: 4.5,
    reviews: 856,
    updatedAt: '2026-03-04T14:00:00Z',
  },
  {
    id: 'lst_003',
    name: 'Central Park Walking Tour',
    type: 'Experience',
    location: 'New York, NY',
    status: 'Active',
    rating: 4.9,
    reviews: 432,
    updatedAt: '2026-03-03T09:15:00Z',
  },
  {
    id: 'lst_004',
    name: 'Harbor View Suites',
    type: 'Hotel',
    location: 'San Francisco, CA',
    status: 'Pending',
    rating: 0,
    reviews: 0,
    updatedAt: '2026-03-07T16:45:00Z',
  },
  {
    id: 'lst_005',
    name: 'The Olive Garden Bistro',
    type: 'Restaurant',
    location: 'Los Angeles, CA',
    status: 'Active',
    rating: 4.3,
    reviews: 567,
    updatedAt: '2026-02-28T11:20:00Z',
  },
  {
    id: 'lst_006',
    name: 'Luxury Sedan Fleet',
    type: 'Rental',
    location: 'Miami, FL',
    status: 'Active',
    rating: 4.6,
    reviews: 189,
    updatedAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'lst_007',
    name: 'Downtown Boutique Hotel',
    type: 'Hotel',
    location: 'Chicago, IL',
    status: 'Closed',
    rating: 4.1,
    reviews: 923,
    updatedAt: '2026-01-15T12:00:00Z',
  },
  {
    id: 'lst_008',
    name: 'Sunset Kayak Adventure',
    type: 'Experience',
    location: 'San Diego, CA',
    status: 'Active',
    rating: 4.8,
    reviews: 312,
    updatedAt: '2026-03-06T17:30:00Z',
  },
];

const statusBadgeMap: Record<string, BadgeVariant> = {
  Active: 'success',
  Pending: 'warning',
  Closed: 'danger',
};

const PAGE_SIZE = 5;

export default function ListingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return mockListings.filter((l) => {
      const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.location.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
      const matchesType = typeFilter === 'All' || l.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [search, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Listings</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">{mockListings.length} total listings</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />}>Add Listing</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search listings..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="w-full sm:w-40">
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'Active', label: 'Active' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Closed', label: 'Closed' },
                ]}
              />
            </div>
            <div className="w-full sm:w-40">
              <Select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                options={[
                  { value: 'All', label: 'All Types' },
                  { value: 'Hotel', label: 'Hotel' },
                  { value: 'Restaurant', label: 'Restaurant' },
                  { value: 'Experience', label: 'Experience' },
                  { value: 'Rental', label: 'Rental' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Location</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Rating</TableHeader>
              <TableHeader>Reviews</TableHeader>
              <TableHeader>Last Updated</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((listing) => (
              <TableRow key={listing.id}>
                <TableCell className="font-medium text-slate-900">{listing.name}</TableCell>
                <TableCell>{listing.type}</TableCell>
                <TableCell>{listing.location}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeMap[listing.status]}>{listing.status}</Badge>
                </TableCell>
                <TableCell>
                  {listing.rating > 0 ? (
                    <span className="flex items-center gap-1">
                      <span className="text-amber-500">&#9733;</span>
                      {listing.rating.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-slate-400">--</span>
                  )}
                </TableCell>
                <TableCell>{listing.reviews.toLocaleString()}</TableCell>
                <TableCell>{formatDate(listing.updatedAt)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link href={`/listings/${listing.id}`}>
                      <Button variant="ghost" size="sm" icon={<Pencil className="h-3.5 w-3.5" />}>
                        Edit
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" icon={<ExternalLink className="h-3.5 w-3.5" />}>
                      View
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                  No listings found matching your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} results
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                icon={<ChevronRight className="h-4 w-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
