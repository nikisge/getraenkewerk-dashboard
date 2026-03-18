# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Getränkewerk Admin Dashboard — a React TypeScript beverage distribution management app. German-language UI for managing customers, campaigns, tasks, routes, and sales rep performance. Built with Supabase (PostgreSQL) as the backend.

## Commands

- `npm run dev` — Start dev server (port 8080)
- `npm run build` — Production build
- `npm run build:dev` — Development build
- `npm run lint` — ESLint check
- `npm run preview` — Preview production build

No test framework is configured.

## Tech Stack

- **React 18** + **TypeScript** + **Vite** (SWC compiler)
- **Tailwind CSS** + **shadcn/ui** (Radix UI primitives) for UI
- **React Query (TanStack)** for server state
- **React Hook Form** + **Zod** for forms/validation
- **Supabase** (PostgreSQL + RLS) as backend
- **React Router DOM 6** for routing
- **Google Maps** (`@vis.gl/react-google-maps`) for route planning
- **DnD Kit** for drag-and-drop task distribution
- **Recharts** for analytics charts
- **Sonner** for toast notifications
- **date-fns** for date utilities

## Architecture

### Feature-based structure under `src/features/`

Each feature (auth, campaigns, customers, tasks, routes, dashboard, reps, actions) contains:
- `components/` — Feature-specific React components
- `hooks/` — React Query hooks for data fetching/mutations
- `services/` — External service integrations (e.g., geocoding)

### Key directories

- `src/pages/` — One component per route (Dashboard, Campaigns, Customers, RoutePlanning, TaskDistribution, CampaignPerformance)
- `src/shared/components/ui/` — shadcn/ui components (do not edit manually, use `npx shadcn-ui@latest add`)
- `src/shared/lib/utils.ts` — `cn()` utility for Tailwind class merging
- `src/integrations/supabase/` — Supabase client and auto-generated types
- `supabase/migrations/` — SQL migration files

### Path alias

`@/` maps to `src/` (configured in vite.config.ts and tsconfig).

## Data Fetching Pattern

All data access goes through React Query hooks in `src/features/*/hooks/`. Standard pattern:

```typescript
// Query
export function useEntity() {
  return useQuery({
    queryKey: ["entity"],
    queryFn: async () => {
      const { data, error } = await supabase.from("entity").select("*");
      if (error) throw error;
      return data;
    },
  });
}

// Mutation — always invalidate related queries on success
export function useCreateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entity: TablesInsert<"entity">) => { /* insert */ },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["entity"] }),
  });
}
```

## Database Types

Auto-generated from Supabase schema in `src/integrations/supabase/types.ts`. Use:
- `Tables<"table_name">` for row types
- `TablesInsert<"table_name">` for insert types

Key tables: `reps`, `campaigns`, `dim_customers`, `actions`, `tasks`, `churn_callbacks`, `routes`, `route_stops`.

## Authentication

Token-based auth: login matches an `auth_token` against the `reps` table directly. Token stored in localStorage (`crm_session_token`). On startup, `AuthContext` validates the stored token by querying the `reps` table. Auth context in `src/features/auth/context/AuthContext.tsx`.

Two roles: `admin` and `rep` (derived from `is_admin` boolean on `reps` table). Routes protected via `ProtectedRoute` and `AdminRoute` wrapper components.

Database uses RLS policies for access control and `pgcrypto` extension for password hashing.

## Routing

```
/              → Dashboard (protected, role-aware)
/auth          → Login
/routes        → RoutePlanning (all authenticated)
/task-distribution → TaskDistribution (admin only)
/campaigns     → Campaigns (admin only)
/campaign-performance → CampaignPerformance (admin only)
/customers     → Customers (admin only)
```

## Conventions

- **All UI text is in German** — labels, buttons, comments, error messages
- German date formatting: `toLocaleDateString("de-DE")`
- Database columns use snake_case, TypeScript uses camelCase
- shadcn/ui components imported from `@/shared/components/ui/`
- Modals for create/edit operations, Cards for entity display
- Mobile-responsive: bottom nav on mobile (`MobileBottomNav`), sidebar on desktop
- TypeScript strict mode is disabled (noImplicitAny: false, strictNullChecks: false)
- Reps have Telegram integration (`telegram_chat_id`, `telegram_username` fields)
- Originally scaffolded with [Lovable](https://lovable.dev); `lovable-tagger` in devDependencies
