# Optimistic Updates

## Concept
Assume success for user actions to provide a snappy, instantaneous feel. Revert if the server eventually rejects the action.

## Implementation (React Query)
1. **onMutate**: 
   - Cancel outgoing fetches for the related query.
   - Snapshot the previous data.
   - Optimistically update the cache with the new item.
2. **onError**:
   - Roll back the cache to the snapshot.
   - Show a standardized error toast.
3. **onSettled**:
   - Invalidate the query to fetch the real server state.

## Safe vs. Unsafe Mutations
- **Safe (Do Optimistically)**: Update Customer, Add Note, Create Lead, Mark Notification Read.
- **Unsafe (Wait for Server)**: Process Payment, Issue Ticket, Delete Financial Record.
