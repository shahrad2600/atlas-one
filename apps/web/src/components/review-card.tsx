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
}: ReviewCardProps) {
  const content = (
    <>
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={author} src={authorAvatar} size="sm" />
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {author}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{date}</p>
        </div>
      </div>
      <Rating value={rating} className="mb-2" />
      <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
        {title}
      </h4>
      <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
        {text}
      </p>
      <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500 dark:text-slate-400">
        <ThumbsUp className="h-3.5 w-3.5" />
        <span>{helpful} helpful</span>
      </div>
    </>
  );

  const cardClasses = cn(
    'rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800',
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
