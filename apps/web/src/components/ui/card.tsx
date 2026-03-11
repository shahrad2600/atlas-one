'use client';

import { type HTMLAttributes } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  animated?: boolean;
}

function Card({ className, animated, ...props }: CardProps) {
  if (animated) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={cn(
          'rounded-xl border border-slate-200 bg-white shadow-elevation-1 hover:shadow-elevation-2 transition-shadow duration-300 dark:bg-slate-800 dark:border-slate-700',
          className,
        )}
        {...(props as HTMLMotionProps<'div'>)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-elevation-1 hover:shadow-elevation-2 transition-shadow duration-300 dark:bg-slate-800 dark:border-slate-700',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pb-0', className)} {...props} />;
}

function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 pb-6 pt-0 flex items-center', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardContent, CardFooter, type CardProps };
