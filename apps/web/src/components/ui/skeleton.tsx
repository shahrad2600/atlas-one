import { cn } from '@/lib/utils';

const variantMap = {
  text: 'h-4 w-full rounded',
  circle: 'h-10 w-10 rounded-full',
  card: 'h-48 w-full rounded-xl',
};

interface SkeletonProps {
  variant?: keyof typeof variantMap;
  className?: string;
}

function Skeleton({ variant = 'text', className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-slate-200 dark:bg-slate-700',
        'bg-[length:200%_100%] bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700',
        'animate-shimmer',
        variantMap[variant],
        className,
      )}
    />
  );
}

export { Skeleton, type SkeletonProps };
