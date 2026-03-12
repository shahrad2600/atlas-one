'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { Rating } from '@/components/ui/rating';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PlaceCardProps {
  image: string;
  title: string;
  location: string;
  rating: number;
  price?: string;
  href: string;
  category?: string;
  className?: string;
}

function PlaceCard({
  image,
  title,
  location,
  rating,
  price,
  href,
  category,
  className,
}: PlaceCardProps) {
  return (
    <Link href={href} className={cn('group block', className)}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="rounded-xl border border-[#E8E6E1] bg-white overflow-hidden shadow-elevation-1 hover:shadow-elevation-3 transition-shadow duration-300 dark:bg-[#1A1A1A] dark:border-[#2A2A2A]"
      >
        <div className="relative aspect-[4/3] bg-safari-100 dark:bg-safari-900 overflow-hidden">
          <Image
            src={image}
            alt={title}
            width={600}
            height={400}
            unoptimized
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          {category && (
            <Badge className="absolute top-3 left-3" variant="default">
              {category}
            </Badge>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-[#1A1A1A] dark:text-[#F5F3EF] group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
            {title}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-sm text-[#1A1A1A]/60 dark:text-[#F5F3EF]/60">
            <MapPin className="h-3.5 w-3.5" />
            <span className="line-clamp-1">{location}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <Rating value={rating} />
            {price && (
              <span className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F5F3EF]">
                {price}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export { PlaceCard, type PlaceCardProps };
