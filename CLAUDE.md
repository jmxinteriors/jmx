# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Marketing website + serverless backend for JMX Interiors Ltd (Edmonton drywall, basement development, and painting contractor), deployed on Azure Static Web Apps. See [README.md](README.md) for production URLs, Azure resource names, and operational status/pending items — this file focuses on how the code is put together.

## Development

- **Frontend**: `index.html` is a single self-contained static page (no build step). Open directly in a browser or serve with any static file server to preview.
- **API**: Node.js Azure Functions in `api/`. To run locally: `cd api && npm install && npm start` (runs `func start`, requires the Azure Functions Core Tools). Needs `api/local.settings.json` populated with the Graph credentials (gitignored, never commit it — ask for current values rather than assuming defaults).
- **Deploy**: manual via SWA CLI, not yet wired to GitHub Actions — see the Deploy section in README.md for the exact command. Note: `swa deploy` fails with "Current directory cannot be identical to or contained within artifact folders" if run from inside the app_location itself; run it from the parent directory instead.
- No lint/test tooling is configured.

## Architecture

### Frontend (`index.html`)
Single HTML file, all CSS in one `<style>` block (no separate stylesheet, no CSS framework). Sections: hero, services, before/after, gallery (`#gallery`, hardcoded `<img>` markup per photo), quote form, reviews (rendered client-side via `fetch('/api/reviews')`), footer. Mobile nav is a JS-toggled hamburger menu, not CSS-only. External deps are CDN-only (Google Fonts, Font Awesome) — no npm/bundler for the frontend.

Both the quote form and the review form POST JSON to the API (`fetch`, not native form submission) and include a hidden honeypot field the backend checks.

### Backend (`api/`)
Azure Functions v4 (`@azure/functions` programming model — each function self-registers via `app.http(...)` in `api/src/functions/*.js`, no `function.json` files):

- `POST /api/quote` ([api/src/functions/quote.js](api/src/functions/quote.js)) — validates fields, checks honeypot/rate-limit, appends a row to the `Quotes` Excel table, sends a notification email.
- `POST /api/review` — same pattern, appends to the `Reviews` table with `Estatus=pending`.
- `GET /api/reviews` — reads the `Reviews` table and returns only rows where `Estatus=approved` (filtered in-memory; Graph doesn't support filtering table rows server-side).

All three share:
- [api/src/graph.js](api/src/graph.js) — thin Microsoft Graph client. Auth is MSAL client-credentials flow (`ConfidentialClientApplication`, app-only permissions, token cached in-memory per Function instance). `addTableRow`/`getTableRows` hit the Excel **workbook API** (`/workbook/tables/{name}/rows`) against a fixed OneDrive file (`EXCEL_DRIVE_USER` + `EXCEL_FILE_PATH` env vars) — not a database. `sendMail` uses the Graph `sendMail` endpoint from `MAIL_FROM`.
- [api/src/security.js](api/src/security.js) — in-memory per-instance IP rate limiting (`isRateLimited`) and honeypot field check (`isHoneypotFilled`). Being in-memory, this resets on cold start and isn't shared across scaled-out instances — good enough for this traffic volume, not a hard guarantee.

Required env vars (Application Settings in Azure, `local.settings.json` locally, never in the repo): `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `EXCEL_DRIVE_USER`, `EXCEL_FILE_PATH`, `MAIL_FROM`, `MAIL_TO`.

There is no admin UI: reviews are approved by manually editing the `Estatus` column in the Excel file directly.

### `api/scripts/create-excel-file.js`
One-off script used to bootstrap the Excel workbook: Graph rejects a pre-built `.xlsx` uploaded via `exceljs` (`FileCorruptTryRepair`), so this script uploads a blank workbook and then creates the `Quotes`/`Reviews` sheets and tables through the Graph Workbook API itself. Only needed again if the Excel file has to be recreated from scratch.

### `staticwebapp.config.json`
Defines the `/api/*` route as anonymous-accessible, SPA-style navigation fallback to `index.html`, the `.webp` MIME type, and security headers (CSP, `X-Content-Type-Options`, `Referrer-Policy`). Edit this file (not a `.htaccess`/`web.config`) to change routing or headers.
