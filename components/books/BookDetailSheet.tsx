'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/ui/image';
import { Book } from '@/types';
import { COVER_FALLBACK } from '@/lib/placeholder';
import { BookOpen, Book as BookIconLucide, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type AvailabilityStatus = 'Available' | 'Checked Out' | 'Reserved';

interface BookDetailSheetProps {
  book: Book | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookDetailSheet({ book, open, onOpenChange }: BookDetailSheetProps) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      // Save the currently focused element before sheet opens
      previousFocus.current = document.activeElement as HTMLElement;
    } else if (previousFocus.current) {
      // Return focus to the previously focused element when sheet closes
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  }, [open]);

  const [borrowOpen, setBorrowOpen] = useState(false);
  const queryClient = useQueryClient();
  const bookId = book?.id ?? '';
  const { data: record, isLoading, error } = useQuery({
    queryKey: ['borrow-record', bookId],
    queryFn: async () => {
      const res = await fetch(`/api/borrow-records?book_id=${bookId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load borrow record');
      return res.json();
    },
    enabled: open && !!book,
  });

  // Hooks must run on every render, so the early return comes after them.
  if (!book) return null;

  const statusRaw = book.availability_status ?? 'Available';
  const isAvailable = statusRaw === 'Available';
  const statusVariant =
    statusRaw === 'Available' ? 'success' : statusRaw === 'Reserved' ? 'warning' : 'destructive';

  const handleCheckout = async () => {
    if (!isAvailable) {
      toast.info('This book is currently not available for checkout.');
      return;
    }
    try {
      const res = await fetch('/api/borrow-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: book.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to check out book');
      }
      toast.success('Book checked out successfully!');
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['borrow-record', book.id] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to check out book');
    }
  };

  const handleReserve = () => {
    toast.info('Reserve functionality coming soon.');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[500px]">
        <SheetHeader>
          <SheetTitle>{book.title}</SheetTitle>
          <SheetDescription>
            {book.author} · {book.genre} · ISBN: {book.isbn ?? 'N/A'}
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
            <Image
              src={book.cover_url || COVER_FALLBACK}
              alt={book.title}
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className="object-cover"
              onError={(e) => {
                e.currentTarget.src = COVER_FALLBACK;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute top-2 right-2 flex gap-2">
              <Badge variant="outline">{book.genre}</Badge>
              <Badge variant={statusVariant}>{statusRaw}</Badge>
            </div>
          </div>

          <div className="col-span-2 space-y-4">
            <div className="space-y-2">
              <p className="font-semibold">Description</p>
              <p className="text-muted-foreground text-sm line-clamp-4">
                {book.description ?? 'No description available.'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold">Details</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" /> Total copies: {book.total_copies}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookIconLucide className="h-4 w-4" /> Available: {book.available_copies}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-4 w-4" /> Rack: {book.location_rack ?? 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-4 w-4" /> Rating: {book.rating.toFixed(1)} / 5
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/50 border border-destructive/20 text-destructive text-sm">
                {error.message}
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading borrow status…
              </div>
            )}

            {!isLoading && !error && record && record.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Current borrower</p>
                <p className="text-sm">{record[0].user?.full_name ?? 'Unknown user'}</p>
                <p className="text-xs text-muted-foreground">Due: {new Date(record[0].due_date).toLocaleDateString()}</p>
              </div>
            )}

            <SheetFooter>
              <Button
                onClick={isAvailable ? handleCheckout : handleReserve}
                className="w-full"
                disabled={!isAvailable}
              >
                {isAvailable ? 'Check Out Book' : 'Reserve Book'}
              </Button>
            </SheetFooter>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}