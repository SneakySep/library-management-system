'use client';

import { BookOpen, Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyState({ onClearFilters, hasFilters }: { onClearFilters?: () => void; hasFilters?: boolean } = {}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted mb-6">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold">No books found</h3>
      <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
        {hasFilters
          ? 'Try adjusting your filters or search query to find what you&rsquo;re looking for.'
          : 'The library catalog is currently empty.'}
      </p>
      <div className="flex items-center gap-2 mt-8">
        {hasFilters && onClearFilters ? (
          <Button variant="outline" onClick={onClearFilters}>
            <RefreshCw className="h-4 w-4" /> Clear filters
          </Button>
        ) : (
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        )}
      </div>
    </div>
  );
}