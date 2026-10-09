# Existing Project UI/UX & Frontend Architecture Blueprint

This document reverse-engineers the current `travelflow-frontend` application. Values and patterns below come from the source code, not from a generic design-system template. Where the repository does not establish a rule, this document says so explicitly.

## 1. Executive Summary

TravelFlow is a Next.js App Router application for a multi-tenant travel-agency ERP/CRM. Its frontend is an operational, desktop-first interface with a light olive/off-white canvas, white surfaces, green primary actions, gold accent color, compact uppercase controls, and dense data views. It also has a tokenized dark theme.

The recurring authenticated composition is:

```text
Root providers
└── Dashboard route-group layout
    ├── Fixed Sidebar (240px open / 64px collapsed)
    └── Flexible shell
        ├── Sticky Topbar (60px)
        └── Scrollable main (p-6, tf background)
            └── Page-specific content
```

The strongest repeated page pattern is a `space-y-6` stack, a bordered surface header with title/subtitle/actions, then one or more bordered surfaces containing a toolbar, table, cards, charts, or form. CRUD list pages generally open a right-side `DrawerForm`; detail pages use `DetailHeader`, cards, tabs, and supporting drawers.

## 2. Technology & Architecture

| Concern                   | Actual implementation                                     | Evidence                                                                                                 |
| ------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Framework                 | Next.js App Router with TypeScript                        | `travelflow-frontend/app`, `next.config.ts`, `tsconfig.json`                                             |
| Styling                   | Tailwind CSS v4 imports plus custom CSS variables/classes | `app/globals.css` imports `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css`                         |
| Component system          | shadcn/ui-style components wrapping Radix UI primitives   | `components/ui/*`                                                                                        |
| Icons                     | `lucide-react`                                            | layout, pages, shared components                                                                         |
| Tables                    | TanStack Table                                            | `components/tables/DataTable.tsx`                                                                        |
| Forms                     | React Hook Form with Zod resolvers                        | `components/forms/FormField.tsx`, feature schemas, auth page                                             |
| Async server state        | TanStack Query                                            | `providers/QueryProvider.tsx`, `lib/query-client.ts`, feature hooks                                      |
| Client state              | Zustand, with persistence for sidebar and auth            | `store/sidebar.store.ts`, `store/auth.store.ts`, `store/branch.store.ts`, `store/create-drawer.store.ts` |
| Notifications             | Sonner, wrapped by local toast utilities                  | `app/layout.tsx`, `lib/toast-utils.ts`, `components/ui/sonner.tsx`                                       |
| Theme                     | `next-themes`, light default, system enabled              | `providers/ThemeProvider.tsx`, `app/layout.tsx`                                                          |
| Validation/error handling | Zod schemas, API error parser, centralized toast helpers  | `features/*/schemas`, `lib/error-parser.ts`, `lib/toast-utils.ts`                                        |
| Data access               | `ApiClient`/`API` abstraction and feature query hooks     | `lib/api-client.ts`, `lib/data-source.ts`, `features/*/hooks/queries.ts`                                 |

`AGENTS.md` is an active repository rule: use existing shadcn components from `@/components/ui/*`, use Tailwind utilities, use React Hook Form/Zod for forms, use shadcn Table/TanStack Table for tables, and compose rather than create replacement primitives.

## 3. Repository Structure

### 3.1 Root

| Path                                            | Role                                            |
| ----------------------------------------------- | ----------------------------------------------- |
| `travelflow-frontend/`                          | Next.js frontend application                    |
| `travelflow-backend/`                           | Separate Express/TypeScript backend             |
| `AGENTS.md`                                     | UI/component and Next.js project rules          |
| `README.md`, `Bug-finding.md.md`, `MEMORIES.md` | Repository documentation/working notes          |
| `preloader.json`                                | Repository-level project metadata/configuration |

### 3.2 Frontend directories

| Directory                                 | Responsibility                                                                       | Classification             |
| ----------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------- |
| `app/`                                    | App Router route files, route-group layouts, print routes                            | Page/layout level          |
| `components/ui/`                          | shadcn/Radix primitives                                                              | Global reusable            |
| `components/shared/`                      | Cross-feature domain UI such as table helpers, empty/error/detail states, formatters | Global reusable            |
| `components/layout/`                      | Sidebar, topbar, breadcrumbs, search, user and notification controls                 | Layout-level               |
| `components/forms/`                       | Drawer form shell and reusable controlled fields                                     | Cross-feature reusable     |
| `components/tables/`                      | TanStack Table shell, toolbar, pagination, actions, headers                          | Cross-feature reusable     |
| `components/dashboard/`                   | Dashboard-specific widgets                                                           | Feature/page-specific      |
| `components/bookings/`, `invoices/`, etc. | Feature-specific panels and drawers                                                  | Feature-specific           |
| `features/`                               | Feature query hooks, schemas, utilities, and some feature components                 | Feature architecture       |
| `hooks/`                                  | Cross-feature hooks, permissions, drawer state, dashboard data                       | Shared logic               |
| `lib/`                                    | API, query, serialization, errors, toasts, utilities                                 | Utility/infrastructure     |
| `providers/`                              | Theme, auth, sidebar hydration, query providers                                      | Application infrastructure |
| `store/`                                  | Zustand stores                                                                       | Client state               |
| `constants/`                              | Navigation and status definitions, drawer constants                                  | Design/behavior constants  |
| `types/`                                  | Domain TypeScript types                                                              | Shared contracts           |
| `public/`                                 | Static assets and favicon                                                            | Assets                     |
| `docs/`                                   | Frontend architecture/caching documentation                                          | Documentation              |

## 4. Application Layout

`app/layout.tsx` is the root layout. It loads Google fonts with `next/font/google`, imports `globals.css`, sets metadata, and wraps the application in this provider order:

```text
ThemeProvider
└── AuthProvider
    └── SidebarProvider
        └── QueryProvider
            ├── route content
            └── Toaster position="top-right" richColors
```

The body uses `min-h-screen bg-[var(--tf-bg)] text-tf-text-primary antialiased overflow-hidden`.

`app/(dashboard)/layout.tsx` is the authenticated shell. It waits for persisted auth state before rendering, redirects unauthenticated users to `/login`, checks a route-to-role map and redirects unauthorized users to `/leads`, renders a full-screen server-down state when `serverError` is present, renders a centered spinner while auth is unresolved, wraps dashboard children in `ErrorBoundary`, offsets the flexible shell by the persisted sidebar width, and places `Topbar` above a `main` with `flex-1 overflow-y-auto bg-[var(--tf-bg)] p-6`.

There is no dedicated `app/(auth)/layout.tsx`; auth pages own their visual structure. The print routes are separate and use document-oriented white/black layouts rather than the dashboard shell.

## 5. Page Architecture

### 5.1 Routes

The actual route families are:

| Family         | Routes                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Auth           | `/login`, `/sign-in`                                                                                                          |
| Dashboard      | `/dashboard`                                                                                                                  |
| CRM            | `/leads`, `/customers`, `/quotations` and their `[id]` pages                                                                  |
| Sales          | `/bookings`, `/invoices`, `/receipts` and their `[id]` pages                                                                  |
| Operations     | `/suppliers`, `/expenses` and their `[id]` pages                                                                              |
| Analytics      | `/reports`, `/reports/revenue`, `/reports/profit`, `/reports/branches`                                                        |
| Administration | `/branches`, `/users`, `/roles` and detail pages where present                                                                |
| Settings       | `/settings`, `/settings/company`, `/settings/branding`, `/settings/notifications`                                             |
| Print          | `/print/invoice/[id]`, `/print/receipt/[id]`, `/print/quotation/[id]`, `/print/ledger/[id]`, `/print/supplier-statement/[id]` |

### 5.2 Common page geometry

The dashboard layout supplies the only universal page container: full available width with `p-6`. There is no global `max-w-*` content wrapper for authenticated pages. Individual pages add their own max widths where needed, notably print documents and the auth form.

Common page-level values observed:

| Pattern                    | Implementation                                                    |
| -------------------------- | ----------------------------------------------------------------- |
| Vertical page rhythm       | `space-y-6` or `gap-6`                                            |
| Header/action surface      | `bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm`  |
| Header layout              | `flex flex-col sm:flex-row sm:items-center justify-between gap-4` |
| Main dashboard chart grid  | `grid grid-cols-1 lg:grid-cols-3 gap-6`, 2/3 + 1/3                |
| Two-panel content grid     | `grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch`             |
| Detail overview grid       | `grid grid-cols-1 lg:grid-cols-3 gap-6`                           |
| Form grid                  | `grid grid-cols-1 md:grid-cols-2 gap-4` or `gap-6`                |
| Detail metadata grid       | commonly `grid-cols-2 md:grid-cols-3/4 gap-6`                     |
| Page bottom breathing room | detail pages commonly add `pb-12`                                 |

Alignment is usually title/subtitle left and actions right on `sm` and larger. On narrow screens, the same row stacks vertically. No fixed universal page max-width, header height beyond the topbar, or universal section background outside the repeated route-level surfaces could be determined.

## 6. Header Specification

Implementation: `components/layout/Topbar.tsx`.

| Property       | Actual value                                           |
| -------------- | ------------------------------------------------------ |
| Element        | `header`                                               |
| Position       | `sticky top-0`                                         |
| Layer          | `z-30`                                                 |
| Height         | `var(--tf-topbar-height)` = `60px`                     |
| Width          | Flexible shell width, after sidebar offset             |
| Display        | `flex items-center`                                    |
| Gap            | `gap-4`; right controls use `gap-1 sm:gap-2`           |
| Padding        | `px-4 sm:px-6`                                         |
| Background     | `var(--tf-header-bg)`; light `#ffffff`, dark `#18201a` |
| Border         | bottom `border-tf-border`                              |
| Shadow         | `shadow-sm`                                            |
| Left content   | mobile menu button, then breadcrumbs hidden below `sm` |
| Center content | `SearchCommand`, centered or responsive-start/centered |
| Right content  | focus mode, notifications, theme, user menu            |

The left mobile menu is `lg:hidden`, meaning it appears below the Tailwind `lg` breakpoint. Breadcrumbs are `hidden sm:block`. Focus mode is `hidden sm:flex`; it collapses the sidebar through the same Zustand store. The theme button waits for client mount to avoid hydration mismatch. The user menu is an icon/avatar trigger, not a text profile header.

`Breadcrumbs.tsx` derives labels from the pathname. IDs containing a hyphen and number are formatted as `Ref XXX` according to the implementation.

## 7. Sidebar Specification

Implementation: `components/layout/Sidebar.tsx`, `SidebarNav.tsx`, `SidebarItem.tsx`, `store/sidebar.store.ts`.

| Property                 | Actual value                                                            |
| ------------------------ | ----------------------------------------------------------------------- |
| Position                 | `fixed left-0 top-0`                                                    |
| Layer                    | `z-40`                                                                  |
| Height                   | `h-screen`                                                              |
| Open width               | `var(--tf-sidebar-width)` = `240px`                                     |
| Collapsed width          | `var(--tf-sidebar-collapsed-width)` = `64px`                            |
| Background               | `var(--tf-sidebar-bg)`; light `#ffffff`, dark `#18201a`                 |
| Border                   | right `border-tf-border`; logo area and profile have top/bottom borders |
| Transition               | `transition-all duration-300 ease-out`                                  |
| Logo row height          | `var(--tf-topbar-height)` = `60px`                                      |
| Logo row padding         | `px-4`                                                                  |
| Navigation wrapper       | `flex-1 overflow-y-auto overflow-x-hidden py-4`                         |
| Navigation outer padding | `px-3`                                                                  |
| Navigation group gap     | `gap-6`; items inside a group `gap-1`                                   |
| Item open padding        | `px-3 py-2.5`, `gap-3`, `rounded-lg`                                    |
| Item collapsed padding   | `py-2.5 px-0`, centered                                                 |
| Icon size                | `h-5 w-5`                                                               |
| Item transition          | `transition-all duration-200 ease-out`                                  |
| Tooltip delay            | `100ms`, side right, offset `15px`                                      |
| Profile area             | bottom, `border-t`, `p-4`                                               |

Navigation groups and labels are defined in `constants/nav.ts`: `MAIN MENU`, `CRM`, `SALES`, `OPERATIONS`, `ANALYTICS`, `ADMINISTRATION`, and `SETTINGS`. Role filtering happens in `SidebarNav`; route access is independently enforced in the dashboard layout. Admin-only users also see the branch switcher.

### Item hierarchy and states

| State            | Actual treatment                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normal           | `text-[var(--tf-sidebar-text)]`; muted text color is `#4b5563` light / `#c3cbc4` dark                                                                      |
| Hover            | `hover:bg-tf-surface-2`                                                                                                                                    |
| Active/open      | `bg-[var(--tf-sidebar-active)]`, active text, `font-semibold`, left `3px` accent border, `rounded-l-none`, open padding adjusted from `px-3` to `pl-[9px]` |
| Active/collapsed | Same active surface and 3px left accent, no label                                                                                                          |
| Badge            | pill, primary green, white `10px` bold text, `px-2 py-0.5`                                                                                                 |
| Disabled         | No explicit sidebar disabled class exists                                                                                                                  |
| Parent/child     | No nested navigation or expand/collapse item tree is implemented; the only expandable sidebar content is the admin agency/branch switcher                  |

Collapsed items expose `aria-label` and a Radix Tooltip. The logo switches between image assets in `app.json` based on resolved theme; when no logo is available, a green rounded logo tile with a Lucide `Plane` is used. The user area shows initials in a `36px` circular surface, name, `Agency Owner`, and a danger logout icon when open. In collapsed mode only the initials remain.

The sidebar state is persisted under `tf-sidebar-storage`; `SidebarProvider` renders an invisible wrapper until hydration completes. Mobile behavior is partly explicit: the topbar menu button is hidden on `lg` and toggles the same persistent sidebar. The sidebar itself remains fixed and the code does not implement a separate mobile overlay/drawer mode.

## 8. Main Content Specification

The shell relationship is:

```text
fixed sidebar (left)
└── flexible div with ml-240px or ml-64px
    ├── sticky 60px topbar
    └── main: flex-1, vertical overflow, tf background, p-6
```

The shell's margin transition is `duration-300 ease-out`. Main content has no explicit max-width, and horizontal overflow is handled by individual controls/tables rather than by a global container. Full-height content is supported because the outer shell is `h-screen` and the body is `overflow-hidden`.

## 9. Page Templates

### Dashboard page

`app/(dashboard)/dashboard/page.tsx` implements:

```text
space-y-6 page
├── bordered title/date-range surface
├── KPI row
├── 2/3 Revenue chart + 1/3 Profit chart
├── 1/2 Branch performance + 1/2 Activity feed
└── full-width Recent bookings table
```

Every widget is inside an `ErrorBoundary`. Loading is delegated to widgets; a background fetch dims the page with `opacity-50 pointer-events-none` while retaining previous content. The dashboard title surface uses `p-6`, `rounded-xl`, border and shadow.

### List/CRUD page

Customers, bookings, leads, quotations, invoices, receipts, suppliers, expenses, branches and users establish this template:

```text
space-y-6 page
├── title/subtitle + permission-gated primary action surface
├── surface with DataTable
│   ├── toolbar/search/filters
│   ├── bordered table
│   └── pagination
└── controlled DrawerForm for create/edit
```

Customers is the clearest reference: `customers/page.tsx` combines `useEntityDrawer`, a feature schema, query/mutation hooks, `DataTable`, `EmptyState`, `DateRangePicker`, and `DrawerForm`. Form sections use `space-y-4`, sections use `space-y-8`, and fields use responsive two-column grids.

### Detail page

Booking detail (`bookings/[id]/page.tsx`) and customer/lead/supplier/branch detail pages establish:

```text
space-y-6 page (often pb-12)
├── DetailHeader: circular back button, title, subtitle, actions
├── responsive summary cards/grid
├── tabs or additional card sections
└── feature drawers or document panels
```

Booking detail uses `lg:grid-cols-3` with a two-thirds passenger card and one-third financial card, then a tab set for full details/activity/documents. Detail data is presented as compact label/value pairs; labels use uppercase muted `text-xs tracking-wider`.

### Report page

Reports use KPI-like grids (`md:grid-cols-2 lg:grid-cols-4`) and chart/report panels in `lg:grid-cols-3` arrangements. There are report-specific placeholder/loading surfaces and a period/action band. Exact chart dimensions vary by chart component; the generic chart skeleton defaults to `280px`.

### Settings page

`settings/page.tsx` is a consolidated tabbed settings surface with tabs for general categories and responsive wrapping. It coexists with standalone subroutes for company, branding, and notifications. This is an existing architectural duplication, not a universal template.

### Auth page

`(auth)/login/page.tsx` is a full-height split screen at `lg`: image/brand panel `w-1/2`, form panel `lg:w-1/2`, with the image panel hidden below `lg`. The form has `max-w-md`, `p-8`, demo credential actions, RHF/Zod validation, inline leading icons, password visibility, and full-width `h-11` submit. `/sign-in` is a separate implementation with a centered `max-w-[480px]` `rounded-2xl` card and `p-8 sm:p-10`; do not treat it as the canonical auth layout without deciding which route is intended.

## 10. Typography System

Fonts are loaded in `app/layout.tsx`:

| Font           | Weights loaded | Variable                | Usage                       |
| -------------- | -------------: | ----------------------- | --------------------------- |
| IBM Plex Sans  |  500, 600, 700 | `--font-ibm-plex-sans`  | Heading stack               |
| Inter          |  400, 500, 600 | `--font-inter`          | Body stack                  |
| Roboto         |       400, 500 | `--font-roboto`         | Body fallback               |
| JetBrains Mono |            500 | `--font-jetbrains-mono` | Technical/identifier values |

| Utility            | Size / line-height | Weight | Use                                               |
| ------------------ | ------------------ | -----: | ------------------------------------------------- |
| `.tf-display`      | 48px / 1.1         |    700 | Display, not observed as a common dashboard title |
| `.tf-h1`           | 32px / 1.2         |    700 | Large page/auth heading                           |
| `.tf-h2`           | 24px / 1.25        |    700 | Page/detail title                                 |
| `.tf-h3`           | 20px / 1.3         |    600 | Empty-state/section heading                       |
| `.tf-h4`           | 16px / 1.4         |    600 | Compact heading/logo text                         |
| `.tf-body-lg`      | 16px / 1.6         |    400 | Large body                                        |
| `.tf-body`         | 14px / 1.6         |    400 | Standard body/subtitle                            |
| `.tf-body-sm`      | 13px / 1.5         |    400 | Nav and compact body                              |
| `.tf-caption`      | 12px / 1.4         |    500 | Supporting labels                                 |
| `.tf-overline`     | 11px / 1.3         |    600 | Uppercase nav group headings                      |
| `.tf-mono`         | 13px / 1.5         |    500 | Technical values                                  |
| `.tf-kpi-value`    | 36px / 1           |    700 | KPI value                                         |
| `.tf-kpi-value-sm` | 28px / 1           |    700 | Smaller KPI value                                 |

Heading utilities use `var(--font-heading)`, body utilities use `var(--font-sans)`, and mono uses `var(--font-mono)`. The global `html` uses `font-sans`; heading utilities must be applied explicitly. Letter spacing is negative for display/h1/h2 utilities and positive for captions/overlines. Buttons and many card titles additionally use uppercase/tracking styles from shadcn defaults.

## 11. Color System

### TravelFlow tokens

| Token                 | Light value | Dark value                  | Use                                |
| --------------------- | ----------- | --------------------------- | ---------------------------------- |
| `--tf-primary`        | `#2f6b3b`   | `#62b46d`                   | Primary actions, active navigation |
| `--tf-primary-hover`  | `#255730`   | `#7bc684`                   | Primary hover                      |
| `--tf-primary-soft`   | `#eef7f0`   | `rgba(98, 180, 109, 0.14)`  | Soft selected/success surfaces     |
| `--tf-accent`         | `#c79b2d`   | `#d6b04a`                   | Gold accent                        |
| `--tf-accent-hover`   | `#ad8522`   | `#e2bf66`                   | Accent hover                       |
| `--tf-accent-soft`    | `#fff8e5`   | `rgba(214, 176, 74, 0.12)`  | Accent soft surface                |
| `--tf-success`        | `#16a34a`   | `#4ade80`                   | Success                            |
| `--tf-warning`        | `#d97706`   | `#fbbf24`                   | Warning                            |
| `--tf-danger`         | `#dc2626`   | `#f87171`                   | Destructive/error                  |
| `--tf-info`           | `#2563eb`   | `#60a5fa`                   | Informational                      |
| `--tf-bg`             | `#f7f8f4`   | `#0f1511`                   | Application canvas                 |
| `--tf-surface`        | `#ffffff`   | `#18201a`                   | Cards, forms, shell surfaces       |
| `--tf-surface-2`      | `#f2f5ef`   | `#202b22`                   | Muted/secondary surface            |
| `--tf-border`         | `#dde5dc`   | `rgba(255, 255, 255, 0.08)` | Default borders                    |
| `--tf-border-strong`  | `#c7d2c5`   | `rgba(255, 255, 255, 0.15)` | Strong borders/dashed states       |
| `--tf-text-primary`   | `#1b1f1c`   | `#f3f5f3`                   | Primary text                       |
| `--tf-text-secondary` | `#4b5563`   | `#c3cbc4`                   | Secondary text                     |
| `--tf-text-muted`     | `#6b7280`   | `#7c8a80`                   | Muted labels/placeholder           |
| `--tf-text-inverse`   | `#ffffff`   | `#111827`                   | Inverse text                       |

Soft variants exist for success, warning, danger, info and the card backgrounds `--tf-card-blue`, `--tf-card-teal`, `--tf-card-amber`, `--tf-card-violet`, `--tf-card-slate`, and `--tf-card-coral`. Their light values are declared in `app/globals.css`; dark values are translucent color overlays. The shadcn semantic variables (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--border`, `--input`, `--ring`, etc.) also exist in OKLCH and change under `.dark`.

## 12. Spacing System

The explicit custom scale in `app/globals.css` is:

| Token        | Value | Observed uses                                |
| ------------ | ----: | -------------------------------------------- |
| `--space-1`  |   4px | Small gaps/visual rhythm where token is used |
| `--space-2`  |   8px | Compact gaps                                 |
| `--space-3`  |  12px | Compact control/panel gaps                   |
| `--space-4`  |  16px | Standard padding/gaps                        |
| `--space-5`  |  20px | Small card spacing                           |
| `--space-6`  |  24px | Main page padding, section gap, card padding |
| `--space-8`  |  32px | Larger internal separation                   |
| `--space-10` |  40px | Large composition gaps                       |
| `--space-12` |  48px | Auth/display spacing                         |
| `--space-16` |  64px | Large spacing                                |

The source frequently expresses these through Tailwind classes rather than custom variable names: `p-6`, `gap-6`, `space-y-6`, `gap-4`, `p-4`, `px-6 py-4`, `space-y-8`, and `gap-8`. Inputs use component-defined padding and height. Drawer body uses `px-6 py-6`; drawer header/footer use `px-6 py-4`; DataTable cells use `px-4 py-2`; table headers use `h-10 px-4`; table rows are `h-[52px]`.

There is a consistent numeric scale, but not every layout value is expressed through the custom token names. `p-6` is the dominant page/surface rhythm; `gap-6` separates major sections; `gap-4` separates form fields and controls.

## 13. Border System

The default TravelFlow border is `1px` via Tailwind border utilities using `border-tf-border`. Strong borders use `border-tf-border-strong`. Borders are the main separation mechanism on cards, inputs, tables, header/sidebar shell edges, drawer header/footer, and tab lists. Shadows are supplementary rather than a replacement for structural borders.

Observed forms use `border-tf-border`; error fields use `border-[var(--tf-danger)]` and a danger ring. Active sidebar items use a `3px` left border. Tables use a `border-tf-border` container and row/header dividers from the shadcn table primitive. Dialogs add a `ring-1 ring-foreground/10`; the default Card uses `ring-1 ring-foreground/5` rather than an explicit tf border unless route code adds one.

## 14. Border Radius System

| Token           |  Value | Examples                        |
| --------------- | -----: | ------------------------------- |
| `--radius-sm`   |    6px | Small controls/compact surfaces |
| `--radius-md`   |   10px | Standard control-level rounding |
| `--radius-lg`   |   14px | Larger surface token            |
| `--radius-xl`   |   20px | Large surface token             |
| `--radius-full` | 9999px | Status badges, avatars, pills   |

Actual utility usage is not fully normalized to these tokens. Common route surfaces use `rounded-xl` (typically Tailwind's theme radius), default shadcn Card uses `rounded-lg`, inputs use `rounded-lg`, sidebar items use `rounded-lg`, badges use `rounded-[var(--radius-full)]`, and `DetailHeader` back action uses `rounded-full`. The default Dialog intentionally uses `rounded-none`; login's alternate `/sign-in` card uses `rounded-2xl`. Exact compiled Tailwind pixel mapping for uncustomized classes could not be determined from source alone.

## 15. Shadow / Elevation System

Declared custom shadows:

| Token         | Value                                                             |
| ------------- | ----------------------------------------------------------------- |
| `--shadow-xs` | `0 1px 2px rgba(0, 0, 0, 0.04)`                                   |
| `--shadow-sm` | `0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)`    |
| `--shadow-md` | `0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)`    |
| `--shadow-lg` | `0 8px 24px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)`    |
| `--shadow-xl` | `0 20px 40px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)` |

Observed usage: cards and title bands use `shadow-sm`; dropdown/notification surfaces use `shadow-xl`; default Card/Dialog/Sheet primitives use shadcn `shadow-sm` or `shadow-md`; login `/sign-in` uses `shadow-[var(--shadow-xl)]`. Hover elevation is not a universal behavior; many controls change background/color instead.

## 16. Icon System

The icon library is Lucide. The normal convention is outlined icons with explicit utility sizing. Sidebar icons are `20px`; standard button icons are generally `16px` or the button primitive's default `14px`; notification icons are `16px`; header icons are `20px`; detail metadata icons are commonly `16px` or `20px`; close icons come from `XIcon`/Lucide.

Icons are paired with text in actions and placed before labels. Icon-only actions use the shared `IconButton` or shadcn Button icon sizes and carry `aria-label`/title. Collapsed sidebar items use tooltips. Status badges do not add icons by default. `FormField` currently renders a small inline SVG for validation errors rather than a Lucide icon, which is an implementation exception.

## 17. Button System

The base shadcn button in `components/ui/button.tsx` has `rounded-md`, `text-xs`, `font-semibold`, `tracking-widest`, uppercase text, transparent border, transition, visible focus ring, active one-pixel translation, and disabled opacity/pointer behavior. Its variants are:

| Variant       | Actual base styling                                           |
| ------------- | ------------------------------------------------------------- |
| `default`     | semantic primary background/foreground, hover `bg-primary/80` |
| `outline`     | border, transparent background, muted hover                   |
| `secondary`   | semantic secondary background and foreground                  |
| `ghost`       | no background until hover                                     |
| `destructive` | translucent destructive background and destructive text       |
| `link`        | primary underlined text                                       |

| Size    | Height / horizontal sizing |
| ------- | -------------------------- |
| default | `h-10`, `px-6`, `gap-1.5`  |
| xs      | `h-7`, `px-3`, `gap-1`     |
| sm      | `h-9`, `px-4`, `gap-1`     |
| lg      | `h-11`, `px-8`, `gap-1.5`  |
| icon    | `size-10`                  |
| icon-xs | `size-7`                   |
| icon-sm | `size-9`                   |
| icon-lg | `size-11`                  |

Route code frequently overrides the base uppercase style with `normal-case tracking-normal`, especially user menus, form actions, and text links. TravelFlow primary actions commonly add `bg-tf-primary text-white hover:bg-tf-primary-hover`. Loading buttons disable themselves and render a small `16px` border spinner plus text such as `Saving...` or `Signing in...`. Destructive row deletion is exposed from a dropdown and confirmed in an AlertDialog.

## 18. Form/Input System

Forms use the shadcn Form/Radix integration and React Hook Form controllers. Feature pages create a typed form with `useForm`, pass `zodResolver(schema)`, and compose `FormField`, `FormTextArea`, `FormSelect`, and `FormCombobox` from `components/forms/FormField.tsx`.

| Control                         | Actual behavior                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Text/input                      | shadcn Input, usually `h-10`, `rounded-lg`, surface background, border, shadow, green focus ring                   |
| Textarea                        | FormField wrapper sets `min-h-[100px]`, `resize-y`, same surface/border/focus style                                |
| Select                          | Shared `FilterSelect` full-width trigger; field error wraps it in danger border/ring                               |
| Combobox                        | Popover + Command, `w-[300px]`, list `max-h-[300px]`, searchable, supports a `NEW_CUSTOMER` create action          |
| Date/date-time                  | Input `type="date"`/`datetime-local` or shared `DateRangePicker`                                                   |
| Number/tel/email/password/color | Input `type` is passed through FormField                                                                           |
| Checkbox/radio/switch           | shadcn primitives exist; customer type uses `Switch`; role/settings pages use related primitives                   |
| File upload                     | No universal shared file-upload control was identified; feature-specific document panels handle document workflows |

Field rules: label is above the control, `text-sm font-medium text-tf-text-secondary`; required marker is a danger-colored `*`; field wrapper uses `space-y-2`; descriptions are `text-xs text-tf-text-muted`; errors are `text-sm font-medium text-tf-danger`, with an inline error icon and `mt-1.5`; first invalid field can receive focus. Common multi-column form layout is one column below `md`, two columns at `md` and above. Drawer forms separate sections with `space-y-8`, section headings with `text-sm font-semibold`, and fields with `gap-4`.

The standalone login form uses direct shadcn `FormField` composition rather than the shared `components/forms/FormField`; its inputs are `h-11`, icon-padded, and have a leading Mail/Lock icon. This is a real variation.

## 19. Card System

The base shadcn Card is a flex column with `rounded-lg`, semantic card background, `text-sm`, `shadow-sm`, `ring-1 ring-foreground/5`, and a default internal spacing token of Tailwind spacing `8` (the small variant uses spacing `5`). `CardHeader`, `CardContent`, and `CardFooter` use the shared internal spacing for horizontal padding. `CardTitle` is a heading-font, `text-lg`, semibold, uppercase, `tracking-wider` element.

Route pages commonly override the base with `bg-tf-surface border-tf-border shadow-sm`. Title/action bands are usually raw div surfaces rather than Card components and use `rounded-xl p-6`. Detail cards use `CardHeader` with `pb-4`, then `CardContent`; their internal data grids use `gap-6` or `gap-8`. There are no separately named, centrally registered TravelFlow card variants beyond the shadcn Card `size="default" | "sm"` and route-level class composition.

## 20. Stat Card System

Dashboard KPI cards are composed in `components/dashboard/KpiRow.tsx` and their loading geometry is represented by `KpiCardSkeleton` in `components/shared/LoadingSkeleton.tsx`. The skeleton establishes a `h-[140px] w-full rounded-xl border border-tf-border bg-tf-surface p-5 shadow-sm` card, with a label row, circular `40px` icon placeholder, value placeholder, and bottom supporting/trend row. KPI values use `.tf-kpi-value` (`36px`) or `.tf-kpi-value-sm` (`28px`).

The exact runtime KPI card content, widths, icon container styling, and trend semantics should be verified in `components/dashboard/KpiCard.tsx`/`KpiRow.tsx` when reproducing it. A universal fixed KPI width could not be determined; the skeleton uses `w-full` and the containing row controls its grid.

## 21. Table System

`components/tables/DataTable.tsx` is the reusable table architecture. It uses TanStack Table state for sorting, column filtering, visibility, selection, global filtering, pagination, and optional toolbar/export/bulk controls.

| Property              | Actual value                                                                   |
| --------------------- | ------------------------------------------------------------------------------ |
| Outer table surface   | `rounded-md border border-tf-border bg-tf-surface overflow-hidden`             |
| Header background     | `bg-tf-surface-2`                                                              |
| Header height/padding | `h-10 px-4`                                                                    |
| Header type           | `text-xs uppercase tracking-wider text-tf-text-muted font-semibold`            |
| Row height            | `h-[52px]`                                                                     |
| Cell padding          | `px-4 py-2`                                                                    |
| Cell type             | `text-sm text-tf-text-primary`                                                 |
| Alternation           | odd row `bg-tf-surface-2/50`; even row transparent                             |
| Hover                 | `hover:bg-tf-primary-soft transition-colors`                                   |
| Loading               | five skeleton rows, each cell `h-4 w-full` skeleton                            |
| Empty                 | injected `emptyState`, otherwise `No results found.` in `h-24` row             |
| Toolbar               | separate `space-y-4` region; search/filter/visibility/export options           |
| Pagination            | shared TanStack pagination; page sizes 10/20/30/40/50                          |
| Overflow              | table container/primitive supports horizontal scrolling; no forced card reflow |

`DataTableToolbar` uses a search width of `250px`, expanding to `350px` at large screens according to the implementation. `DataTableRowActions` uses a three-dot DropdownMenu with View/Edit/Delete, and Delete opens an AlertDialog explaining permanence. Customer tables commonly use a mono green reference, two-line identity/contact cells, status badges, and a final actions column.

## 22. Modal System

The canonical modal primitive is `components/ui/dialog.tsx`, built on Radix Dialog. The overlay is fixed, `z-50`, `bg-black/20`, `duration-100`, fade-in/out, with optional backdrop blur support. Content is centered at 50/50, full-width up to `max-w-[calc(100%-2rem)]`, `sm:max-w-md`, `p-6`, `gap-6`, `bg-popover`, `shadow-md`, `ring-1 ring-foreground/10`, and `rounded-none`. It uses 100ms zoom/fade animations. The close control is an absolute `size-9` ghost Button at `top-5 right-5` with a secondary background.

`DialogHeader` is a vertical `gap-2` block. `DialogTitle` is heading-font, `text-lg`, semibold, uppercase with tracking. `DialogFooter` stacks reversed on mobile and becomes a right-justified row at `sm`, with `gap-2`. The shared primitive does not define separate small/large/full-screen modal variants; route code can override `className`, and `users/page.tsx` explicitly uses `sm:max-w-md bg-tf-surface border-tf-border`.

Confirmation dialogs are provided by `AlertDialog`/`DataTableRowActions`; destructive copy states that deletion is permanent. Form modals are not the primary CRUD pattern; drawers are. Exact focus return and keyboard handling come from Radix and were not customized in the inspected Dialog wrapper. The source does not define a custom modal z-index beyond `50`.

## 23. Drawer / Create / Edit Sidebar System

The canonical create/edit pattern is `components/forms/DrawerForm.tsx`, composed over `components/ui/sheet.tsx`.

```text
Sheet
├── SheetOverlay: fixed inset, z-50, black/20, fade
└── SheetContent: right-side fixed flex column
    ├── SheetHeader: fixed-height content, title/description, bottom border
    ├── scrollable body: form, p-x 6 / p-y 6
    └── footer: bottom border, Cancel, submit
```

| Property               | Actual value                                                    |
| ---------------------- | --------------------------------------------------------------- |
| Default side           | right                                                           |
| Generic Sheet width    | `w-3/4`, `sm:max-w-sm`                                          |
| DrawerForm small       | `sm:!max-w-[400px]`                                             |
| DrawerForm medium      | `sm:!max-w-[560px]`                                             |
| DrawerForm large       | `sm:!max-w-[720px]`                                             |
| DrawerForm extra large | `sm:!max-w-[900px]`                                             |
| Height                 | full viewport through `inset-y-0 h-full`                        |
| Overlay                | `fixed inset-0 z-50 bg-black/20`, optional backdrop blur        |
| Content                | `flex flex-col`, `p-0`, surface background, left border         |
| Header                 | `px-6 py-4`, bottom border, surface background, text-left       |
| Title                  | `text-xl font-semibold text-tf-text-primary`                    |
| Description            | `text-sm text-tf-text-secondary`                                |
| Body                   | `flex-1 overflow-y-auto px-6 py-6`                              |
| Form vertical rhythm   | `space-y-6`; feature sections often `space-y-8`                 |
| Footer                 | `px-6 py-4`, top border, surface background, right aligned      |
| Footer controls        | gap `3`; outline Cancel then primary submit                     |
| Animation              | Sheet slide/fade, `duration-200 ease-in-out`, right slide by 10 |

The footer submit button targets `form="drawer-form"`. On submit it disables both actions, renders a white `16px` spinner and `Saving...`, and preserves the form open/input state on mutation failure. Success callers show a toast, close the drawer, and reset form defaults. The drawer adds capture-phase pointer tracking to stop Select/Popover interactions from accidentally triggering drawer outside-click close. Radix supplies focus trapping and escape behavior; no custom transition duration beyond the Sheet classes was found. The drawer header/footer are structurally sticky by their flex placement while only the body scrolls.

## 24. Dropdown / Popover System

Dropdowns and popovers use shadcn/Radix primitives except `NotificationsDropdown`, which renders a local absolute div and fixed backdrop.

| Pattern                   | Actual implementation                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| User menu                 | `DropdownMenuContent align="end" w-56`, surface/border, labels/separators, account settings, destructive sign out |
| Row actions               | `DropdownMenu`, three-dot trigger, View/Edit/Delete                                                               |
| Form combobox             | Popover + Command, `w-[300px] p-0`, aligned start, searchable list max `300px`                                    |
| Sidebar collapsed tooltip | Radix Tooltip, right side, offset 15, delay 100ms, green surface/text                                             |
| Notifications             | `w-80`, `rounded-xl`, border, surface, `shadow-xl`, max list height `360px`, `z-50`                               |

The notification panel header is `px-4 py-3`, item rows `px-4 py-3`, footer `px-4 py-2.5`; unread rows use a soft primary background and a small left dot. The component fetches up to 20 notifications and polls every 30 seconds. Keyboard and positioning behavior for Radix components comes from the primitives; the hand-built notification panel has click-to-close backdrop behavior but no documented keyboard model.

## 25. Toast / Notification System

Root `Toaster` is Sonner at `position="top-right"` with `richColors`. `components/ui/sonner.tsx` configures theme-aware semantic colors and Lucide icons for success, info, warning, error, and loading. The exact toast width, duration, and animation are delegated to Sonner/default configuration; a custom project value could not be determined from the inspected source.

Use `showSuccess`, `showError`, `showInfo`, or `showWarning` from `lib/toast-utils.ts`. Toast IDs default to the message or parsed error code to deduplicate repeated notifications. `showError` parses the API error for a user-facing title/description and logs technical details separately. Mutation success messages are affirmative and may include a generated reference in `description`.

## 26. Loading / Skeleton System

Loading patterns are component-scoped rather than one global page loader:

- dashboard widgets render their own loading states;
- `DataTable` renders five rows of skeleton cells;
- `KpiCardSkeleton` fixes KPI geometry at `140px` height;
- `DataTableSkeleton` renders a header and configurable rows/columns;
- `ChartSkeleton` defaults to `280px` high;
- detail pages use `PageSkeleton` while fetching;
- auth/dashboard shell uses a centered `8px` spinner made from a border with a transparent top;
- submit controls disable and show an inline spinner/text.

Skeleton animation is `animate-pulse`; explicit spinner animation is `animate-spin`. During non-initial dashboard refetch, content is dimmed and pointer-disabled rather than replaced.

## 27. Empty State System

`components/shared/EmptyState.tsx` is the canonical empty presentation:

```text
centered dashed bordered surface
├── 64px circular surface with 32px Lucide icon
├── tf-h3 title
├── tf-body description, max-width md
└── optional primary action
```

The container uses `p-12`, `rounded-xl`, `border-dashed border-tf-border-strong`, `bg-tf-surface-2`, and `text-center`. The icon circle uses `h-16 w-16`, `rounded-full`, surface background, muted icon, `shadow-sm`, and `mb-4`. The action uses a primary button with normal-case text/tracking. Tables can inject this component into their empty row. Notifications use a much simpler centered `No notifications` message with no icon.

## 28. Error State System

There are three layers:

1. `ErrorBoundary` isolates widget render failures on dashboard and shell children.
2. `ErrorState` is used for recoverable request failures and offers retry (`dashboard/page.tsx` shows it when no data exists).
3. The dashboard layout handles backend availability with a full-screen Wi-Fi-off state, a centered 80px red-soft icon area, heading, explanatory body, full-width Try Again button, and four quick links.

Form errors remain inline next to their fields and are also surfaced for failed mutations through `showError`. Detail pages can show plain `Booking not found.` or feature-specific not-found output; a single universal detail error surface was not established.

## 29. Responsive Design

The project uses default Tailwind responsive prefixes. The source visibly uses `sm`, `md`, `lg`, and `xl`; exact configured breakpoint values were not overridden in the inspected source, so the numeric breakpoint values could not be determined from this repository alone.

| Breakpoint behavior | Actual source pattern                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Below `sm`          | Header rows stack; action groups wrap/stack; breadcrumbs hidden; drawer uses mobile width behavior                              |
| `sm`                | Page headers become row layouts; breadcrumbs appear; drawer max widths apply; auth form text aligns left on desktop side        |
| `md`                | Form grids become two columns; detail metadata expands from one/two columns; settings tabs adjust                               |
| `lg`                | Dashboard grids become 3/2 columns; auth split screen appears; mobile menu button disappears; sidebar shell is desktop-oriented |
| `xl`                | Branch KPI grids can reach four columns; toolbar/search receives larger widths                                                  |

Tables retain their semantic wide layout and rely on horizontal overflow. Forms collapse from two columns to one. Buttons generally retain their intrinsic dimensions, while header actions wrap through flex layout. Drawer generic width is `w-3/4` on narrow screens and fixed max-width classes on `sm`; no separate full-screen mobile drawer class is defined. Dialog content is constrained by `max-w-[calc(100%-2rem)]` on narrow screens.

## 30. Animation / Transition System

Declared tokens in `globals.css`:

| Token               | Value                               |
| ------------------- | ----------------------------------- |
| `--duration-fast`   | `150ms`                             |
| `--duration-base`   | `200ms`                             |
| `--duration-slow`   | `300ms`                             |
| `--duration-slower` | `500ms`                             |
| `--ease-default`    | `cubic-bezier(0.4, 0, 0.2, 1)`      |
| `--ease-spring`     | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `--ease-out`        | `cubic-bezier(0, 0, 0.2, 1)`        |

Observed behavior: sidebar width and shell offset transition for 300ms; sidebar items transition for 200ms; topbar icon backgrounds transition via component classes; Dialog uses 100ms fade/zoom; Sheet uses 200ms slide/fade; agency switcher uses `animate-in slide-in-from-top-2 duration-200`; skeletons pulse; spinners rotate. The source declares a spring token but no inspected component uses it. No universal page-enter animation was found.

## 31. Z-Index / Layering

| Layer                 |                                                           Actual value/use |
| --------------------- | -------------------------------------------------------------------------: |
| Normal content        |                                                                       auto |
| Sticky topbar         |                                                                     `z-30` |
| Fixed sidebar         |                                                                     `z-40` |
| Notification backdrop |                                                                     `z-40` |
| Sheet/Dialog overlay  |                                                                     `z-50` |
| Sheet/Dialog content  |                                                                     `z-50` |
| Notification panel    |                                                                     `z-50` |
| Tooltip               | Radix-managed; explicit component styles do not set a custom project layer |
| Toast                 |                    Sonner-managed; explicit project z-index not determined |

The notification backdrop is deliberately below its panel and above the topbar/sidebar layer. No central z-index token map exists.

## 32. CRUD / Create / Edit / Delete Patterns

### Create/edit

The common flow is:

```text
List page
→ permission check
→ openCreate/openEdit from useEntityDrawer
→ reset defaults or map entity to form
→ DrawerForm + RHF + Zod
→ feature mutation hook
→ success toast (reference on create)
→ close + reset
```

Customers demonstrates the pattern. `useEntityDrawer` owns `isDrawerOpen`, `editingId`, `isEditing`, and open/close transitions. `mapCustomerToForm` maps edit data and a feature default object initializes create. A failed mutation calls `showError`, leaves the drawer open, and preserves input.

### Delete

Row actions expose Delete only when `usePermissions` allows it. The action opens a destructive AlertDialog, then calls the feature delete mutation. Success produces a success toast; failure produces a parsed error toast. The delete copy explicitly says the operation cannot be undone.

### View/detail

View actions navigate with `router.push('/entity/id')`. Detail pages fetch by route param, show `PageSkeleton`, render `DetailHeader`, and compose cards/tabs/panels. Booking details can generate/open invoice and receipt print routes in a new browser tab.

### Permission and role behavior

Navigation filters by roles from `constants/nav.ts`. Dashboard layout protects route families for `admin`/`manager`. Fine-grained create/edit/delete visibility uses `usePermissions`; administrators bypass individual permissions according to the implementation.

## 33. Component Architecture

### Reuse boundaries

| Type                    | Current location/examples                                                                    | Rule evidenced by code                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Global primitive        | `components/ui/Button`, `Input`, `Dialog`, `Sheet`, `Tabs`, `Table`                          | Base interaction/accessibility primitive; do not replace with raw equivalents |
| Global shared           | `EmptyState`, `DetailHeader`, `StatusBadge`, `CurrencyDisplay`, `ErrorState`, `PageSkeleton` | Repeated domain-neutral visual patterns                                       |
| Layout-level            | `Sidebar`, `Topbar`, `SidebarNav`, `UserMenu`, `NotificationsDropdown`                       | App shell/navigation concerns                                                 |
| Cross-feature composite | `DrawerForm`, `FormField`, `DataTable`, `DataTableToolbar`, `DataTableRowActions`            | Repeated workflow composition                                                 |
| Feature-specific        | `RecordPaymentDrawer`, `BookingDocumentsPanel`, dashboard widgets                            | Business domain behavior and presentation                                     |
| Route-specific          | `app/(dashboard)/customers/page.tsx` column definitions and form section composition         | Page data, permissions, and mutation orchestration                            |
| Utility                 | `lib/*`, `hooks/*`, `store/*`, `constants/*`                                                 | No UI rendering or narrowly shared behavior                                   |

The codebase uses aliases such as `@/components/...`, `@/features/...`, `@/lib/...`, and `@/types`. Components use PascalCase filenames and exported PascalCase functions; hooks use `use-*.ts` or `use-*.tsx`; stores use `*.store.ts`; schemas use `*.schema.ts`; pages are Next's `page.tsx`; route folders are lowercase plural entity names with `[id]` for details.

Some route pages still contain substantial raw markup around shared primitives. A future project copying this architecture should preserve the existing ownership boundaries first, then only extract a shell or entity template when repeated code is proven. There is no repository-wide automatic extraction threshold beyond the `AGENTS.md` rule to compose existing UI and extract repeated patterns.

## 34. Design Tokens

The central source of truth is `travelflow-frontend/app/globals.css`. It defines shadcn semantic variables, TravelFlow colors, sidebar/topbar dimensions, explicit spacing, radius, shadows, animation, font stacks, and scrollbar tokens. `@theme inline` maps them into Tailwind names such as `bg-tf-primary`, `text-tf-text-primary`, `spacing-tf-sidebar`, and `spacing-tf-topbar`.

Behavioral constants are elsewhere:

| Source                            | Tokens/behavior                                               |
| --------------------------------- | ------------------------------------------------------------- |
| `constants/nav.ts`                | Navigation hierarchy, labels, role restrictions, Lucide icons |
| `constants/status.ts`             | Status-to-color/label mappings used by StatusBadge            |
| `components/forms/DrawerForm.tsx` | Drawer sizes 400/560/720/900px                                |
| `store/sidebar.store.ts`          | Persisted open/collapsed default `true`                       |
| `lib/query-client.ts`             | Query stale/cache/retry behavior                              |
| `app/layout.tsx`                  | Font families/weights, provider order, toast position         |

## 35. Cross-Page Consistency Analysis

Consistent across dashboard, customers, bookings, leads, quotations, invoices, receipts, suppliers, expenses, branches, users and reports:

- dashboard shell geometry and `p-6` main padding;
- `space-y-6` major vertical rhythm;
- title/subtitle/actions arranged as a responsive flex row;
- surface + `border-tf-border` + `shadow-sm` treatment for list headers and many panels;
- green primary action treatment;
- `md` two-column forms and `lg` multi-column content grids;
- shared `DataTable`, status, empty, drawer, permission, toast and error patterns where applicable;
- Lucide icons and compact muted labels;
- light surface backgrounds over an off-white page canvas.

What varies:

- detail pages omit the bordered title band and use `DetailHeader` directly;
- cards may be shadcn `Card` or raw divs with equivalent classes;
- some cards use `rounded-lg`, while route surfaces use `rounded-xl`;
- settings has a tabbed consolidated route and standalone subroutes;
- login and sign-in are separate visual implementations;
- invoice/receipt detail and print screens intentionally use white document surfaces and black text;
- some feature pages use direct `API` calls/local state instead of the feature TanStack Query pattern;
- notification dropdown is custom markup instead of DropdownMenu.

## 36. Existing Inconsistencies

| Component/location     | Difference                                                                      | Actual implementation                                                                     | Likely reason                                                             |
| ---------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Card vs route surfaces | `rounded-lg` vs `rounded-xl`                                                    | Base Card is `rounded-lg`; page header/table shells commonly `rounded-xl`                 | Primitive defaults versus route styling                                   |
| Dialog vs sign-in      | Dialog is square; sign-in card is `rounded-2xl`                                 | `DialogContent rounded-none`; `(auth)/sign-in` uses `rounded-2xl`                         | Different implementation eras/purposes                                    |
| Button casing          | Base buttons uppercase/tracked; many route actions normal case                  | Button primitive uses uppercase/tracking; route classes add `normal-case tracking-normal` | Compact system default overridden for readable workflow labels            |
| Input height           | Shared input is `h-10`; login inputs/buttons are `h-11`                         | `components/ui/input.tsx`/FormField vs login page                                         | Auth emphasis and standalone composition                                  |
| Card borders           | Base Card has ring but not always tf border; routes add explicit tf border      | `Card.tsx` uses `ring-1`; detail pages add `border-tf-border`                             | shadcn primitive plus TravelFlow surface styling                          |
| Form gaps              | `gap-4`, `gap-6`, and `space-y-8` coexist                                       | Customer form uses `gap-4` fields and `space-y-8` sections; settings uses `gap-6`         | Different density at field/section/page scales                            |
| Notification control   | Custom absolute panel rather than Radix DropdownMenu                            | `NotificationsDropdown.tsx`                                                               | Needs polling/unread/dismiss behavior, but keyboard parity is not evident |
| Settings architecture  | Consolidated tabs plus standalone settings pages                                | `settings/page.tsx` and `settings/{company,branding,notifications}/page.tsx`              | Feature growth/legacy coexistence                                         |
| Data access            | TanStack Query hooks and direct API/local state both occur                      | Customers uses feature queries; booking detail uses `API` and `useState`                  | Gradual migration or feature-specific implementation                      |
| Mobile sidebar         | Desktop fixed collapse plus mobile toggle; no separate mobile drawer            | `Sidebar.tsx`, `Topbar.tsx`                                                               | Shared persistent sidebar behavior rather than distinct mobile shell      |
| Typography application | Token utility classes and raw Tailwind text classes coexist                     | `.tf-h2` alongside `text-3xl`, `text-sm`, etc.                                            | Incremental implementation                                                |
| Dark header token      | `--tf-header-bg` is declared in TravelFlow variables but not mapped in `@theme` | `globals.css` and Topbar arbitrary variable class                                         | Direct CSS variable usage for this token                                  |

Do not silently normalize these differences when reproducing the existing family. Decide deliberately whether the new project needs fidelity to a specific route or a selected canonical variant.

## 37. New Project Implementation Guide

Build in this order to reproduce the current system:

1. Establish the Next App Router route groups and TypeScript alias conventions.
2. Add the same font loading: IBM Plex Sans headings, Inter/Roboto body, JetBrains Mono technical values.
3. Copy the CSS variable model into global CSS, including light/dark TravelFlow colors, spacing, radius, shadows, durations, and sidebar/topbar dimensions.
4. Install/configure shadcn/ui-style Radix primitives and Tailwind v4 imports.
5. Implement the root provider order: theme, auth, sidebar hydration, query, global Sonner toaster.
6. Implement the fixed sidebar, role-filtered nav, collapsed tooltips, profile/logout, and persisted Zustand open state.
7. Implement the sticky 60px topbar with breadcrumbs, command search, notifications, theme toggle, focus mode, and user menu.
8. Implement the dashboard route-group auth/role gate and `p-6` scrollable main shell.
9. Build Button, IconButton, Input, Label, Select, Popover/Command, Tabs, Badge, Card, Dialog, Sheet and Table from shadcn primitives.
10. Add shared `EmptyState`, `ErrorState`, `PageSkeleton`, `StatusBadge`, `DetailHeader`, and formatters.
11. Add `FormField` composites with RHF/Zod, required/error/focus behavior, and responsive grids.
12. Add `DrawerForm` in four widths with scrollable body and fixed header/footer.
13. Add TanStack `DataTable`, toolbar, row actions/AlertDialog, skeleton rows, empty injection, and pagination.
14. Add toast/error helpers with deduplicated success/error/info/warning notifications.
15. Add dashboard widgets and the 2/3 + 1/3 / 1/2 + 1/2 composition.
16. Implement entity list pages with permission-gated actions and create/edit drawers.
17. Implement detail pages with `DetailHeader`, cards, tabs, related panels and feature drawers.
18. Implement settings and print/document templates, intentionally keeping document surfaces separate from the dashboard canvas.
19. Verify the `sm`/`md`/`lg` responsive compositions and horizontal table overflow.
20. Compare the new project against the existing pages named in the reference index below at desktop and narrow widths.

## 38. "Do Not Deviate" Rules

- Keep the shell at a 60px topbar, 240px expanded sidebar, and 64px collapsed sidebar.
- Keep the dashboard main at `p-6` with `space-y-6` as the dominant page rhythm.
- Use the TravelFlow green/off-white/gold token palette instead of introducing a new primary hue.
- Load and use IBM Plex Sans for headings, Inter/Roboto for body, and JetBrains Mono for technical identifiers.
- Use shadcn/Radix primitives from `components/ui`; do not create parallel buttons, dialogs, inputs, tables, or dropdown primitives.
- Keep primary buttons green with the existing hover token and preserve the compact uppercase primitive default unless a route intentionally overrides it.
- Keep inputs approximately `h-10` and `rounded-lg`; reserve `h-11` auth controls for the established auth pattern.
- Keep major surfaces bordered, lightly shadowed, and generally `rounded-xl` when they are route-level bands.
- Keep lists on the DataTable architecture and details on DetailHeader/card/tab composition.
- Keep create/edit workflows in right-side DrawerForm panels with a scrollable body and bottom action footer.
- Preserve inline validation plus parsed mutation error toasts and preserve failed form input.
- Keep role-based navigation filtering separate from route-level role enforcement and fine-grained action permissions.
- Preserve responsive transitions: one column below `md`/`lg`, two-column forms at `md`, and multi-panel dashboard/detail layouts at `lg`.
- Do not assume a universal max-width: the current authenticated shell is full available width.
- Treat `/login`, `/sign-in`, settings subroutes, direct API detail pages, and print pages as known variants, not hidden canonical rules.

## 39. Copy-Paste Design Specification for the New Project

```text
Build an operational travel-agency ERP frontend using the TravelFlow family system.

Use Next App Router, TypeScript, Tailwind CSS v4, shadcn/Radix UI primitives,
Lucide icons, TanStack Table, React Hook Form, Zod, TanStack Query, Zustand,
next-themes, and Sonner.

Load IBM Plex Sans (500/600/700) for headings, Inter (400/500/600) for body,
Roboto (400/500) as body fallback, and JetBrains Mono (500) for identifiers.

Use these core light tokens: background #f7f8f4, surface #ffffff,
surface-2 #f2f5ef, primary #2f6b3b, primary-hover #255730,
primary-soft #eef7f0, accent #c79b2d, border #dde5dc,
border-strong #c7d2c5, text-primary #1b1f1c, text-secondary #4b5563,
text-muted #6b7280. Use the existing dark values from the TravelFlow CSS token
set rather than inventing a second dark palette.

Use 240px expanded and 64px collapsed fixed sidebar widths, a sticky 60px topbar,
and a full-height shell whose scrollable main uses p-6 and the TravelFlow background.
Sidebar nav is grouped, role-filtered, icon-led, and uses a 3px green left accent
and soft green active background. Collapsed items have right-side tooltips.

Use 6px/10px/14px/20px/full radius tokens, 1px tf borders, and the declared
shadow-xs through shadow-xl scale. Use 4/8/12/16/20/24/32/40/48/64px spacing
values, with p-6 and gap-6 as the dominant page rhythm.

Use tf-h1 32px, tf-h2 24px, tf-h3 20px, tf-h4 16px, body 14px, body-sm 13px,
caption 12px, overline 11px, KPI 36px/28px. Page headers are commonly a
responsive flex row with title/subtitle left and actions right inside a bordered,
surface, p-6, rounded-xl, shadow-sm band.

Use green primary buttons, shadcn outline/secondary/ghost/destructive/link
variants, h-10 default buttons, h-9 small, h-11 large, and icon sizes 7/9/10/11.
Preserve the primitive uppercase/tracked default and explicitly use
normal-case tracking-normal only for workflow labels that need it.

Use h-10 rounded-lg surface inputs with muted labels above, required danger '*',
space-y-2 fields, inline danger messages/icons, and green focus rings. Compose
forms with RHF + Zod and responsive md:grid-cols-2 layouts.

Use a TanStack DataTable in a rounded-md bordered surface: h-10 uppercase muted
header, h-52px rows, px-4 cells, alternating surface-2 rows, primary-soft hover,
five skeleton rows, injected EmptyState, toolbar, sorting/filtering/visibility,
and 10/20/30/40/50 pagination.

Use right-side DrawerForm panels at 400/560/720/900px max widths. The drawer has
a surface header px-6 py-4, scrollable body px-6 py-6, and surface footer px-6
py-4 with outline Cancel and green submit. Preserve focus, outside-click
handling for open popovers/selects, disabled loading actions, failed input, and
success/error toast behavior.

Use centered Radix Dialogs at max-md by default with the existing black/20 overlay,
z-50 layering, p-6, shadow-md, ring, 100ms fade/zoom, and rounded-none default.
Use AlertDialog for destructive confirmation. Use Sonner top-right with parsed,
deduplicated success/error/info/warning helpers.

Responsive behavior: stack headers and forms on narrow screens, show two-column
forms at md, show dashboard/detail multi-column grids at lg, hide breadcrumbs below
sm, hide the mobile menu button at lg, and preserve horizontal table overflow.
Use the existing route-level variants for auth, settings, and print documents
instead of making them look like dashboard cards.
```

## 40. File / Component Reference Index

| Pattern                    | Primary reference                                                                                  | Example usage                         |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Global tokens/typography   | `travelflow-frontend/app/globals.css`                                                              | All routes                            |
| Root fonts/providers       | `travelflow-frontend/app/layout.tsx`                                                               | All routes                            |
| Authenticated shell        | `travelflow-frontend/app/(dashboard)/layout.tsx`                                                   | Dashboard routes                      |
| Sidebar                    | `travelflow-frontend/components/layout/Sidebar.tsx`                                                | Dashboard shell                       |
| Sidebar item/nav           | `travelflow-frontend/components/layout/SidebarItem.tsx`, `SidebarNav.tsx`                          | Navigation                            |
| Navigation definitions     | `travelflow-frontend/constants/nav.ts`                                                             | Sidebar/role filtering                |
| Topbar                     | `travelflow-frontend/components/layout/Topbar.tsx`                                                 | Dashboard shell                       |
| User menu                  | `travelflow-frontend/components/layout/UserMenu.tsx`                                               | Topbar                                |
| Notifications              | `travelflow-frontend/components/layout/NotificationsDropdown.tsx`                                  | Topbar                                |
| Buttons                    | `travelflow-frontend/components/ui/button.tsx`                                                     | All action surfaces                   |
| Cards                      | `travelflow-frontend/components/ui/card.tsx`                                                       | Detail/report/dashboard panels        |
| Dialog                     | `travelflow-frontend/components/ui/dialog.tsx`                                                     | Users and confirmations               |
| Sheet                      | `travelflow-frontend/components/ui/sheet.tsx`                                                      | Drawer foundation                     |
| Create/edit drawer         | `travelflow-frontend/components/forms/DrawerForm.tsx`                                              | Customers, bookings, leads, suppliers |
| Form fields                | `travelflow-frontend/components/forms/FormField.tsx`                                               | Customer CRUD and feature forms       |
| Tables                     | `travelflow-frontend/components/tables/DataTable.tsx`                                              | Customers and entity lists            |
| Table actions              | `travelflow-frontend/components/tables/DataTableRowActions.tsx`                                    | List CRUD                             |
| Empty state                | `travelflow-frontend/components/shared/EmptyState.tsx`                                             | Customers and empty lists             |
| Loading states             | `travelflow-frontend/components/shared/LoadingSkeleton.tsx`, `PageSkeleton.tsx`                    | Dashboard/detail/list                 |
| Detail header              | `travelflow-frontend/components/shared/DetailHeader.tsx`                                           | Booking/customer/supplier details     |
| Status badges              | `travelflow-frontend/components/shared/StatusBadge.tsx`, `constants/status.ts`                     | Booking/list/detail status            |
| Toast/error behavior       | `travelflow-frontend/lib/toast-utils.ts`, `lib/error-parser.ts`                                    | CRUD mutations/auth                   |
| Dashboard composition      | `travelflow-frontend/app/(dashboard)/dashboard/page.tsx`                                           | KPI/charts/activity/table             |
| Representative list CRUD   | `travelflow-frontend/app/(dashboard)/customers/page.tsx`                                           | Search/table/drawer/form              |
| Representative detail      | `travelflow-frontend/app/(dashboard)/bookings/[id]/page.tsx`                                       | Header/cards/tabs/payment drawer      |
| Representative auth        | `travelflow-frontend/app/(auth)/login/page.tsx`                                                    | Split-screen login                    |
| Alternate auth variant     | `travelflow-frontend/app/(auth)/sign-in/page.tsx`                                                  | Centered-card login                   |
| State/query infrastructure | `travelflow-frontend/providers/QueryProvider.tsx`, `lib/query-client.ts`, `store/sidebar.store.ts` | Caching and shell state               |

The source does not provide an authoritative visual screenshot specification, compiled Tailwind breakpoint table, universal toast dimensions/duration, universal card/stat dimensions, or a centralized z-index token file. Those details should be measured or intentionally selected only after choosing which existing route variant the new project is meant to match.
