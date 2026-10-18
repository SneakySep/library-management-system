'use client';

import { Suspense } from 'react';
import { BookCatalog } from '@/components/books/BookCatalog';
import { BookSkeleton } from '@/components/books/BookSkeleton';
import { PageContainer } from '@/components/layout/PageContainer';

export default function BooksPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <div className="min-h-[56px] border-b border-border" />
          <BookSkeleton count={8} />
        </PageContainer>
      }
    >
      <BookCatalog />
    </Suspense>
  );
}
