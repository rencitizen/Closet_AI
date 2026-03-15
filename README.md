# Closet AI

Closet AI is a Next.js 15 project for CLOSET_OS. It currently includes:

- product specification in `spec.md`
- Supabase initial migration in `supabase/migrations/00001_initial_schema.sql`
- Zod request validation in `src/lib/validators/closet.ts`
- API routes backed by Supabase for closets, items, outfits, wear logs, and care logs

## Run locally

1. Create `.env.local` from `.env.local.example`
2. Install dependencies with `npm install`
3. Start the app with `npm run dev`

Current API routes expect:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Until auth is wired, mutation and scoped list routes use `x-closet-id` to choose the active closet.

## Current gaps

- frontend CRUD screens are still minimal
- auth is not wired yet
- only starter RLS exists in the initial migration
- there are no automated tests yet
