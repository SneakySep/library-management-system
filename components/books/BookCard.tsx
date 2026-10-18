'use client';

import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { Book } from '@/types';
import { BookOpen } from 'lucide-react';
import { COVER_FALLBACK } from '@/lib/placeholder';

type AvailabilityStatus = 'Available' | 'Checked Out' | 'Reserved';

const STATUS_STYLE: Record<AvailabilityStatus, { variant: 'success' | 'destructive' | 'warning'; label: string }> = {
  Available: { variant: 'success', label: 'Available' },
  'Checked Out': { variant: 'destructive', label: 'Checked Out' },
  Reserved: { variant: 'warning', label: 'Reserved' },
};

interface BookCardProps {
  book: Book;
  onSelect?: (book: Book) => void;
}

export function BookCard({ book, onSelect }: BookCardProps) {
  const statusRaw = (book.availability_status ?? 'Available') as AvailabilityStatus;
  const status = STATUS_STYLE[statusRaw];
  const cover = book.cover_url || COVER_FALLBACK;
  const isAvailable = statusRaw === 'Available';

  return (
    <Card
      className="group overflow-hidden border-border shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft-lg"
      onClick={() => onSelect?.(book)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(book);
        }
      }}
    >
      <CardHeader className="relative aspect-[4/5] overflow-hidden px-0 pt-0">
        <Image
          src={cover}
          alt={book.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2ZkNGRiIi8+PC9zdmc+"
          onError={(e) => {
            e.currentTarget.src = COVER_FALLBACK;
          }}
        />
        <Badge className="absolute left-2 top-2 z-20" variant="outline">
          {book.genre}
        </Badge>
        <Badge className="absolute right-2 top-2 z-20" variant={status.variant}>
          {status.label}
        </Badge>
        {!isAvailable && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <h3 className="font-semibold leading-tight line-clamp-2">{book.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-1">{book.author}</p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{book.location_rack}</span>
          <Badge variant={isAvailable ? 'success' : 'secondary'} className="h-6 px-2">
            {book.available_copies} of {book.total_copies}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="px-4 pt-2">
        <Button
          variant={isAvailable ? 'default' : 'outline'}
          className="h-9 w-full text-xs"
          disabled={!isAvailable}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(book);
          }}
        >
          {isAvailable ? 'Check Out' : 'Reserve'}
        </Button>
      </CardFooter>
    </Card>
  );
}
