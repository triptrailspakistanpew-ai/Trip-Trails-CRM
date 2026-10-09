# Background Sync Engine

## Responsibilities
- **Queueing**: Intercept failed mutations (due to network drops) and store them in a local queue (IndexedDB).
- **Execution**: Replay queued mutations automatically when the network is restored.
- **Deduplication**: Prevent the same mutation from being queued twice.
- **Conflict Resolution**: Basic "last write wins" or manual intervention if a server conflict occurs.

## State Exposure
- The Sync Engine will expose its state (`idle`, `syncing`, `error`) to a global Zustand store.
- The UI will display a small sync icon in the topbar indicating pending changes.

## Queue Structure
```typescript
interface SyncOperation {
  id: string; // UUID
  endpoint: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  payload: any;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'failed';
}
```
