# Caching & Offline Strategy

TravelFlow uses **TanStack Query v5** coupled with **IndexedDB (idb-keyval)** to achieve instant, offline-capable, and optimistically-updated interfaces across all modules.

## Architecture Highlights

1. **Global Provider (`QueryProvider.tsx`)**
   - Configures the `QueryClient` defaults (30s stale time, 10m GC time, 1 retry).
   - Wraps the application in a `PersistQueryClientProvider`.
   - Uses a custom persister synced to IndexedDB using `idb-keyval`.

2. **Query Keys Factory (`lib/query-keys.ts`)**
   - We enforce strict query keys using a central factory to ensure typo-free cache invalidations.
   - Example: `queryKeys.customers.list(filters)`
   - Example: `queryKeys.shared.branches()`

3. **Custom Domain Hooks (`features/[module]/hooks/queries.ts`)**
   - For every module, we have specialized hooks for data fetching and mutations.
   - e.g., `useCustomers()`, `useCustomer(id)`, `useCreateCustomer()`, `useUpdateCustomer()`.
   - Mutations automatically trigger **Optimistic Updates** (onMutate) and rollbacks (onError).
   - Success triggers exact invalidations (`onSettled`) so only the relevant data gets refetched in the background without blocking the UI.

## Best Practices for Developers

- **NEVER** use `useState` and `useEffect` with `API.getX()` inside page components anymore.
- **ALWAYS** import the `useX()` hook from the relevant feature folder.
- **NEVER** hardcode query strings array like `["customers", "list"]`. **ALWAYS** use the factory: `queryKeys.customers.list()`.

## Offline Behavior

- **Reads**: If a user loses connection, they can still navigate between pages they have visited or are globally cached (like Branches, Roles, etc.). Data is read instantly from IndexedDB.
- **Mutations**: Write operations (Creates, Updates) will instantly apply optimistic UI updates, but if the network is completely down, the API call will eventually fail and the optimistic update will rollback to avoid inconsistent data states. We prioritize data accuracy over eventual consistency.
