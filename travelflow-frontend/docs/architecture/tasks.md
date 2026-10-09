# Implementation Tasks Checklist

## Milestone 1: Foundation & Dependencies
- [ ] Install `@tanstack/react-query`, `@tanstack/react-query-persist-client`, and `idb-keyval`.
- [ ] Setup `QueryClient` provider at the root layout (`app/providers.tsx` or `app/layout.tsx`).
- [ ] Configure `PersistQueryClientProvider` to automatically sync the cache with IndexedDB.
- [ ] Define global caching policies (`staleTime: 5m`, `gcTime: 24h`, `refetchOnWindowFocus: true`).
- [ ] Test that initial `QueryClient` mounts correctly without errors.

## Milestone 2: Centralized Error Handler & Network Monitor
- [ ] Implement `useNetworkStatus` hook to listen for `online`/`offline` window events.
- [ ] Create a `NetworkIndicator` component in the `Topbar` (e.g., showing "Offline", "Syncing...").
- [ ] Build the `parseApiError` utility in `lib/api-client.ts` to standardize all backend and network errors.
- [ ] Implement the `useApiError` hook to consume parsed errors and replace raw `toast.error` calls.
- [ ] Test the network monitor by throttling/disconnecting network in browser dev tools.

## Milestone 3: Primitive Components (The "Resilience Kit")
- [ ] Create `ErrorDisplay` widget (a localized error state with a prominent retry button).
- [ ] Create `LoadingSkeleton` generic wrappers for Tables and metric Cards.
- [ ] Create `EmptyState` component with contextual illustrations (Standardization).
- [ ] Implement a localized `ErrorBoundary` component to wrap individual widgets and prevent full-page crashes.
- [ ] Replace the global `ErrorBoundary` in `DashboardLayout` with widget-level boundaries where appropriate.

## Milestone 4: Refactoring Data Fetching (Queries)
- [ ] Refactor **Dashboard**: Replace `useEffect` fetching with `useQuery` for stats and analytics.
- [ ] Refactor **Customers**: Replace `useEffect` fetching with `useQuery`.
- [ ] Refactor **Bookings**: Replace `useEffect` fetching with `useQuery`.
- [ ] Refactor **Leads**: Replace `useEffect` fetching with `useQuery`.
- [ ] Refactor **Expenses & Invoices**: Replace `useEffect` fetching with `useQuery`.
- [ ] Refactor **Settings & Roles**: Replace `useEffect` fetching with `useQuery`.

## Milestone 5: Refactoring Mutations & Optimistic Updates
- [ ] Implement `useMutation` with optimistic updates for **Customers** (create, edit, delete).
- [ ] Implement `useMutation` with optimistic updates for **Leads** (status changes, activities).
- [ ] Implement `useMutation` with optimistic updates for **Bookings** (safe fields only).
- [ ] Audit all other mutations and classify them as "Safe" (optimistic) vs "Unsafe" (wait for server). Update implementations accordingly.

## Milestone 6: The Background Sync Engine
- [ ] Create a local `SyncQueue` storage utility using IndexedDB for offline mutations.
- [ ] Modify `api-client.ts` or a custom `useMutation` hook to intercept failures when offline and push them to the `SyncQueue`.
- [ ] Implement a background listener (hooked to the `online` event) to sequentially replay the queue.
- [ ] Add UI feedback (e.g., syncing spinner in Topbar, specific toasts when queue is flushed successfully).
- [ ] Handle sync conflicts (e.g., mark a queued item as "Failed" if it returns a 4xx validation error upon replay, allowing the user to manually resolve it).

## Milestone 7: Final Polish & Testing
- [ ] Test the application by simulating "Offline" mode in Chrome DevTools.
- [ ] Ensure no infinite spinners or full-page crashes occur during network drops.
- [ ] Verify that manual "Retry" buttons function correctly on localized `ErrorDisplay` widgets.
- [ ] Ensure that data created while offline appears instantly and syncs properly when the network is restored.
