'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Calendar, Users, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TripCardProps {
  name: string;
  destination: string;
  dates: string;
  status: 'upcoming' | 'active' | 'completed' | 'draft';
  travelers: number;
  budget?: string;
  image: string;
  href: string;
  className?: string;
}

const statusVariant: Record<
  TripCardProps['status'],
  'default' | 'success' | 'warning' | 'outline'
> = {
  upcoming: 'default',
  active: 'success',
  completed: 'outline',
  draft: 'warning',
};

function TripCard({
  name,
  destination,
  dates,
  status,
  travelers,
  budget,
  image,
  href,
  className,
}: TripCardProps) {
  return (
    <Link href={href} className={cn('group block', className)}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-elevation-1 hover:shadow-elevation-3 transition-shadow duration-300 dark:bg-slate-800 dark:border-slate-700"
      >
        <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <Image
            src={image}
            alt={name}
            width={600}
            height={400}
            unoptimized
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          <Badge
            className="absolute top-3 right-3"
            variant={statusVariant[status]}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
            {name}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
            <MapPin className="h-3.5 w-3.5" />
            <span>{destination}</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {dates}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {travelers}
            </span>
          </div>
          {budget && (
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              {budget}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

export { TripCard, type TripCardProps };
