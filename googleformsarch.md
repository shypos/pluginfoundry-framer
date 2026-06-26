# Google Forms to Framer Integrator

## Overview

The Google Forms integration module is a full-stack tool designed to convert standard, consumer-facing Google Forms into beautiful, white-labeled, standalone React components ready for deployment in Framer or any standard React application. It achieves this by bypassing standard embedded iframes and programmatically extracting the internal structural schema of the target Google Form, effectively allowing developers to build completely custom frontend UI shells that securely proxy data back into the original Google spreadsheet.

## Features

- **Headless Form Parser**: Scrapes the public viewform URL of a Google Form, circumventing CORS securely via an Express backend proxy, and parses the raw HTML to extract the undocumented internal array payload (`FB_PUBLIC_LOAD_DATA_`).
- **Dynamic Schema Inference**: Understands complex Google Form data types and strictly maps them to native React equivalents:
  - Short/Long Text inputs (`text`, `textarea`)
  - Multiple Choice options (`radio`) with parsed choice arrays.
  - Dropdowns (`select`) populated dynamically with scraped options.
  - Checkboxes (`checkbox`) that support multiple select arrays.
- **Smart Component Generator**: Compiles an optimized, lightweight React application component payload dynamically injected with the custom `entry.XYZ` submission coordinates. It automatically applies custom user-defined styling preferences (Border Radius, Colours, Typography).
- **Interactive Sandbox & Playground**: Provides an inline, live-render view where the user can physically interact with the parsed input elements to verify mappings and see the structural outcome before copying the generated code.
- **Local Submission Tracking & Mocking**: Integrates with a local backend JSON file (`google_forms_data.json`) to simulate endpoints, log fake metrics/analytics on submissions, and allow for CSV downloading of testing datasets.

## Architecture & Moving Parts

### 1. Frontend Layer (`src/modules/forms/`)
- **`index.tsx`**: The core view controller managing the dashboard. Handles listing generated connections, triggering proxy scrapes, and orchestrating state. It houses the Sandbox UI and custom styling form.
- **`formParser.ts`**: The engine for semantic extraction. Instead of regex, which is failure-prone on nested payloads, it uses bracket-counting algorithms to safely carve out the active JSON schema block from Google's obfuscated HTML strings. If a scraping error occurs, it throws reliable validation errors back to the UI.
- **`codeGenerator.ts`**: A string-builder factory. Takes the normalized `ExtractedField` metadata array and an `options` styling block to emit fully-compiled TSX/JSX ready to be pasted on a Canvas.
- **`Supabase Mock Layer`** (`src/lib/supabase.ts`): Replicates real Supabase calls into `localStorage` logic as a developer stand-in.

### 2. Backend Layer (`server/routes/googleforms.ts`)
- **CORS Bypassing (`GET /api/forms/proxy`)**: Browsers block javascript from reading cross-origin HTML due to security constraints. This route acts as a server-side tunnel to fetch the target URL safely and relay the raw HTML body down to the client `formParser.ts`.
- **Local Database Simulator**: Provides full CRUD REST APIs (`GET`, `POST`, `PUT`, `DELETE` over `/api/forms`) for storing metadata regarding connected forms securely inside the `google_forms_data.json` local flat-file storage tree.
- **Submissions Endpoint**: Includes a mock `/api/forms/:id/submit` router to swallow test actions from the playground and visually increment the dashboard stats metric safely.

## Global IDs and Data Structures Flow

To keep the application highly consistent without a heavy external database, IDs are tightly bound either per-user or globally utilizing custom prefixes throughout LocalStorage and JSON endpoints.

### Forms Database Structure
- **Persistent Backend File**: `google_forms_data.json`
- **Form Object ID (`id`)**: `frm_${Math.random().toString(36).substr(2, 9)}` (e.g. `frm_1`, `frm_kw9x2b`)
- **Extracted Form Field IDs (`ExtractedField.id`)**: When scraping, fields get deterministic IDs appended with their entry matrix (e.g., `field_0_1000001` or custom field `man_b4x8y`).
- **Entry Submission IDs**: Google's own identifiers (`entry.1000001`), necessary to pass values back dynamically.

### PluginFoundry LocalStorage Registry context
The frontend caches UI contexts aggressively utilizing dynamic `pf_google_` and `pluginfoundry_` prefixed schemas so that on refresh, the dashboard reconnects smoothly.

1. **`pf_google_fields_{form.id}`**: Caches the extracted `ExtractedField[]` array for immediate parsing.
2. **`pf_google_url_{form.id}`**: Caches the original linked Google Form URL pointing to the user's view file.
3. **`pf_google_action_{form.id}`**: Modifies the `viewform` URL ending into a functional `formResponse` target.
4. **`pf_google_subs_{form.id}`**: Maintains an array of mock sandbox submission records bound to the form instance.
5. **`pluginfoundry_forms_{userId}`**: Simulated relational reference table from the Supabase mock framework syncing to `google_forms_data.json`.
6. **`pluginfoundry_billing_{userId}`**: Caches and interacts with `used_forms` versus `limit_forms` to calculate UI usage bars dynamically when a form is added via REST POST payload.

