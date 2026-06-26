# CMS Connectors & Synchronizations Flow

## 1. WooCommerce to Framer CMS Sync Flow

### **Phase 1: Establishing the Environments**
#### **Step 1: Connect WooCommerce Store**
- **User provides context:** The user inputs their WooCommerce store domain (e.g. `https://my-store.com`) and secure application credentials (Consumer Key and Consumer Secret) generated from the WooCommerce dashboard.
- **System validation:** The application encrypts the entered credentials, submits them securely via local REST API (`/api/stores`), and executes an initial handshake check against the WooCommerce API to ensure permissions are valid.
- **Cache building:** When validated, the system caches store status, product counts, list variables, and sync profiles to bootstrap the sync operations.

#### **Step 2: Connect Framer Projects**
- **User provides context:** The user supplies their Framer CMS Project ID and an authorized Framer API Key.
- **System validation:** The application leverages the official Framer Developer Server API (`framer-api`) to execute a local verification ping.
- **Resource extraction:** Once successful, the application pulls all available CMS collections associated with the targeted Framer workspace to map into targets.

---

### **Phase 2: Target Collection Selection**
#### **Step 3: Define Sync Destination**
- **Existing collection mode:** The user selects an already existing Framer CMS collection (e.g., "Shop Inventory") via dropdown.
- **New collection mode:** Alternatively, the user can create an entirely new collection locally from the connector UI. The system automatically issues a REST command to Framer to provision the fresh collection using a designated name (e.g., "Products Array").

---

### **Phase 3: Schema Generation & Synchronization**
#### **Step 4: Mapping WooCommerce Parameters**
The user avoids complex field-to-field mapping tables seen in legacy interfaces. 
Instead, the user simply selects which standard WooCommerce parameters they want synced by activating simple UI Checkboxes:
- `title` (Product Name)
- `slug`
- `description` (Formatted Content)
- `short_description`
- `price`
- `regular_price`
- `sale_price`
- `sku`
- `stock_quantity`
- `stock_status`
- `weight`
- `permalink`

#### **Step 5: Automating the Framer Schema**
When the user initializes the "Create Fields" automation:
1. **Inspection:** The system iterates over the user's selected parameters.
2. **Type Inference:** The application determines the most suitable Framer content type (e.g., `title` → Text, `price` → Number, `images` → Arrays, `description` → Formatted text, `stock_status` → Enum dropdown).
3. **Automatic Patching (Server Proxy):** The platform connects to the Framer API and automatically installs (`POST/PATCH`) any selected field that doesn't natively exist yet on the target CMS collection.
4. **Collision Safe:** Reinvoking the operation bypasses pre-existing keys and limits duplicate items, preserving purely native Framer design-specific fields like custom "Hero Background Colors" or marketing badges not managed by WooCommerce. 

#### **Step 6: Syncing Values**
- **Initial Execution:** The user triggers the "Sync Data" sequence. Content pipelines request full product payloads directly from the WordPress environment using query pagination, conform the data into Framer's structural format using the mapped automated schemas, and dispatch POST/PATCH events directly to Framer to create the items.
- **Ongoing State Management:** Once complete, sync metadata, field mappings, and timestamps are committed to application state.
- **Automated Recurrence / Triggers:** Users can optionally specify `Scheduled Tasks` (e.g. 15-minute intervals, hourly polling) to allow the Node.js backend syncing engine (`triggerSyncEngine`) to synchronize WooCommerce adjustments and purge orphan references asynchronously behind the scenes, ensuring the frontend Framer application is seamlessly hydrated at build.

---

## 2. Google Forms to Framer Integration 

### **Step 1: Locate Google Form Target**
- **Provide Origin:** The user supplies a standard Google Forms `viewform` sharing URL (e.g., `https://docs.google.com/forms/d/e/.../viewform`). 
- **Endpoint Inspection:** The backend scrapes the live form via an HTTP proxy or native scraping parser to extract hidden input identification keys (`entry.XYZ` IDs) assigned to each user field along with field types (text, email, checkboxes). It dynamically maps the underlying native action endpoints (`/formResponse`).

### **Step 2: Configuration & Theming**
- **Component Styling UI:** The user manipulates variables (Border radius, Background hex, Font hex, Accent colors, button typography) in the local platform interface.
- **Component Preview:** The user previews the exact visual output of how the rendered Google Form component will natively appear on the website. 

### **Step 3: Component Implementation**
- **React Code Generation:** The platform automatically bundles a highly optimized, fully standalone `React`/`JSX` Smart Component snippet based strictly on the inspected `entry` schema coordinates and user cosmetic preferences.
- **Payload Integrity:** The generated code encapsulates client-side JS validation logic specific to the mapped types (checking empty strings on required elements, RegEx pattern validation for proper email prefixes).
- **Direct Submission Routing:** When deployed to a live Framer Canvas, clicking 'Submit' packages the end-user's data into standard form-encoded blobs and uses an opaque, native `no-cors` `POST` dispatch directly to the official Google infrastructure backend (`actionUrl`). 
  
### **Step 4: Real-time Analytics (Local Management)**
- Optionally, webhook callbacks or ping events report locally to the dashboard tracking total live submissions received so platform managers can track traffic metrics directly alongside the rest of their commerce data sources.
