// types/index.ts

export type UserRole = 'member' | 'librarian';
export type BorrowStatus = 'active' | 'returned' | 'overdue';
export type AvailabilityStatus = 'Available' | 'Checked Out' | 'Reserved';
export type ViewMode = 'grid' | 'shelf';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string | null;
  cover_url?: string | null;
  description?: string | null;
  genre: string;
  rating: number;
  total_copies: number;
  available_copies: number;
  location_rack?: string | null;
  created_at: string;
  updated_at: string;
  // Computed / joined at runtime
  availability_status?: AvailabilityStatus;
  current_borrower?: User | null;
}

export interface User {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role: UserRole;
  created_at: string;
  // Auth metadata merged in by the admin users API
  banned_until?: string | null;
  last_sign_in_at?: string | null;
}

export interface BorrowRecord {
  id: string;
  user_id: string;
  book_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at?: string | null;
  status: BorrowStatus;
  created_at: string;
  // Joined expansions (populated by API layer)
  user?: User | null;
  book?: Book | null;
}

export interface BookFilters {
  genre: string;
  availability: AvailabilityStatus | 'All';
  publicationYear: string;
  minRating: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  error?: string;
}