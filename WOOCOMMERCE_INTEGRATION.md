# WooCommerce Catalyst Integration Architecture & Flow Guide

WooCommerce Catalyst is a secure, high-performance, multi-tenant integration engine designed to map external WordPress WooCommerce shops into a centralized management plane. This system architecture minimizes high-latency direct queries by maintaining a secure server-controlled local caching database, protected by industrial-grade cryptographic storage.

---

## 1. System Overview & Architecture

The application implements a decoupled, full-stack **three-tier architecture** with stateful local synchronizations:

```
+--------------------------------------------------------------+
|                      React UI layer                          |
|             (Component Views & Client States)                |
+--------------------------------------------------------------+
                               |
                        Internal API Proxies
                               v
+--------------------------------------------------------------+
|                      Node.js Express Server                  |
|          (AES Custom Crypto, Handshakers, Syncer Core)       |
+--------------------------------------------------------------+
         |                                           |
    SQLite/JSON DB                              Network I/O
         v                                           v
+------------------------+                 +--------------------+
| Local Caches & Logs    |                 |   WordPress host   |
| (Multi-tenant storage) |                 | (WooCommerce REST) |
+------------------------+                 +--------------------+
```

### Components Glossary
- **WooCommerce Catalyst Module (`/src/modules/woocommerce`)**: The central hub rendering real-time store catalogs, active synchronization pipelines, configuration panels, and status charts.
- **Secure Connector (`/src/lib/woocommerce-connector.ts`)**: Handles local cryptographic processes (AES-cbc encryption), formats signature tokens, and routes standard WordPress `system_status` handshakes.
- **Express Backend Core (`/server.ts`)**: Oversees API requests, runs secure credentials checks, keeps transactional synchronizations, and streams local-cached assets.

---

## 2. Core Functional Flows & Step-by-Step Processes

### Flow A: Registering and Connecting a Store (Multi-Tenant Ingestion)
1. **User Action**: The operator clicks **Connect Store** on the UI, supplying a Friendly Shop name (e.g., `Coffee Oasis Roast`), and its fully-qualified Domain URL (e.g., `https://coffee.oasis`).
2. **Validation Handshake**:
   - The UI makes a POST request to `/api/stores` with the raw parameters.
   - If REST keys are specified, the server instantly passes them to the validation handshaker (`validateWooCommerceCredentials`) to check their status before persisting.
3. **Database Insertion**:
   - Upon a successful handshake, the server generates a cryptographically random UUID (`wc_node_xxx`).
   - The instance is written to `woocommerce_stores.json` with an initial metadata footprint of `Connected`.

---

### Flow B: Secure Key Handshaking & Encryption Vault
WooCommerce keys (`Consumer Key` starting with `ck_` and `Consumer Secret` starting with `cs_`) grant absolute system control in WordPress. The system isolates and protects these credentials completely:

```
[UI Component Inputs]
        |  (Raw ck_/cs_ keys sent via HTTPS POST)
        v
[Express SSL Proxy Enclave]
        |
        +---> 1. Run "validateWooCommerceCredentials" request against remote master WP site
        |     (Verified or Rejected cleanly)
        |
        +---> 2. Cryptographic Salt derivation (crypto.randomBytes)
        |
        +---> 3. AES-256-CBC Encryption utilizing system master key
        |
        v
[Serialized JSON Storage]  (Preserved encrypted string -> "salt:iv:ciphertext")
```

1. **Validation Safeguard**: During enrollment, keys are analyzed via regular expressions. Incomplete, mocked, or improperly prefixed keys are caught before any network request is discharged.
2. **AES-256 Symmetric Encryption**: 
   - A unique 16-byte random salt is generated for every tenant.
   - The system stretches the master `ENCRYPTION_KEY` using PBKDF2/scrypt to create a key length of 32 bytes.
   - The credentials are encrypted using AES-256-CBC, outputting a serialized string in the format of `saltHex:ivHex:encryptedHex`.
3. **Storage Security**: Only the randomized AES string is committed to server-side JSON files. Browser environments and DevTools have absolutely zero visibility of raw keys.

---

### Flow C: State Synchronization Cycle & Local Caching
To achieve extremely high responsiveness and support complex searching and rendering, data is served out of a local caching subsystem:

1. **Trigger Initiator**: Synchronizations can be triggered manually in the UI by clicking **Sync Now**, or automatically via backend events.
2. **Handshake Verification**:
   - The endpoint `/api/sync/:id` retrieves the store instance, decrypts the keys in-memory, and configures the authorization headers.
3. **WordPress Ingestion Query**:
   - The server initiates a secure request to the WordPress REST endpoint: `${siteUrl}/wp-json/wc/v3/products?per_page=100`.
   - If SSL validation fails because of development self-signed certs, `sslBypass` parameters force the network core to process the request without failing.
4. **Mapping & Delta Analysis**:
   - Received raw WordPress objects are converted to Catalyst unified models.
   - The local data collections inside `woocommerce_cache_db.json` are overwritten with the clean payload.
   - A detailed replication summary is saved to the Sync Logs ledger (`woocommerce_sync_logs.json`).

---

### Flow D: Local Cache Rehydration & Visual Feed
1. When selecting a store, the React frontend issues requests to `/v1/:id/products`.
2. The Node server immediately serves the cached and processed assets out of `woocommerce_cache_db.json`. 
3. This completely removes the network round-trip overhead of contacting WordPress, reducing response times to less than **5 milliseconds**.

---

## 3. Server-Side Routing Glossary

The system exposes the following REST APIs for client-system communication:

| Route Signature | HTTP Method | Function |
| :--- | :---: | :--- |
| `/api/stores` | GET | List all configured tenant stores with metadata. |
| `/api/stores` | POST | Register and instantiate a new WooCommerce store. |
| `/api/stores/:id` | PUT | Verify and update keys, SSL settings, and SDK options. |
| `/api/stores/:id` | DELETE | Fully disconnect a store and wipe all credentials and local cached database records. |
| `/api/sync/:id` | POST | Trigger an immediate manual replication cycle. |
| `/api/sync-logs` | GET | List sync event summaries, success metrics, and network failure descriptions. |
| `/v1/:id/products` | GET | Retrieve cached products with high-speed pagination options. |

---

## 4. Operational Troubleshooting

1. **HTTP 401 Unauthorized**:
   - Verify that your WordPress keys were created with **Read/Write** privileges under WooCommerce -> Settings -> Advanced -> REST API.
   - Verify that permalinks are enabled on your corporate WordPress instance (standard URLs look like `/?p=123` and always break standard API access).
2. **Connection Refused / Timeouts**:
   - If your production site is hiding behind a strict CDN or web application firewall (Cloudflare, Wordfence etc.), configure clear whitelist rules for the catalyst agent's origin domain.
   - Check if the site is configured to bypass self-signed SSL policies under the `API Credentials` section.
