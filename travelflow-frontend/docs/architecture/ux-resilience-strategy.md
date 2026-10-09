# UX Resilience Strategy

## Core Philosophy
The application state should dictate the UI, not the network. A network failure is a state transition (e.g., `Online` -> `Offline`), not a crash. 

## Global Connectivity Monitor
- A global network listener will track connection status (`navigator.onLine`, combined with interceptor latency checks).
- **UI Element**: A non-intrusive status badge in the Topbar (e.g., `Connected`, `Offline - Read Only`, `Syncing...`).
- Intrusive popups for network drops are forbidden.

## Component Isolation
- Pages will be broken down into isolated widgets.
- Each widget will be wrapped in a localized `ErrorBoundary` and a `Suspense` boundary (or state-driven loading equivalent).
- If the `Revenue Widget` fails to load due to a 500 error, it will display a localized error state with a "Retry" button, while the `Bookings Table` continues to function.

## Loading & Empty States
- **Skeletons**: All data fetching will immediately trigger skeleton loaders, avoiding blank screens or abrupt layout shifts.
- **Timeouts**: If a request takes > 5 seconds, the skeleton transitions to a "Still loading..." state. After 15 seconds, it transitions to a localized error state.
- **Empty States**: Generic "No Data" screens will be replaced with contextual illustrations and primary Call-To-Actions (e.g., "You have no bookings. Create your first booking.").

## Notifications (Toasts)
- Raw error messages (e.g., `ECONNREFUSED`, `500 Server Error`) are banned.
- All toasts will use standardized user-friendly language via the Central Error Handler.
- Toasts will be reserved for actions (Mutations). Background sync status will be handled by the Global Connectivity Monitor, not toasts.
