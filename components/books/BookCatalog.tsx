'use client';

import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, LayoutGrid, LayoutList, Filter, BookOpen, X, RefreshCw } from 'lucide-react';
import { BookCard } from './BookCard';
import { BookShelf } from './BookShelf';
import { BookSkeleton } from './BookSkeleton';
import { EmptyState } from './EmptyState';
import { BookDetailSheet } from './BookDetailSheet';
import { Book } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/layout/PageContainer';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'shelf';
type AvailabilityFilter = 'All' | 'Available' | 'Checked Out' | 'Reserved';

type Filters = {
  genre: string;
  availability: AvailabilityFilter;
  publicationYear: string;
  minRating: string;
};

const GENRES = ['All', 'Fiction', 'Non-Fiction', 'Science Fiction', 'Fantasy', 'Mystery', 'Biography', 'History', 'Technology', 'Children'];

const AVAILABILITY_VALUES: AvailabilityFilter[] = ['All', 'Available', 'Checked Out', 'Reserved'];

function parseAvailability(value: string | null): AvailabilityFilter {
  return value && AVAILABILITY_VALUES.includes(value as AvailabilityFilter)
    ? (value as AvailabilityFilter)
    : 'All';
}

function getActiveFilterCount(filters: Filters): number {
  let count = 0;
  if (filters.genre !== 'All') count++;
  if (filters.availability !== 'All') count++;
  if (filters.publicationYear !== '') count++;
  if (filters.minRating !== '') count++;
  return count;
}

export function BookCatalog() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewMode>('grid');
  const [query, setQuery] = useState(() => searchParams.get('search') ?? '');
  const [filters, setFilters] = useState<Filters>(() => ({
    genre: searchParams.get('genre') ?? 'All',
    availability: parseAvailability(searchParams.get('availability')),
    publicationYear: searchParams.get('publication_year') ?? '',
    minRating: searchParams.get('min_rating') ?? '',
  }));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openFilters, setOpenFilters] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const debouncedQuery = useDebounce(query, 300);
  const activeFilterCount = getActiveFilterCount(filters);

  // Keep in sync when the URL changes (e.g. searching from the navbar or
  // dashboard while on this page). Adjusting state during render is React's
  // recommended pattern for derived state — an effect here would cause an
  // extra cascading render.
  const searchParamsString = searchParams.toString();
  const [lastSearchParams, setLastSearchParams] = useState(searchParamsString);
  if (searchParamsString !== lastSearchParams) {
    setLastSearchParams(searchParamsString);
    const params = new URLSearchParams(searchParamsString);
    setQuery(params.get('search') ?? '');
    setFilters((prev) => ({
      ...prev,
      genre: params.get('genre') ?? 'All',
      availability: parseAvailability(params.get('availability')),
      publicationYear: params.get('publication_year') ?? '',
      minRating: params.get('min_rating') ?? '',
    }));
    setPage(1);
  }

  const { data, isLoading, error, refetch } = useQuery<{
    data: Book[];
    count: number;
  }>({
    queryKey: ['books', debouncedQuery, filters, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: debouncedQuery,
        genre: filters.genre,
        availability: filters.availability,
        publication_year: filters.publicationYear,
        min_rating: filters.minRating,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/books?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load books');
      return res.json();
    },
  });

  const books = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleViewChange = useCallback((next: ViewMode) => setView(next), []);

  const clearFilters = () => {
    setFilters({
      genre: 'All',
      availability: 'All',
      publicationYear: '',
      minRating: '',
    });
    setPage(1);
    setOpenFilters(false);
  };

  const removeFilter = (key: keyof Filters) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (key === 'genre' || key === 'availability') next[key] = 'All';
      else next[key] = '';
      return next;
    });
    setPage(1);
  };

  const handleRetry = () => {
    refetch();
  };

  return (
    <PageContainer>
      <div className="sticky top-14 z-10 -mx-4 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex min-h-[56px] items-center justify-between gap-4 pb-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight whitespace-nowrap">Library Catalog</h1>
            <p className="text-sm text-muted-foreground">
              {totalCount} title{totalCount !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenFilters(true)}
            aria-expanded={openFilters}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-6 w-6 px-1.5 text-[10px] leading-none">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          <div className="relative w-full lg:w-[300px] shrink">
            <SearchBar
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
            <ViewToggle view={view} onChange={handleViewChange} />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/50 p-4 flex items-center gap-3">
          <div className="flex shrink-0 items-center justify-center h-8 w-8 rounded-full bg-destructive text-destructive-foreground">
            <RefreshCw className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-destructive">Failed to load books</h3>
            <p className="text-sm text-destructive-foreground">
              {error.message}. Please check your connection and try again.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRetry}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      )}

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.genre !== 'All' && (
            <FilterChip label={filters.genre} onRemove={() => removeFilter('genre')} />
          )}
          {filters.availability !== 'All' && (
            <FilterChip label={filters.availability} onRemove={() => removeFilter('availability')} />
          )}
          {filters.publicationYear !== '' && (
            <FilterChip label={`Year: ${filters.publicationYear}`} onRemove={() => removeFilter('publicationYear')} />
          )}
          {filters.minRating !== '' && (
            <FilterChip label={`Rating: ${filters.minRating}+`} onRemove={() => removeFilter('minRating')} />
          )}
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-3 w-3 mr-1" /> Clear all
          </Button>
        </div>
      )}

      <div className="relative min-h-[60vh]">
        {isLoading ? (
          <BookSkeleton count={8} />
        ) : books.length === 0 ? (
          <EmptyState onClearFilters={clearFilters} hasFilters={activeFilterCount > 0} />
        ) : view === 'grid' ? (
          <BookGrid books={books} onSelect={(book) => setSelectedBook(book)} />
        ) : (
          <BookShelf books={books} onSelect={(book) => setSelectedBook(book)} />
        )}
      </div>

      <BookDetailSheet
        book={selectedBook}
        open={selectedBook !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedBook(null);
        }}
      />

      <Sheet open={openFilters} onOpenChange={setOpenFilters}>
        <SheetContent className="w-full max-w-[500px]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Refine your search results
            </SheetDescription>
          </SheetHeader>
          <BookFilters
            filters={filters}
            onChange={(next) => {
              setFilters(next);
              setPage(1);
            }}
            genres={GENRES}
          />
          <div className="p-4 border-t border-border flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
              Clear all
            </Button>
            <Button onClick={() => setOpenFilters(false)} className="w-full sm:w-auto">
              Apply filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between px-4 sm:px-0">
          <div className="text-sm text-muted-foreground">
            Showing {books.length} of {totalCount} titles
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="relative w-full lg:w-80">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search titles, authors, ISBN…"
        value={value}
        onChange={onChange}
        className="pl-10"
      />
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (next: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 border border-input bg-background rounded-xl shadow-sm">
      <Button
        variant={view === 'grid' ? 'default' : 'outline'}
        size="icon"
        aria-label="Grid view"
        onClick={() => onChange('grid')}
        className="h-8 w-8 rounded-lg"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'shelf' ? 'default' : 'outline'}
        size="icon"
        aria-label="Shelf view"
        onClick={() => onChange('shelf')}
        className="h-8 w-8 rounded-lg"
      >
        <LayoutList className="h-4 w-4" />
      </Button>
    </div>
  );
}

function BookGrid({ books, onSelect }: { books: Book[]; onSelect: (book: Book) => void }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {books.map((book) => (
          <motion.div
            key={book.id}
            layoutId={`book-grid-${book.id}`}
            layout
            className="group"
          >
            <BookCard book={book} onSelect={onSelect} />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}

function BookFilters({
  filters,
  onChange,
  genres,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  genres: string[];
}) {
  const setField = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <ScrollArea className="h-[70vh] w-full">
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Genre</p>
          <div className="grid grid-cols-2 gap-2">
            {genres.map((g) => (
              <Button
                key={g}
                variant={filters.genre === g ? 'default' : 'outline'}
                size="sm"
                onClick={() => setField('genre', g)}
              >
                {g}
              </Button>
            ))}
          </div>
        </div>

        <Separator orientation="horizontal" className="my-2" />

        <div className="space-y-2">
          <p className="text-sm font-semibold">Availability</p>
          <Select onValueChange={(v) => setField('availability', v as AvailabilityFilter)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Checked Out">Checked Out</SelectItem>
              <SelectItem value="Reserved">Reserved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Publication Year</p>
          <Input
            type="number"
            placeholder="e.g. 2023"
            value={filters.publicationYear}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setField('publicationYear', val);
            }}
            maxLength={4}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Minimum Rating</p>
          <Select onValueChange={(v) => setField('minRating', v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              <SelectItem value="3">3 stars & up</SelectItem>
              <SelectItem value="4">4 stars & up</SelectItem>
              <SelectItem value="5">5 stars</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </ScrollArea>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Button variant="outline" size="sm" className="flex items-center gap-1.5" onClick={onRemove}>
      <span className="text-xs">{label}</span>
      <X className="h-3 w-3" />
    </Button>
  );
}
