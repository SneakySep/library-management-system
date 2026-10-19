'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Book, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, User as UserIcon, Mail, Shield, BookIcon as LucideBook, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { COVER_FALLBACK } from '@/lib/placeholder';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [borrowedBooks, setBorrowedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Fetch user profile
      const profileRes = await fetch(`/api/users/${session.user.id}`, { cache: 'no-store' });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setUser(profile);
      }

      // Fetch borrowed books
      const borrowedRes = await fetch(`/api/borrow-records?book_id=dummy`, { cache: 'no-store' });
      // We'll filter client-side since the API doesn't support user_id filter yet
      const allRecordsRes = await fetch(`/api/borrow-records`, { cache: 'no-store' });
      if (allRecordsRes.ok) {
        const records = await allRecordsRes.json();
        const userRecords = records.filter((r: any) => r.user_id === session.user.id && r.status === 'active');
        const bookIds = userRecords.map((r: any) => r.book_id);

        if (bookIds.length > 0) {
          const booksRes = await fetch(`/api/books`, { cache: 'no-store' });
          if (booksRes.ok) {
            const payload = await booksRes.json();
            const allBooks: Book[] = Array.isArray(payload) ? payload : payload.data ?? [];
            const userBooks = allBooks.filter((b) => bookIds.includes(b.id));
            setBorrowedBooks(userBooks);
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load profile');
    }
  };

  useEffect(() => {
    // The loader's state updates all happen after awaits; invoking it from a
    // promise callback keeps that async boundary explicit for the lint rule.
    Promise.resolve().then(loadProfile).then(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <BookOpen className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Not authenticated</h2>
        <p className="text-muted-foreground mb-6">Please sign in to view your profile.</p>
        <Button onClick={() => router.push('/login')}>Sign in</Button>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Profile"
        description="Manage your library account"
        actions={
          <Button variant="outline" onClick={() => router.push('/books')}>
            <LucideBook className="h-4 w-4 mr-2" /> Browse Catalog
          </Button>
        }
      />

      {/* Profile card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
              <UserIcon className="h-7 w-7" />
            </div>
            <div>
              <CardTitle>{user.full_name || 'Unknown User'}</CardTitle>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
              <Badge variant={user.role === 'librarian' ? 'default' : 'secondary'}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Account type</span>
            </div>
            <div className="text-right text-sm">
              {user.role === 'librarian' ? 'Librarian (admin access)' : 'Member (borrowing access)'}
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Member since</span>
            </div>
            <div className="text-right text-sm">
              {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Borrowed books */}
      <div>
        <h2 className="text-xl font-semibold">Currently Borrowed</h2>
        {borrowedBooks.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center text-center py-12 bg-muted/50 rounded-xl border border-border">
            <LucideBook className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">You haven&apos;t borrowed any books yet.</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push('/books')}>
              Browse Catalog
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {borrowedBooks.map((book) => (
              <Card key={book.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="px-0 pt-0 relative aspect-[4/5] overflow-hidden">
                  <img
                    src={book.cover_url || COVER_FALLBACK}
                    alt={book.title}
                    className="h-full w-full object-cover"
                  />
                  <Badge className="absolute top-2 right-2 z-20" variant="destructive">
                    Checked Out
                  </Badge>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <h3 className="font-semibold leading-tight line-clamp-2">{book.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{book.author}</p>
                  <div className="mt-3 text-xs text-muted-foreground">
                    Rack: {book.location_rack ?? 'N/A'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
