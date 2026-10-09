# Caching Strategy

## Engine
**React Query (TanStack Query)** combined with **IndexedDB (Persister)**.

## Policies
- **Stale-While-Revalidate**: UI instantly renders cached data, while silently fetching fresh data in the background.
- **Cache Duration**:
  - `gcTime` (Garbage Collection Time): 24 hours (data remains on disk for offline use).
  - `staleTime`: 
    - Master Data (Roles, Branches): 1 hour.
    - Transactional Data (Bookings, Customers): 5 minutes.
- **Invalidation**: Mutations automatically invalidate associated query keys.
- **Offline Persistence**: React Query's `PersistQueryClientProvider` will automatically write cache to IndexedDB.

## UI Impact
No more full-page loading spinners on navigation. Skeletons only appear on the very first load or when cache is empty.
