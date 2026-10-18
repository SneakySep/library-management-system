'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Book } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book as BookIcon, BookOpen, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { COVER_FALLBACK } from '@/lib/placeholder';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';

type BorrowRecord = {
  id: string;
  user_id: string;
  book_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at?: string | null;
  status: 'active' | 'returned' | 'overdue';
  created_at: string;
  user?: any;
  book?: Book;
};

export default function BorrowedPage() {
  const router = useRouter();
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/borrow-records`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load borrow records');

      const data = await res.json();
      const userRecords = data.filter((r: BorrowRecord) => r.user_id === session.user.id);

      // Enrich with book data
      const booksRes = await fetch(`/api/books`, { cache: 'no-store' });
      if (booksRes.ok) {
        const payload = await booksRes.json();
        const allBooks: Book[] = Array.isArray(payload) ? payload : payload.data ?? [];
        const enriched = userRecords.map((r: BorrowRecord) => ({
          ...r,
          book: allBooks.find((b: Book) => b.id === r.book_id) || null,
        }));
        setRecords(enriched);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load borrowed books');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to return this book?')) return;

    try {
      const res = await fetch(`/api/borrow-records/${recordId}/return`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to return book');
      }

      toast.success('Book returned successfully!');
      loadRecords();
    } catch (err: any) {
      toast.error(err.message || 'Failed to return book');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <BookOpen className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading borrowed books...</p>
        </div>
      </div>
    );
  }

  const activeRecords = records.filter((r) => r.status === 'active');
  const overdueRecords = records.filter((r) => r.status === 'overdue');
  const returnedRecords = records.filter((r) => r.status === 'returned');

  return (
    <PageContainer width="medium">
      <PageHeader
        title="My Borrowed Books"
        description="Track your current and past borrowings"
        actions={
          <Button variant="outline" onClick={loadRecords}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div>
              <CardTitle className="text-sm">Active Borrowings</CardTitle>
              <p className="text-xs text-muted-foreground">Currently checked out</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <BookIcon className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeRecords.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div>
              <CardTitle className="text-sm">Overdue</CardTitle>
              <p className="text-xs text-muted-foreground">Past due date</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
              <Clock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${overdueRecords.length > 0 ? 'text-destructive' : ''}`}>
              {overdueRecords.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div>
              <CardTitle className="text-sm">Returned</CardTitle>
              <p className="text-xs text-muted-foreground">Previously borrowed</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{returnedRecords.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        {/* Active borrowings */}
        {activeRecords.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookIcon className="h-5 w-5" /> Currently Borrowed ({activeRecords.length})
            </h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRecords.map((record) => {
                const book = record.book;
                const isOverdue = new Date(record.due_date) < new Date();
                return (
                  <Card key={record.id} className={`overflow-hidden hover:shadow-xl transition-shadow duration-300 ${isOverdue ? 'border-destructive' : ''}`}>
                    <CardHeader className="px-0 pt-0 relative aspect-[4/5] overflow-hidden">
                      {book ? (
                        <img
                          src={book.cover_url || COVER_FALLBACK}
                          alt={book.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-muted flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2 z-20" variant="destructive">
                        Checked Out
                      </Badge>
                      {isOverdue && (
                        <Badge className="absolute top-2 left-2 z-20" variant="destructive">
                          Overdue
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      {book ? (
                        <>
                          <h3 className="font-semibold leading-tight line-clamp-2">{book.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-1">{book.author}</p>
                          <div className="mt-3 space-y-1 text-xs">
                            <span className="text-muted-foreground">Due: {new Date(record.due_date).toLocaleDateString()}</span>
                            <span className="text-muted-foreground">Borrowed: {new Date(record.borrowed_at).toLocaleDateString()}</span>
                            <span className="text-muted-foreground">Rack: {book.location_rack ?? 'N/A'}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-muted-foreground text-sm">Book details unavailable</p>
                      )}
                    </CardContent>
                    <CardFooter className="px-4 pt-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReturn(record.id)}
                      >
                        Return Book
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Returned history */}
        {returnedRecords.length > 0 && (
          <section className="border-t border-border pt-8">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" /> Return History ({returnedRecords.length})
            </h2>
            <div className="mt-4 space-y-3">
              {returnedRecords.map((record) => {
                const book = record.book;
                return (
                  <Card key={record.id} className="hover:bg-muted transition-colors">
                    <CardContent className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{book?.title || 'Unknown Book'}</h3>
                          <p className="text-sm text-muted-foreground">{book?.author || ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">Returned</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(record.returned_at || record.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {records.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center text-center py-12 bg-muted/50 rounded-xl border border-border">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold">No borrow records</h2>
            <p className="text-muted-foreground mb-6">Start borrowing books from the catalog.</p>
            <Button onClick={() => router.push('/books')}>Browse Catalog</Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
