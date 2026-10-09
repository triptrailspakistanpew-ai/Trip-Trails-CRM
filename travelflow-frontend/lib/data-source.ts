/**
 * data-source.ts — Environment toggle
 *
 * When NEXT_PUBLIC_USE_API=true  →  real backend via ApiClient (HttpOnly cookies)
 * When unset / false             →  MockAPI (localStorage fallback for offline dev)
 *
 * All pages import `API` from here instead of MockAPI directly.
 * Only this file needs to change when switching data sources.
 */

import { ApiClient } from "@/lib/api-client";

export const API = ApiClient;
export type DataSource = typeof API;
