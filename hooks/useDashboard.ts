'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Book } from '@/types';

export type LoanRecord = {
  id: string;
  user_id: string;
  book_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at?: string | null;
  status: 'active' | 'returned' | 'overdue';
  created_at: string;
  user?: { id: string; full_name: string | null; email: string; role?: 'member' | 'librarian' } | null;
  book?: Book | null;
};

async function fetchBooks(params: string) {
  const res = await fetch(`/api/books${params}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load books');
  return res.json();
}

/** Catalog totals for the dashboard stat cards. */
export function useCatalogStats() {
  return useQuery({
    queryKey: ['dashboard', 'catalog-stats'],
    queryFn: async () => {
      const [all, available] = await Promise.all([
        fetchBooks('?page=1&pageSize=1'),
        fetchBooks('?availability=Available&page=1&pageSize=1'),
      ]);
      return { total: all.count ?? 0, available: available.count ?? 0 };
    },
  });
}

/** The signed-in user's active loans (joined with book details). */
export function useMyLoans() {
  return useQuery({
    queryKey: ['dashboard', 'my-loans'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return [] as LoanRecord[];

      const res = await fetch('/api/borrow-records', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load your loans');
      const records: LoanRecord[] = await res.json();
      return records.filter((r) => r.user_id === session.user.id && r.status === 'active');
    },
  });
}

/** Newest additions to the catalog. */
export function useRecentlyAdded(limit = 8) {
  return useQuery({
    queryKey: ['dashboard', 'recent-books', limit],
    queryFn: async () => {
      const payload = await fetchBooks(`?page=1&pageSize=${limit}`);
      return (payload.data ?? []) as Book[];
    },
  });
}
