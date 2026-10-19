# Library Management System

![Next.js](https://img.shields.io/badge/Next.js%2014-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38bdf8?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3fcf8e?logo=supabase&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue)

A full-stack library management web app: **members** browse and borrow books, **librarians** run the desk — circulation, stock, members and borrowing rules — from a dedicated admin area.

## Features

**Members**

- Interactive catalog with search, filters (genre, availability, year, rating), and grid / shelf views
- Book detail panel with borrow actions
- Personal dashboard — active loans with progress, due dates, history and stats
- Profile page with a borrowed-books shelf

**Librarians** (everything above, plus)

- Overview dashboard with live circulation stats
- **Manage Books** — add, edit, delete, and import titles from Open Library
- **Loans** — circulation desk: issue a book to any member, renew due dates, process returns
- **Manage Users** — search members, change roles, see each member's active-loan count
- **Settings** — loan period and max books per member, enforced automatically at checkout

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) · React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui-style components (Radix UI) |
| Backend | Supabase — Postgres, Auth, Row Level Security |
| Data & forms | TanStack Query · react-hook-form + zod |
| UI extras | Framer Motion · sonner (toasts) · lucide-react |
| Testing | Vitest + Testing Library |

## Getting started

### 1. Prerequisites

- Node.js 18.17 or newer
- A Supabase project ([supabase.com](https://supabase.com/) — free tier is fine)

### 2. Install dependencies

```bash
npm install
```

### 3. Create the database schema

In your Supabase dashboard, open the **SQL Editor** and run these files in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_fix_rls_recursion.sql`
3. `supabase/migrations/003_library_settings.sql`

### 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from **Project Settings → API**:

```bash
cp .env.example .env.local        # Windows: copy .env.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key (safe for the browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key — server-side only, never exposed to the browser |

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register an account.

> **Tip:** if email confirmation is enabled you will need to confirm via email before signing in — or disable it while developing under **Authentication → Providers**.

### 6. Make yourself a librarian

New sign-ups are always members (a database trigger blocks self-promotion). To create your first librarian, run this in the **SQL Editor**:

```sql
update public.users set role = 'librarian' where email = 'you@example.com';
```

The admin area appears the next time you sign in.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (compiles into `.next-dev`) |
| `npm run build` | Production build (compiles into `.next`) |
| `npm start` | Serve the production build |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run the Vitest suite |

> **Why two build directories?** Running `next build` while the dev server is active used to overwrite its assets, serving the site without CSS/JS. Dev and build are now isolated (`.next-dev` vs `.next`), so both can run side by side safely.

## Project structure

```
app/
├─ (auth)/            login & register
├─ (app)/             member area — dashboard, catalog, borrowed, profile
│  └─ admin/          librarian area — books, loans, users, settings
├─ api/               route handlers (books, borrow-records, users, settings…)
components/           ui primitives, layout, books, dashboard
hooks/                data hooks (auth, books, admin, borrow records)
lib/                  supabase clients, settings, helpers
supabase/migrations/  database schema (run in order)
types/                shared types
```

## License

[MIT](LICENSE)
