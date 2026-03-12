'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingProps {
  value: number;
  count?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}

function Rating({ value, count, interactive, onChange, className }: RatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive =
          star <= Math.round(hovered !== null ? hovered : value);

        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={cn(
              'transition-transform duration-150 disabled:cursor-default',
              interactive && 'cursor-pointer hover:scale-110',
            )}
            onMouseEnter={interactive ? () => setHovered(star) : undefined}
            onMouseLeave={interactive ? () => setHovered(null) : undefined}
            onClick={
              interactive && onChange ? () => onChange(star) : undefined
            }
          >
            <Star
              className={cn(
                'h-4 w-4 transition-colors duration-150',
                isActive
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-safari-200 text-safari-200 dark:fill-safari-700 dark:text-safari-700',
              )}
            />
          </button>
        );
      })}
      {typeof count === 'number' && (
        <span className="text-sm text-[#3C2415]/60 dark:text-[#F5E6D3]/60 ml-1">
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}

export { Rating, type RatingProps };
