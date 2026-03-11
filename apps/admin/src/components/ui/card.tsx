'use client';

import { type HTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  animated?: boolean;
}

export function Card({ className, animated, ...props }: CardProps) {
  if (animated) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={cn(
          'bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 dark:bg-slate-800 dark:border-slate-700',
          className,
        )}
        {...(props as HTMLMotionProps<'div'>)}
      />
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-700',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-b border-slate-200 dark:border-slate-700', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4', className)} {...props} />
  );
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg dark:border-slate-700 dark:bg-slate-800/50',
        className,
      )}
      {...props}
    />
  );
}

export type { CardProps };
