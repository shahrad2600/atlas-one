'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn, getInitials } from '@/lib/utils';

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-xl',
};

const pixelSizes: Record<keyof typeof sizeMap, number> = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

interface AvatarProps {
  src?: string;
  name: string;
  size?: keyof typeof sizeMap;
  className?: string;
}

function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (src && !error) {
    return (
      <div
        className={cn(
          'relative rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700',
          sizeMap[size],
          className,
        )}
      >
        <Image
          src={src}
          alt={name}
          width={pixelSizes[size]}
          height={pixelSizes[size]}
          unoptimized
          className={cn(
            'rounded-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-sky-100 text-sky-700 font-semibold flex items-center justify-center dark:bg-sky-900/40 dark:text-sky-300',
        sizeMap[size],
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}

export { Avatar, type AvatarProps };
