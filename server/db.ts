import fs from "fs";
import path from "path";
import { Store, CatalogData, SyncLog, NormalizedCategory, NormalizedProduct, PortcodeWidget } from "./types";
import { encryptText } from "./crypto";

// Filesystem Paths for Persistent DBs
export const STORES_FILE = path.join(process.cwd(), "woocommerce_stores.json");
export const CATALOG_FILE = path.join(process.cwd(), "woocommerce_cache_db.json");
export const SYNC_LOGS_FILE = path.join(process.cwd(), "woocommerce_sync_logs.json");
export const PORTCODE_FILE = path.join(process.cwd(), "portcode_widgets.json");

export function getPortcodeWidgetsFromDb(): PortcodeWidget[] {
  try {
    if (!fs.existsSync(PORTCODE_FILE)) return [];
    return JSON.parse(fs.readFileSync(PORTCODE_FILE, "utf8"));
  } catch {
    return [];
  }
}

export function savePortcodeWidgetsToDb(widgets: PortcodeWidget[]) {
  try {
    fs.writeFileSync(PORTCODE_FILE, JSON.stringify(widgets, null, 2), "utf8");
  } catch (err) {
    console.error("[DB ERROR] Failed to write portcode widgets json", err);
  }
}

export function getSyncLogs(): SyncLog[] {
  try {
    if (!fs.existsSync(SYNC_LOGS_FILE)) return [];
    return JSON.parse(fs.readFileSync(SYNC_LOGS_FILE, "utf8"));
  } catch {
    return [];
  }
}

export function saveSyncLogs(logs: SyncLog[]) {
  try {
    fs.writeFileSync(SYNC_LOGS_FILE, JSON.stringify(logs, null, 2), "utf8");
  } catch (err) {
    console.error("[DB ERROR] Failed to write sync logs json", err);
  }
}

export function addSyncLog(storeId: string, eventType: string, status: "success" | "failed", details: string, errorLog: string = "None") {
  const stores = getStoresFromDb();
  const store = stores.find(s => s.id === storeId);
  const storeName = store ? store.name : "Unknown Store";
  const logs = getSyncLogs();

  const newLog: SyncLog = {
    id: `log_${Math.random().toString(36).substr(2, 9)}`,
    storeId,
    storeName,
    eventType,
    status,
    timestamp: new Date().toISOString(),
    details,
    errorLog
  };

  logs.unshift(newLog);
  if (logs.length > 200) {
    logs.pop(); // Cap log depth
  }

  saveSyncLogs(logs);
}

export function getStoresFromDb(): Store[] {
  try {
    if (!fs.existsSync(STORES_FILE)) return [];
    return JSON.parse(fs.readFileSync(STORES_FILE, "utf8"));
  } catch {
    return [];
  }
}

export function saveStoresToDb(stores: Store[]) {
  try {
    fs.writeFileSync(STORES_FILE, JSON.stringify(stores, null, 2), "utf8");
  } catch (err) {
    console.error("[DB ERROR] Failed to write stores json", err);
  }
}

export function getCatalogData(): CatalogData {
  try {
    if (!fs.existsSync(CATALOG_FILE)) return { products: {}, categories: {} };
    return JSON.parse(fs.readFileSync(CATALOG_FILE, "utf8"));
  } catch {
    return { products: {}, categories: {} };
  }
}

export function saveCatalogData(catalog: CatalogData) {
  try {
    fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2), "utf8");
  } catch (err) {
    console.error("[DB ERROR] Failed to write catalog json", err);
  }
}

/**
 * Seed databases with default mock/live tenant configurations
 */
export function initDatabase() {
  const defaultStores: Store[] = [
    {
      id: "str_1",
      name: "Gourmet Coffee Boutique",
      url: "https://gourmet-coffee.domain",
      consumerKey: encryptText("ck_e83bc29aa98cc51ea2b19283e10bc192801de29"),
      consumerSecret: encryptText("cs_9da18bc289aacc92bef01c83ec10ac92019bcae2"),
      status: "Connected",
      last_sync: new Date(Date.now() - 3600_000).toISOString(),
      created_at: "2026-04-15T11:00:00Z"
    },
    {
      id: "str_2",
      name: "Artisan Woodwork Shop",
      url: "https://artisanwood.store",
      consumerKey: encryptText("ck_6ae193acc02deac49bb20c382ea0de8a92e109d2"),
      consumerSecret: encryptText("cs_204bac81deacab930d83bc7ac8a90da371e98bb1"),
      status: "Connected",
      last_sync: new Date(Date.now() - 1800_000).toISOString(),
      created_at: "2026-05-20T08:15:00Z"
    }
  ];

  const defaultProducts: Record<string, NormalizedProduct[]> = {
    "str_1": [
      { id: "101", storeId: "str_1", title: "Premium Espresso Dark Roast (Bag)", slug: "premium-espresso-dark-roast-bag", description: "Sustainable dark espresso blend with hints of cacao and hazelnut.", price: 17.50, currency: "USD", images: ["https://images.unsplash.com/photo-1559056131-09a25b16e453?w=500"], type: "simple", inStock: true, categories: "Bags, Coffee" },
      { id: "102", storeId: "str_1", title: "Single Origin Colombia Medium (Bag)", slug: "single-origin-colombia-medium-bag", description: "Sun-dried high altitude whole bean coffee with clean citrus acidity.", price: 22.50, currency: "USD", images: ["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500"], type: "simple", inStock: true, categories: "Bags, Coffee" },
      { id: "103", storeId: "str_1", title: "Ceramic Pourover Cone & Dripper", slug: "ceramic-pourover-cone-dripper", description: "Insulating dual-ribbed matte black ceramic pouring cone.", price: 24.99, currency: "USD", images: ["https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500"], type: "simple", inStock: true, categories: "Accessories" },
      { id: "104", storeId: "str_1", title: "Ergonomic Gooseneck Kettle (Stovetop)", slug: "ergonomic-gooseneck-kettle-stovetop", description: "Flow-restrictive gooseneck spout constructed with medical grade steel.", price: 49.99, currency: "USD", images: ["https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500"], type: "simple", inStock: false, categories: "Accessories" }
    ],
    "str_2": [
      { id: "201", storeId: "str_2", title: "Handcrafted Solid Oak Salad Bowl", slug: "handcrafted-solid-oak-salad-bowl", description: "Turned from premium white oak blocks, coated with food-grade wood beeswax.", price: 45.00, currency: "USD", images: ["https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500"], type: "simple", inStock: true, categories: "Home, Bowls" },
      { id: "202", storeId: "str_2", title: "End-Grain Walnut Prep Board", slug: "end-grain-walnut-prep-board", description: "Juice-catching grooved walnut heavy-duty preparation board.", price: 75.00, currency: "USD", images: ["https://images.unsplash.com/photo-1594756297441-2a6c8e3bf6e1?w=500"], type: "simple", inStock: true, categories: "Kitchen, Boards" },
      { id: "203", storeId: "str_2", title: "Minimalist Cedar Tri-Leg Plant Stand", slug: "minimalist-cedar-tri-leg-plant-stand", description: "Treated with water-shedding exterior grade amber sealant.", price: 29.99, currency: "USD", images: ["https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=500"], type: "simple", inStock: true, categories: "Decor, Cedar" }
    ]
  };

  const defaultCategories: Record<string, NormalizedCategory[]> = {
    "str_1": [
      { id: "cat_1_1", name: "Bags", slug: "bags", count: 2 },
      { id: "cat_1_2", name: "Coffee", slug: "coffee", count: 2 },
      { id: "cat_1_3", name: "Accessories", slug: "accessories", count: 2 }
    ],
    "str_2": [
      { id: "cat_2_1", name: "Home", slug: "home", count: 1 },
      { id: "cat_2_2", name: "Bowls", slug: "bowls", count: 1 },
      { id: "cat_2_3", name: "Kitchen", slug: "kitchen", count: 1 },
      { id: "cat_2_4", name: "Boards", slug: "boards", count: 1 },
      { id: "cat_2_5", name: "Decor", slug: "decor", count: 1 },
      { id: "cat_2_6", name: "Cedar", slug: "cedar", count: 1 }
    ]
  };

  if (!fs.existsSync(STORES_FILE)) {
    console.log("[DB] Seeding default stores database file...");
    fs.writeFileSync(STORES_FILE, JSON.stringify(defaultStores, null, 2), "utf8");
  }

  if (!fs.existsSync(CATALOG_FILE)) {
    console.log("[DB] Seeding default products catalog file...");
    fs.writeFileSync(CATALOG_FILE, JSON.stringify({ products: defaultProducts, categories: defaultCategories }, null, 2), "utf8");
  }

  if (!fs.existsSync(SYNC_LOGS_FILE)) {
    console.log("[DB] Seeding default sync logs database file...");
    const sampleLogs: SyncLog[] = [
      {
        id: "log_init_1",
        storeId: "str_1",
        storeName: "Gourmet Coffee Boutique",
        eventType: "Scheduled Sync",
        status: "success",
        timestamp: new Date(Date.now() - 3600_000 * 1.5).toISOString(),
        details: "Successfully synchronized 5 products and 4 categories from Gourmet Coffee Boutique.",
        errorLog: "None"
      },
      {
        id: "log_init_2",
        storeId: "str_2",
        storeName: "Artisan Woodwork Shop",
        eventType: "Manual Sync",
        status: "success",
        timestamp: new Date(Date.now() - 1800_000 * 1.5).toISOString(),
        details: "Successfully synchronized 3 products and 6 categories from Artisan Woodwork Shop.",
        errorLog: "None"
      },
      {
        id: "log_init_3",
        storeId: "str_1",
        storeName: "Gourmet Coffee Boutique",
        eventType: "Manual Sync",
        status: "failed",
        timestamp: new Date(Date.now() - 3600_000 * 4.2).toISOString(),
        details: "Failed to connect to WooCommerce API endpoint at https://gourmet-coffee.domain/wp-json/wc/v3/products.",
        errorLog: "HTTP Error Status: 401 Unauthorized"
      }
    ];
    fs.writeFileSync(SYNC_LOGS_FILE, JSON.stringify(sampleLogs, null, 2), "utf8");
  }

  if (!fs.existsSync(PORTCODE_FILE)) {
    console.log("[DB] Seeding default portcode widgets database file...");
    const defaultWidgets: PortcodeWidget[] = [
      {
        id: "wid_1",
        name: "Interactive Trustpilot Rating Badge",
        description: "Elegant slide-in floating badge showing Trustpilot review counts and star rating.",
        sourceCode: `<div class="trustpilot-badge" style="background:#00b67a;color:#fff;padding:12px;border-radius:8px;font-family:sans-serif;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1)">\n  <strong>Trustpilot</strong>\n  <span>★★★★★</span>\n  <span>5.0 / 5 Rating</span>\n</div>`,
        targetPlatform: "framer_embed",
        compiledCode: `<div class="trustpilot-badge" style="background:currentColor;padding:12px;font-weight:bold;">Trustpilot Star Widget</div>`,
        variables: {
          color: { label: "Accent Color", type: "color", value: "#00b67a" },
          text: { label: "Badge Label Text", type: "text", value: "Trustpilot Rating" }
        },
        status: "Active",
        created_at: new Date().toISOString()
      },
      {
        id: "wid_2",
        name: "Aesthetic Newsletter Input Box",
        description: "Polished inline micro-form showing input and subscription button ready for Framer.",
        sourceCode: `<form style="display:flex;gap:4px;max-width:320px;"><input type="email" placeholder="Enter email" style="padding:8px;border:1px solid #ccc;border-radius:4px;" required/><button type="submit" style="padding:8px 12px;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;">Subscribe</button></form>`,
        targetPlatform: "framer_tsx",
        compiledCode: `// Standalone Newsletter React Code`,
        variables: {
          buttonText: { label: "Button Label", type: "text", value: "Subscribe Now" },
          buttonColor: { label: "Button Background", type: "color", value: "#2563eb" }
        },
        status: "Active",
        created_at: new Date().toISOString()
      }
    ];
    fs.writeFileSync(PORTCODE_FILE, JSON.stringify(defaultWidgets, null, 2), "utf8");
  }
}
