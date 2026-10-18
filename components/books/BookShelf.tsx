'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/ui/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Book } from '@/types';
import { COVER_FALLBACK } from '@/lib/placeholder';
import { cn } from '@/lib/utils';

const SPINE_COLORS = [
  'bg-indigo-600', 'bg-rose-600', 'bg-amber-600', 'bg-emerald-600',
  'bg-blue-600', 'bg-purple-600', 'bg-cyan-600', 'bg-orange-600',
];

type AvailabilityStatus = 'Available' | 'Checked Out' | 'Reserved';

const STATUS_STYLE: Record<AvailabilityStatus, 'success' | 'destructive' | 'warning'> = {
  Available: 'success',
  'Checked Out': 'destructive',
  Reserved: 'warning',
};

export function BookShelf({ books, onSelect }: { books: Book[]; onSelect: (book: Book) => void }) {
  const shelfRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = shelfRef.current;
    if (!el) return;
    setScrollPosition(el.scrollLeft);
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = shelfRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState);
    updateScrollState();
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState]);

  const scrollLeft = () => {
    const el = shelfRef.current;
    if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
  };

  const scrollRight = () => {
    const el = shelfRef.current;
    if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
  };

  return (
    <section className="border-t border-border pt-10">
      <div className="relative">
        <div
          ref={shelfRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-shelf
        >
          <AnimatePresence>
            {books.map((book, idx) => {
              const statusRaw = (book.availability_status ?? 'Available') as AvailabilityStatus;
              const variant = STATUS_STYLE[statusRaw];
              const cover = book.cover_url || COVER_FALLBACK;
              return (
                <motion.div
                  key={book.id}
                  layoutId={`book-shelf-${book.id}`}
                  layout
                  onClick={() => onSelect(book)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(book);
                    }
                  }}
                  className={cn(
                    'shrink-0 w-20 h-80 rounded-xl overflow-hidden shadow-lg flex flex-col items-center px-2 cursor-pointer hover:shadow-xl transition-shadow',
                    SPINE_COLORS[idx % SPINE_COLORS.length]
                  )}
                >
                  <div className="mt-auto flex flex-col items-center gap-1 p-2">
                    <Image
                      src={cover}
                      alt={book.title}
                      width={48}
                      height={64}
                      className="h-16 w-12 rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.src = COVER_FALLBACK;
                      }}
                    />
                    <p className="text-[10px] text-center leading-tight line-clamp-2 font-medium">
                      {book.title}
                    </p>
                    <Badge className="w-16 text-[10px]" variant={variant}>
                      {statusRaw}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {canScrollLeft && (
          <button
            onClick={scrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background border border-input flex items-center justify-center shadow-lg z-20 hover:bg-primary hover:text-primary-foreground transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} className="rotate-180" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={scrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background border border-input flex items-center justify-center shadow-lg z-20 hover:bg-primary hover:text-primary-foreground transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </section>
  );
}