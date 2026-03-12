'use client';

import { motion } from 'framer-motion';
import { ThumbsUp } from 'lucide-react';
import { Rating } from '@/components/ui/rating';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ReviewCardProps {
  author: string;
  authorAvatar?: string;
  date: string;
  rating: number;
  title: string;
  text: string;
  helpful: number;
  className?: string;
  animated?: boolean;
  variant?: 'default' | 'overlay';
}

function ReviewCard({
  author,
  authorAvatar,
  date,
  rating,
  title,
  text,
  helpful,
  className,
  animated,
  variant = 'default',
}: ReviewCardProps) {
  const isOverlay = variant === 'overlay';

  const content = (
    <>
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={author} src={authorAvatar} size="sm" />
        <div>
          <p className={cn(
            'text-sm font-medium',
            isOverlay ? 'text-white' : 'text-[#3C2415] dark:text-[#F5E6D3]',
          )}>
            {author}
          </p>
          <p className={cn(
            'text-xs',
            isOverlay ? 'text-white/60' : 'text-[#3C2415]/50 dark:text-[#F5E6D3]/50',
          )}>{date}</p>
        </div>
      </div>
      <Rating value={rating} className="mb-2" />
      <h4 className={cn(
        'font-semibold font-heading mb-1',
        isOverlay ? 'text-white' : 'text-[#3C2415] dark:text-[#F5E6D3]',
      )}>
        {title}
      </h4>
      <p className={cn(
        'text-sm line-clamp-3',
        isOverlay ? 'text-white/80' : 'text-[#3C2415]/70 dark:text-[#F5E6D3]/70',
      )}>
        {text}
      </p>
      <div className={cn(
        'flex items-center gap-1.5 mt-3 text-xs',
        isOverlay ? 'text-brand-300' : 'text-brand-500/60 dark:text-brand-400/60',
      )}>
        <ThumbsUp className="h-3.5 w-3.5" />
        <span>{helpful} helpful</span>
      </div>
    </>
  );

  const cardClasses = cn(
    'rounded-xl p-5',
    isOverlay
      ? 'border border-white/10 bg-white/10 backdrop-blur-sm'
      : 'border border-[#CDB499]/40 bg-[#FDF5E6]/80 dark:border-[#50301C]/40 dark:bg-[#2C1810]/80',
    className,
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={cardClasses}
      >
        {content}
      </motion.div>
    );
  }

  return <div className={cardClasses}>{content}</div>;
}

export { ReviewCard, type ReviewCardProps };
