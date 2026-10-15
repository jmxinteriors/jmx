# AGENTS.md

This file provides context, architectural details, and operational guidance for AI agents (including Antigravity / Gemini) working within this repository.

---

## Communication Channel (questions for the developer)

If you hit a technical or process question you cannot resolve yourself, or an error that persists after a reasonable attempt, STOP instead of improvising and leave it in [canal-comentarios/](canal-comentarios/README.md). Follow that README exactly: one file per question, only that file is committed and pushed to `main`, and never include credentials, secrets or customers' personal data. Tell the user to notify the developer, and wait for the answer before continuing. Pushing anything outside `canal-comentarios/` to `main` deploys the site to production.

---

## Project Overview

Marketing website and serverless backend for **JMX Interiors Ltd** (Edmonton-based drywall, basement development, framing, and painting contractor), hosted and deployed on **Azure Static Web Apps (SWA)**.

- **Primary References**: See [README.md](README.md) for production URLs, Azure resource names, deployment credentials, and operational status.
- **Frontend**: Self-contained static website (`index.html`) with zero build step.
- **Backend**: Node.js Azure Functions v4 (`api/`) integrated with Microsoft Graph (OneDrive Excel workbook storage & Outlook email).

---

## Development & Workflows

### Local Development

- **Frontend**:
  - Direct file / static file server preview (e.g., `npx serve .` or opening `index.html` in a browser).
  - No build or compilation step required.
- **Backend (API)**:
  - Located in the [api/](api) directory.
  - Run locally:
    ```bash
    cd api
    npm install
    npm start
    ```
  - `npm start` executes `func start` (requires Azure Functions Core Tools v4).
  - Requires `api/local.settings.json` containing Microsoft Graph credentials (this file is gitignored; never commit secrets).
- **Tooling**:
  - No dedicated linter or unit test suite is currently configured. Ensure code cleanliness and manual endpoint testing.

### Deployment

- Every push to `main` deploys to production through GitHub Actions (`.github/workflows/azure-static-web-apps.yml`); pushes that only touch `canal-comentarios/` are ignored by the workflow. A manual deploy via the Azure Static Web Apps CLI (`swa deploy`) is also possible.
- **Important**: When running `swa deploy`, do not run the command from inside the artifact/app directory directly, or it will throw an error: *"Current directory cannot be identical to or contained within artifact folders"*. Run it from the parent workspace root.

---

## Architecture & Codebase Map

### 1. Frontend ([index.html](index.html))

- Single self-contained HTML document.
- Inline `<style>` block containing all CSS (no CSS preprocessor or framework).
- External dependencies are loaded exclusively via CDN (Google Fonts, Font Awesome icons).
- **Key Sections**:
  - Hero with CTA
  - Services overview
  - Before / After comparisons
  - Gallery (`#gallery` with explicit `<img>` tags for portfolio photos)
  - Interactive Quote Form
  - Customer Reviews (rendered dynamically on the client via `GET /api/reviews`)
  - Footer & Contact details
- **Forms & Client Interactions**:
  - Forms submit JSON via `fetch()` to `/api/*` (no standard browser form navigation).
  - Includes a hidden honeypot input (`#fax_number` / `faxNumber`) to trap spam bots.
  - Mobile navigation is toggled via vanilla JavaScript.

### 2. Backend API ([api/](api))

Uses the **Azure Functions v4 Node.js programming model** (`@azure/functions`), where functions are declared directly via `app.http(...)` in `src/functions/*.js` without legacy `function.json` manifests.

#### Endpoints:
- **`POST /api/quote`** ([api/src/functions/quote.js](api/src/functions/quote.js)):
  - Validates request payload (name, email, phone, service, message).
  - Enforces rate limiting and honeypot checks.
  - Appends a new entry to the `Quotes` table in the OneDrive Excel workbook.
  - Dispatches an email notification via Microsoft Graph `sendMail`.
- **`POST /api/review`** ([api/src/functions/review.js](api/src/functions/review.js)):
  - Validates customer review submission (author, rating, comment) plus an optional `image` (base64, max 2 MB, magic-byte checked as JPEG/PNG/WebP).
  - Uploads the image to the `comentarios/` folder next to the Excel file as `<uuid>.<ext>`.
  - Appends row to the `Reviews` Excel table (columns `Date, Name, Rating, Comment, Status, Image`) with initial `Status = "pending"`; `Image` holds the filename or is empty.
- **`GET /api/reviews`** ([api/src/functions/reviews.js](api/src/functions/reviews.js)):
  - Retrieves rows from the `Reviews` Excel table.
  - Filters in-memory to return only items where `Status = "approved"` (Graph Workbook API does not support server-side OData filtering on table rows). Each item includes `imagen` (filename or `null`).
- **`GET /api/review-image/{name}`** ([api/src/functions/reviewImage.js](api/src/functions/reviewImage.js)):
  - Serves a review photo from OneDrive only if `name` matches the UUID filename pattern and its row is `approved`; otherwise 404. Photos are never public on their own.

#### Core API Services:
- **[api/src/graph.js](api/src/graph.js)**:
  - Microsoft Graph API client powered by MSAL (`@azure/msal-node`) client-credentials flow (`ConfidentialClientApplication`).
  - Caches access tokens in-memory per Function runtime instance.
  - Integrates with Excel Workbook API (`/workbook/tables/{name}/rows`) to treat the OneDrive `.xlsx` sheet as the primary data store.
  - Reads and writes review photos in the `comentarios/` OneDrive folder next to the workbook (`uploadComentarioFile`, `getComentarioFile`).
  - Dispatches notifications via `/users/{MAIL_FROM}/sendMail`.
- **[api/src/security.js](api/src/security.js)**:
  - In-memory per-instance IP rate limiter (`isRateLimited`).
  - Bot honeypot validator (`isHoneypotFilled`).

#### Required Environment Variables:
Configured in Azure Static Web App Application Settings or `api/local.settings.json`:
- `TENANT_ID`: Azure Active Directory / Entra Tenant ID
- `CLIENT_ID`: App Registration Client ID
- `CLIENT_SECRET`: App Registration Client Secret
- `EXCEL_DRIVE_USER`: User Principal Name (email) owning the OneDrive Excel file
- `EXCEL_FILE_PATH`: Relative path to the workbook on OneDrive (e.g., `Documents/JMX_Database.xlsx`)
- `MAIL_FROM`: Sender mailbox address configured in Graph
- `MAIL_TO`: Destination mailbox address for quote notifications

#### Admin Workflow:
- There is no custom admin dashboard. Reviews and quotes are managed directly by opening and editing the Excel workbook in OneDrive/SharePoint (approving reviews by toggling `Status` to `approved`; to preview a review's photo, open the file named in its `Image` column inside `comentarios/`).

### 3. Utility Scripts ([api/scripts/](api/scripts))

- **`create-excel-file.js`**: One-off bootstrap script. Microsoft Graph rejects direct upload of pre-structured `.xlsx` files generated by third-party libraries (`FileCorruptTryRepair`). This script uploads an empty template and provisions the `Quotes` and `Reviews` tables and schemas directly through Graph Workbook API calls.

### 4. Routing & Configuration ([staticwebapp.config.json](staticwebapp.config.json))

- Configures route authorization (anonymous access to `/api/*`).
- Defines SPA navigation fallback pointing to `/index.html`.
- Registers MIME mappings (such as `.webp`).
- Sets HTTP security response headers (`Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).

---

## Agent Coding Guidelines & Constraints

1. **Keep Frontend Lightweight & Buildless**:
   - Do not introduce heavy frontend frameworks (React/Vue/Angular) or bundlers (Vite/Webpack) unless explicitly instructed.
   - Keep styling and JavaScript clean, accessible, and self-contained within `index.html` or direct static assets.
2. **Security & Secrets**:
   - Never hardcode or commit API secrets, client secrets, or credentials into repository files.
   - Always preserve honeypot validation and security headers on new form submissions and endpoints.
3. **Microsoft Graph & Excel Store**:
   - Be mindful that the Excel workbook API operates as an append/read store without database indexing; keep operations lightweight.
   - In-memory filtering must be maintained for queries (like `GET /api/reviews`).
4. **Azure Functions v4 Pattern**:
   - Keep functions structured using the v4 programming model (`app.http(...)`).
   - Do not create legacy `function.json` files.
5. **Git Author & Commits**:
   - All commits must use the identity `JMX Interiors <jmxinteriors@jmxinteriors.ca>`.

