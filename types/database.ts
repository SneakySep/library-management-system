// types/database.ts
import type { Book, User, BorrowRecord, UserRole, BorrowStatus } from './index';

export type Database = {
  public: {
    Tables: {
      books: {
        Row: Book & { rating: number };
        Insert: Omit<
          Book,
          'id' | 'created_at' | 'updated_at' | 'availability_status' | 'current_borrower'
        >;
        Update: Partial<Omit<Book, 'id'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'created_at'>;
        Update: Partial<Omit<User, 'id'>>;
      };
      borrow_records: {
        Row: BorrowRecord;
        Insert: Omit<
          BorrowRecord,
          'id' | 'created_at' | 'user' | 'book'
        >;
        Update: Partial<Omit<BorrowRecord, 'id' | 'created_at' | 'user' | 'book'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
    };
    Enums: {
      user_role: UserRole;
      borrow_status: BorrowStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};