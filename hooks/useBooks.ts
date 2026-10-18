import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Book } from '@/types';

export function useBooks() {
  const queryClient = useQueryClient();

  const booksQuery = useQuery<Book[]>({
    queryKey: ['books'],
    queryFn: async () => {
      const res = await fetch('/api/books', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch books');
      const payload = await res.json();
      return (Array.isArray(payload) ? payload : payload.data ?? []) as Book[];
    },
  });

  const createBook = useMutation({
    mutationFn: async (book: Omit<Book, 'id' | 'created_at' | 'updated_at'>) => {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book),
      });
      if (!res.ok) throw new Error('Failed to create book');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  return { ...booksQuery, createBook };
}

export function useBook(id: string) {
  return useQuery<Book>({
    queryKey: ['book', id],
    queryFn: async () => {
      const res = await fetch(`/api/books/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch book');
      return res.json();
    },
    enabled: !!id,
  });
}