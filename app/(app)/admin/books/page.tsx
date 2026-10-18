'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Book } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Search, Trash2, Edit2, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageContainer, PageHeader } from '@/components/layout/PageContainer';

const GENRES = [
  'Fiction',
  'Non-Fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery',
  'Biography',
  'History',
  'Technology',
  'Children',
];

type AvailabilityStatus = 'Available' | 'Checked Out' | 'Reserved';

const STATUS_STYLE: Record<AvailabilityStatus, { variant: 'success' | 'destructive' | 'warning'; label: string }> = {
  Available: { variant: 'success', label: 'Available' },
  'Checked Out': { variant: 'destructive', label: 'Checked Out' },
  Reserved: { variant: 'warning', label: 'Reserved' },
};

interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number;
}

export default function AdminBooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [importQuery, setImportQuery] = useState('');
  const [importResults, setImportResults] = useState<OpenLibraryBook[]>([]);
  const [importing, setImporting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: 'Fiction',
    description: '',
    total_copies: '1',
    available_copies: '1',
    location_rack: '',
    cover_url: '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const params = new URLSearchParams({ search: searchQuery });
      const res = await fetch(`/api/books?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load books');
      const payload = await res.json();
      setBooks(Array.isArray(payload) ? payload : payload.data ?? []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        title: formData.title,
        author: formData.author,
        isbn: formData.isbn || null,
        genre: formData.genre,
        description: formData.description || null,
        total_copies: parseInt(formData.total_copies, 10),
        available_copies: parseInt(formData.available_copies, 10),
        location_rack: formData.location_rack || null,
        cover_url: formData.cover_url || null,
        rating: 0,
      };

      const url = editingBook ? `/api/books/${editingBook.id}` : `/api/books`;
      const method = editingBook ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Failed to ${editingBook ? 'update' : 'create'} book`);

      toast.success(`${editingBook ? 'Book updated' : 'Book created'} successfully!`);
      setOpenDialog(false);
      setEditingBook(null);
      setFormData({
        title: '',
        author: '',
        isbn: '',
        genre: 'Fiction',
        description: '',
        total_copies: '1',
        available_copies: '1',
        location_rack: '',
        cover_url: '',
      });
      setCoverFile(null);
      loadBooks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save book');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;

    try {
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete book');

      toast.success('Book deleted successfully!');
      loadBooks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete book');
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn ?? '',
      genre: book.genre,
      description: book.description ?? '',
      total_copies: String(book.total_copies),
      available_copies: String(book.available_copies),
      location_rack: book.location_rack ?? '',
      cover_url: book.cover_url ?? '',
    });
    setOpenDialog(true);
  };

  const searchOpenLibrary = async () => {
    if (!importQuery.trim()) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/open-library?q=${encodeURIComponent(importQuery)}&limit=10`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to search Open Library');
      const data = await res.json();
      const docs = data.docs ?? [];
      const results: OpenLibraryBook[] = docs.map((doc: any) => ({
        key: doc.key,
        title: doc.title,
        author_name: doc.author_name,
        first_publish_year: doc.first_publish_year,
        isbn: doc.isbn,
        cover_i: doc.cover_i,
      }));
      setImportResults(results);
    } catch (err: any) {
      toast.error(err.message || 'Failed to search Open Library');
    } finally {
      setImporting(false);
    }
  };

  const importBook = async (book: OpenLibraryBook) => {
    setImporting(true);
    try {
      const coverUrl = book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : undefined;
      const author = book.author_name?.[0] || 'Unknown Author';
      const isbn = book.isbn?.[0] || undefined;

      const body = {
        title: book.title,
        author,
        isbn,
        genre: 'Fiction',
        description: 'Imported from Open Library',
        total_copies: 1,
        available_copies: 1,
        location_rack: null,
        cover_url: coverUrl,
        rating: 0,
      };

      const res = await fetch(`/api/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to import book');

      toast.success(`"${book.title}" imported successfully!`);
      setOpenImportDialog(false);
      setImportResults([]);
      setImportQuery('');
      loadBooks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to import book');
    } finally {
      setImporting(false);
    }
  };

  const uploadCoverImage = async (file: File) => {
    setUploadingCover(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error } = await supabase.storage.from('book-covers').upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('book-covers').getPublicUrl(fileName);
      setFormData({ ...formData, cover_url: urlData.publicUrl });
      setCoverFile(null);
      toast.success('Cover image uploaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAdd = () => {
    setEditingBook(null);
    setFormData({
      title: '',
      author: '',
      isbn: '',
      genre: 'Fiction',
      description: '',
      total_copies: '1',
      available_copies: '1',
      location_rack: '',
      cover_url: '',
    });
    setCoverFile(null);
    setOpenDialog(true);
  };

  const filteredBooks = books.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContainer>
      <PageHeader
        title="Manage Books"
        description="Add, edit, and remove books from the catalog"
        actions={
          <>
            <Button
              onClick={() => {
                setEditingBook(null);
                setFormData({
                  title: '',
                  author: '',
                  isbn: '',
                  genre: 'Fiction',
                  description: '',
                  total_copies: '1',
                  available_copies: '1',
                  location_rack: '',
                  cover_url: '',
                });
                setOpenDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Book
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setImportQuery('');
                setImportResults([]);
                setOpenImportDialog(true);
              }}
            >
              <BookOpen className="h-4 w-4 mr-2" /> Import from Open Library
            </Button>
          </>
        }
      />

      {/* Search */}
      <div className="relative w-full lg:w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search books…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <BookOpen className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading books...</p>
          </div>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 bg-muted/50 rounded-xl border border-border">
          <Search className="h-12 w-12 text-muted-foreground mb-3" />
          <h2 className="text-xl font-bold">No books found</h2>
          <p className="text-muted-foreground mb-4">Try adjusting your search query.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="w-1/6">Genre</TableHead>
              <TableHead className="w-1/6">Status</TableHead>
              <TableHead className="w-1/6">Copies</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBooks.map((book) => {
              const statusRaw = (book.availability_status ?? 'Available') as AvailabilityStatus;
              const status = STATUS_STYLE[statusRaw];
              return (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{book.genre}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {book.available_copies} of {book.total_copies}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label="Edit book"
                        onClick={() => handleEdit(book)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        aria-label="Delete book"
                        onClick={() => handleDelete(book.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Edit Book' : 'Add Book'}</DialogTitle>
            <DialogDescription>
              {editingBook ? 'Update book details in the catalog.' : 'Add a new book to the library.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Author</Label>
                <Input
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>ISBN</Label>
                <Input
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Genre</Label>
                <Select
                  value={formData.genre}
                  onValueChange={(v) => setFormData({ ...formData, genre: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Copies</Label>
                <Input
                  type="number"
                  value={formData.total_copies}
                  onChange={(e) => setFormData({ ...formData, total_copies: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Available Copies</Label>
                <Input
                  type="number"
                  value={formData.available_copies}
                  onChange={(e) => setFormData({ ...formData, available_copies: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Location Rack</Label>
                <Input
                  value={formData.location_rack}
                  onChange={(e) => setFormData({ ...formData, location_rack: e.target.value })}
                  placeholder="e.g. A-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Cover URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={formData.cover_url}
                    onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (ev: any) => {
                        const file = ev.target.files?.[0];
                        if (file) {
                          setCoverFile(file);
                          uploadCoverImage(file);
                        }
                      };
                      input.click();
                    }}
                  >
                    Upload
                  </Button>
                </div>
                {coverFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {coverFile.name}
                  </p>
                )}
                {uploadingCover && (
                  <p className="text-xs text-muted-foreground animate-pulse">Uploading cover...</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Book description..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingBook ? 'Update Book' : 'Create Book'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import from Open Library Dialog */}
      <Dialog open={openImportDialog} onOpenChange={setOpenImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from Open Library</DialogTitle>
            <DialogDescription>
              Search for books to import into your library catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search titles, authors, ISBN…"
                value={importQuery}
                onChange={(e) => setImportQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') searchOpenLibrary();
                }}
                className="pl-10"
              />
            </div>
            <Button onClick={searchOpenLibrary} disabled={importing} className="w-full">
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Search
            </Button>
            {importResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto border border-input rounded-lg">
                <ul>
                  {importResults.map((book) => (
                    <li key={book.key} className="border-b border-input p-3 last:border-0">
                      <div className="flex items-start gap-3">
                        {book.cover_i && (
                          <img
                            src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`}
                            alt={book.title}
                            className="w-12 h-18 object-cover rounded-md"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium">{book.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {book.author_name?.join(', ') || 'Unknown Author'}
                            {book.first_publish_year && ` · ${book.first_publish_year}`}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => importBook(book)}
                          disabled={importing}
                        >
                          Import
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {importResults.length === 0 && importing === false && importQuery.trim() !== '' && (
              <p className="text-sm text-muted-foreground text-center">
                No results found. Try a different search.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenImportDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
