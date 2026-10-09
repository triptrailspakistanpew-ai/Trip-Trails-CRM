# TravelFlow Current UX Audit

## 1. API Layer
- **Client**: Custom `fetch` wrapper in `lib/api-client.ts`.
- **Flow**: Requests are made directly from React components inside `useEffect` hooks on mount.
- **Error Handling**: API throws custom `ApiError`. Components catch errors in `try/catch` and display a raw error message via `toast.error(error.message)`.
- **Token Management**: HttpOnly cookies are used. The `api-client` intercepts 401s, attempts a silent refresh (`/auth/refresh-token`), and redirects to `/login` if it fails.
- **Weaknesses**: No retry logic, no timeout handling, no centralized error categorization. If a request fails, the page shows empty data or a raw toast error.

## 2. State Management
- **Global State**: Zustand is used for `auth`, `sidebar`, `branch`, `theme`, and some UI state (`invalidation`, `create-drawer`).
- **Data State**: Handled entirely via local React component state (`useState` + `useEffect` for `data`, `isLoading`).
- **Weaknesses**: No data caching mechanism (no React Query/SWR). Navigating between pages always triggers a full refetch, causing repetitive loading states. No offline persistence of data.

## 3. Loading States
- **Types found**: Full page blocking spinners (e.g., `isLoading ? <DataTable isLoading={true} /> : ...`).
- **Weaknesses**: The entire table or page waits for a single API call. If the connection drops, it either spins forever or fails abruptly. Infinite loading is possible if state is not managed correctly on error.

## 4. Error Handling
- **Patterns**: Scattered `try/catch` blocks in every page component (e.g., `CustomersPage`, `BookingsPage`). 
- **Notification**: Direct `toast.error(err.message)`.
- **Weaknesses**: Highly inconsistent. The UI exposes backend terminology directly to users (e.g., "connect ECONNREFUSED", "500"). If a single API call fails, the table remains empty.

## 5. Component Architecture
- **Isolation**: Very poor. There is a single global `ErrorBoundary` wrapping the entire `children` in `DashboardLayout`.
- **Weaknesses**: If one widget or table component throws an unhandled error, the entire dashboard crashes to the global error boundary. Components do not fail independently.

## 6. Authentication
- **Flow**: Managed via `store/auth.store.ts` and `api-client.ts`. Next.js middleware handles routing protection based on cookie existence.
- **Weaknesses**: If the backend is unreachable during `fetchMe`, it used to wipe the session, causing infinite redirects. (Recently patched, but still relies heavily on the backend being alive to function seamlessly).

## 7. Notifications
- **System**: Sonner toast system.
- **Weaknesses**: Generic and overused for critical errors. Users get a transient toast for a failure but are left staring at a broken UI state (e.g., empty table) after the toast disappears.

## 8. Summary & Priorities
The current application treats the backend as the primary source of truth for the UI. The UI is completely synchronous to the network state.
- **Priority 1**: Introduce a global caching layer (React Query) and remove localized `useEffect` fetching.
- **Priority 2**: Introduce centralized error classification to replace raw `toast.error`.
- **Priority 3**: Implement Offline-First storage for critical entities.
