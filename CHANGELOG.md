# Changelog

## [2026-11-09] - Failed Messages (Kafka dead letters)

### Added
- **Failed Messages** (`/admin/dead-letters`): lists the messages other Kaizen services failed to process, with a per-topic summary, filters (status, topic, request ID, failure dates, order) and pagination.
- **Replay**: single, selected, or the oldest 25 pending at a time (optionally per topic; run it again to continue). Replaying can overwrite newer changes, so the portal asks for an explicit acknowledgement before it sends `force=true`; per-message outcomes are shown, and a message whose replay fails stays pending with the reason. If a replay times out, the portal says it may still be running rather than offering to start it again.
- **Delete and clear**: delete one or several messages (with a warning when they have not been replayed), and clear already-replayed messages by topic and by how long ago they failed. Pending messages are never removed by clearing.
- **Message details**: why it failed, stack trace, Kafka position, replay history (count, last error, who replayed it) and the payload with a copy button.
- **Visibility**: a pending-count badge on the new *Operations > Failed Messages* navigation item and an alert on the dashboard when messages are waiting. Polling stops after the first 403, so a user without access isn't refused every minute.
- Mobile layout: messages show as cards on small screens so every action stays reachable.
- Playwright coverage (`tests/e2e/dead-letters.spec.ts`, desktop and mobile projects) against an in-memory fake of the billing API that mirrors its validation. The spec seeds its own session and API responses, but still runs behind the suite's usual global setup (which logs in with `E2E_USERNAME`/`E2E_PASSWORD`).

### Changed
- Regenerated the billing API client (`npm run generate:api`) for the new `admin` endpoints. The regeneration also picked up three optional filters on the dynamic package config models (`currencyCode`, `usableOnly`, `serviceSubcategoryId`) that were already in the deployed spec.

## [2026-05-05] - Admin Portal Restoration & UI Refinement

### Added
- **Offers Utility**: Re-integrated the **Price Distribution Calculator** into both the Create and Edit modals of the Offers module, allowing admins to derive unit prices from a total target price and team size.
- **Packages Restoration**: Recovered the full form structure and data binding for Packages, including missing fields like `orgTypeIds`, `maximumTeamSize`, and `discountId`.
- **Reactive Data Fetching**: Implemented `useGetServicePackage` and `useGetOffer` hooks to ensure "Get by ID" parity for all edit operations.

### Fixes & Refinement
- **UI Design**: Restored the cleaner, white-themed dialog design for both Packages and Offers modules, removing the dark background header as per user preference.
- **Packages Layout**: Removed the redundant "Top 4" summary grid to ensure a single, unified view that correctly responds to the grid/list toggle.
- **Pagination**: Standardized the `PaginationController` across all modules to always show result counts and consistent navigation controls.
- **Accessibility**: Resolved Radix UI warnings by ensuring all `DialogContent` components (including loading states) have a valid `DialogTitle`.
- **TypeScript**: Fixed DTO mapping errors to support `freeDays` trial settings via casting, maintaining functional requirements despite model mismatches.

### Previous Updates
- **Permissions Management:** Built a new permissions assignment interface within roles management.
- **Accounts Module Refactor:** Completely standardized `admin/accounts/page.tsx` for full CRUD operations.
- **Currency Formatting:** Implemented GHS currency fallback across all pricing modules.
- **Server-Side Search:** Migrated all registry modules to performant server-side search.
