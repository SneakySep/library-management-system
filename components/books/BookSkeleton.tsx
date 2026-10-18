'use client';

import { motion } from 'framer-motion';

interface BookSkeletonProps {
  count?: number;
}

export function BookSkeleton({ count = 8 }: BookSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: Math.min(i * 0.04, 0.4) }}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-muted">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-background/70 to-transparent" />
          </div>
          <div className="space-y-3 p-4">
            <div className="h-3.5 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-3 w-1/4 rounded bg-muted" />
              <div className="h-5 w-14 rounded-full bg-muted" />
            </div>
            <div className="h-9 w-full rounded-md bg-muted" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
