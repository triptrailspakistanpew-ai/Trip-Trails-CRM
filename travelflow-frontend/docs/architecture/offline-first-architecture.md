# Offline-First Architecture

## Core Concept
The application will operate on a "Local First" paradigm. The UI reads from and writes to a local cache layer (React Query + IndexedDB). Network requests are treated as background synchronization tasks rather than synchronous blockers.

## Technology Stack
- **TanStack Query (React Query)**: For caching, fetching, and state synchronization.
- **IndexedDB (via localForage or IDB-Keyval)**: For persistent offline storage.
- **Zustand**: For ephemeral UI state (modals, active tabs, themes).

## Data Flow
1. **Read**: Components request data via `useQuery`. React Query immediately returns stale data from the IndexedDB cache (if available) and fires a background fetch to update the cache.
2. **Write**: User performs an action (e.g., Create Customer). The UI updates optimistically. The mutation is fired.
3. **Offline Write**: If offline, the mutation is serialized and stored in a local Sync Queue. The optimistic UI update remains.

## What is Cached?
- **Master Data**: Roles, Branches, Settings, Users (cached aggressively, rarely invalidated).
- **Transactional Data**: Bookings, Customers, Leads, Expenses (cached, invalidated on mutation).
- **Lookup Tables**: Airports, Airlines, Cities (cached locally).

## Sync Queue Engine
- Mutations made offline are stored in a persisted queue.
- When the Global Connectivity Monitor detects an active connection, the queue is replayed sequentially.
- If a queued mutation fails permanently (e.g., Validation Error), it is flagged in the UI for user intervention.
