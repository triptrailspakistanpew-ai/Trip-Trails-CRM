# Retry Strategy

## Queries (Data Fetching)
- **Automatic Retries**: React Query defaults to 3 retries with exponential backoff (e.g., 1s, 2s, 4s).
- **Network Awareness**: Retries pause automatically if `navigator.onLine` is false and resume when online.

## Mutations (Actions)
- **Automatic Retries**: Disabled by default for mutations to prevent duplicate records (e.g., creating a booking twice).
- **Offline Mutations**: Handled uniquely by the Sync Engine (which ensures idempotency or queues them safely).
- **Manual Retry**: If a mutation fails (e.g., Server Error), the UI will provide a "Try Again" button in a toast or error widget.
