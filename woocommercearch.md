# WooCommerce to Framer CMS Sync Architecture

## Overview

The WooCommerce sync bridge connects directly to the WordPress WooCommerce REST API and acts as a generic translation engine to seamlessly marshal eCommerce inventory, SKUs, and assets natively into a designated Framer CMS Collection via headless API manipulation.

## Features

- **Multi-Step Setup Wizard**: A clean UI logic chain ensuring users input target endpoints, validate API Key health, map active profiles, and approve automated schemas systematically.
- **Secure Key Handling**: Avoids passing secret keys from the client-side directly to WooCommerce endpoints. Keys are intercepted by backend REST routes and utilized in server-to-server validation.
- **Automated Field Selection & Schema Provisioning**: Allows the user to select from native WooCommerce metrics (like `stock_status`, `regular_price`, `sale_price`, `weight`) and prepares to map that to a target CMS container.
- **Status Logging**: Logs current dispatcher progress, step state, and visually confirms active configurations to the user.

## Architecture & Moving Parts

### 1. The Interactive Sync Wizard (`src/modules/woocommerce/components/TabFieldSelection.tsx` & `index.tsx`)
This is the heavy-lifting client interface executing the primary flow. It dynamically shifts between:
- **Step 1 - Authentication**: Collects WooCommerce domain address, Application Consumer Key (`ck_...`), and Consumer Secret (`cs_...`). Hits the local REST proxy to securely validate the handshake.
- **Step 2 - Connection Mode**: Evaluates available endpoint targets and determines the target Framer CMS collection layout for inventory.
- **Step 3 - Schema Mapping**: The "Active Field Queue Dispatcher". Here users physically check off matching WooCommerce API parameters (`slug`, `price`, `images`) they want migrated. The interface dynamically translates standard WooCommerce generic data strings into mapped local representation values.

### 2. State & Processing Logic
- The system heavily relies on `React State` to maintain the complex orchestration context without external dependencies, capturing connection IDs, validation polling, and list iterations. 
- During queue dispatching, it provides visual pipeline cues illustrating what data has been pulled from WordPress and queued for the Framer sync engine.
- A **`Supabase Mock Layer`** (`src/lib/supabase.ts`) stands in to intercept auth rules and provide a dummy tenant DB experience when testing components decoupled from the Postgres server.

### 3. Backend Proxies & Connectors (`server/`)
- Relies on safe REST routes (`/api/stores`) to encrypt REST credentials. It isolates the consumer keys safely inside the backend scope to bypass CORS restrictions when making `fetch()` / `GET` / `POST` calls against restrictive WooCommerce merchant security policies.
- **`server/db.ts`**: Implements flat-file Node database stores orchestrating the internal persistence of the PluginFoundry API layer configurations. 

## Global IDs and Data Structures Flow

There is a comprehensive cache identifier ecosystem running beneath PluginFoundry WooCommerce plugins that marries local caching UI state with JSON node servers seamlessly.

### Server-Side Database Keys (`server/db.ts` Files)
- **`woocommerce_stores.json`**: Primary store config. Identifies stores via `str_${Math.random().toString(36).substr(2, 9)}` (e.g. `str_1`, `str_xyz`). 
- **`woocommerce_cache_db.json`**: Product Catalog Cache.
  - Formatted products use WooCommerce native integers adapted to strings: `id: "101"`, `slug: "premium-espresso"`.
  - Stored inside memory collections mapped to the store ID: `catalog.products[storeId]` & `catalog.categories[storeId]`.
  - Categories mapped similarly `cat_1_1`.
- **`woocommerce_sync_logs.json`**: Debug telemetry. Generated as `log_${Math.random().toString(36).substr(2, 9)}`.
- **Framer Mapped Item IDs**: Used to resolve diffing logic during syncing. Denoted usually as `cms_item_{random}` if simulating mock collections locally within the NodeJS target pool, or native UUIDs when communicating over actual API keys. Map stored in Node as `store.productToCmsItemMap`.

### LocalStorage Client Cache (`PluginFoundry` context)
When users operate the dashboard UI, multiple properties are locally set on an individual "tenant store" basis to cache UI forms without reloading or re-entering secrets constantly:

1. **`wc_ck_{store.id}`**: Caches Consumer Key drafts.
2. **`wc_cs_{store.id}`**: Caches Consumer Secret drafts.
3. **`wc_version_{store.id}`**: Caches version selection (`wc/v3`).
4. **`wc_ssl_{store.id}`**: Stores string boolean configurations for skipping strict SSL testing.
5. **`wc_products_{store.id}`**: Saves product arrays previously queried by caching fetching processes in UI tables.
6. **`wc_orders_{store.id}`**: Locally queues loaded active orders context lists.
7. **`framer_pid_{store.id}`**: Checks the local active Framer Project UUID currently in focus.
8. **`framer_key_{store.id}`**: Caches the Framer REST Authentication Token string for operations.

### Cross-App Settings
- **`theme`**: Stores standard `light` / `dark` dashboard toggle values across all PluginFoundry pages.
- **`pluginfoundry_stores_{userId}`**: Simulated array of user relations mapped from the `supabase.ts` SDK mockup engine.
- **`pluginfoundry_billing_{userId}`**: Observes `limit_syncs` and `used_syncs` across environments. Incrementing values triggers progress metrics safely locally across the simulated user context logic.
