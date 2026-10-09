# Centralized Error Classification

## Motivation
Currently, raw backend error messages or network codes (e.g., "500", "ECONNREFUSED", "Axios Error") are shown directly to users. We will implement a centralized Error Factory that parses all errors into human-readable, actionable states.

## Error Categories & Handling

| Category | Trigger | User Message | Retryable? | Behavior |
|----------|---------|--------------|------------|----------|
| **Offline** | `navigator.onLine === false` | "You are currently offline. Changes will be saved locally." | Yes (Auto) | Show topbar badge. Queue mutations. |
| **Server Unavailable** | 502, 503, 504, ECONNREFUSED | "The server is currently unreachable. Please wait a moment." | Yes (Manual/Auto) | Localized error state in widgets. No global crash. |
| **Timeout** | Request > 15s | "This action took too long. Please try again." | Yes (Manual) | Stop loading spinner. Show retry button. |
| **Validation** | 400, 422 | Contextual (e.g., "Email is required.") | No | Inline form errors. |
| **Unauthorized** | 401 | "Your session has expired. Please log in again." | No | Redirect to login. |
| **Forbidden** | 403 | "You don't have permission to perform this action." | No | Localized warning toast. |
| **Not Found** | 404 | "The requested record could not be found." | No | Empty state component. |
| **Unknown** | 500, unhandled | "Something went wrong on our end. Our team has been notified." | Yes (Manual) | Generic localized error state. |

## Implementation
- Create a `useApiError` hook and a `parseApiError` utility.
- Every API call wraps its catch block with this parser.
- The UI reacts to the standard Error Object returned by the parser.
