import { Store, NormalizedCategory, NormalizedProduct, ImportProfile } from "./types";
import { decryptText } from "./crypto";
import { 
  getStoresFromDb, 
  saveStoresToDb, 
  getCatalogData, 
  saveCatalogData, 
  addSyncLog 
} from "./db";
import { cacheLayer } from "./cache";

export const retryQueue = new Map<string, { attempts: number; nextRun: number }>();

export const ALL_FIELDS = [
  "title", "slug", "sku", "type", "status",
  "short_description", "description",
  "price", "regular_price", "sale_price", "currency",
  "stock_status", "stock_quantity", "manage_stock",
  "featured_image", "gallery_images", "image_alt",
  "categories", "category_slugs", "tags",
  "attributes", "attribute_values",
  "variant_name", "variant_price", "variant_sku", "variant_inventory",
  "seo_title", "seo_description",
  "created_at", "updated_at"
];

export const DEFAULT_PROFILES: ImportProfile[] = [
  {
    id: "prof_minimal",
    name: "Minimal",
    fields: ["title", "price", "featured_image"]
  },
  {
    id: "prof_storefront",
    name: "Storefront",
    fields: ["title", "price", "featured_image", "gallery_images", "categories"]
  },
  {
    id: "prof_catalog",
    name: "Catalog",
    fields: ["title", "description", "price", "featured_image", "gallery_images", "categories", "tags"]
  },
  {
    id: "prof_complete",
    name: "Complete",
    fields: [...ALL_FIELDS]
  }
];

export function getFullyPopulatedProduct(p: any, storeId: string): any {
  const title = p.name || p.title || "";
  const slug = p.slug || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `prod-${p.id}`);
  const description = p.description ? p.description.replace(/<[^>]*>/g, "") : "";
  const short_description = p.short_description ? p.short_description.replace(/<[^>]*>/g, "") : (description ? description.slice(0, 80) : "No description available.");
  
  const price = Number(p.price || p.regular_price || 0);
  const regular_price = Number(p.regular_price || price || 0);
  const sale_price = p.sale_price !== undefined && p.sale_price !== null ? Number(p.sale_price) : null;
  const currency = p.currency || "USD";
  const type = p.type === "variable" ? "variable" : "simple";
  
  const rawImages = Array.isArray(p.images)
    ? p.images.map((img: any) => typeof img === 'string' ? img : img.src)
    : (Array.isArray(p.imageUrls) ? p.imageUrls : []);
  
  const featured_image = rawImages[0] || "https://images.unsplash.com/photo-1559056131-09a25b16e453?w=500";
  const gallery_images = rawImages.slice(1);
  const image_alt = p.image_alt || (title ? `${title} product asset` : "WooCommerce Product Image");

  const categories = Array.isArray(p.categories)
    ? p.categories.map((c: any) => typeof c === 'string' ? c : c.name).join(", ")
    : (typeof p.categories === 'string' ? p.categories : "Coffee & Mugs");
  const category_slugs = categories.toLowerCase().replace(/[^a-z0-9\s,]+/g, "").replace(/\s+/g, "-");
  
  const tags = Array.isArray(p.tags)
    ? p.tags.map((t: any) => typeof t === 'string' ? t : t.name).join(", ")
    : (typeof p.tags === 'string' ? p.tags : "hot, organic");

  const stock_status = p.stock_status || (p.inStock === false ? "outofstock" : "instock");
  const stock_quantity = p.stock_quantity !== undefined ? p.stock_quantity : 45;
  const manage_stock = p.manage_stock !== undefined ? p.manage_stock : true;

  const sku = p.sku || `SKU-${storeId.toUpperCase()}-${p.id}`;
  const status = p.status || "publish";

  // Attributes
  const attributes = p.attributes || [
    { name: "Format", options: ["Whole bean", "Ground"] },
    { name: "Blend", options: ["House blend", "Microlot"] }
  ];
  const attribute_values = p.attribute_values || "Whole bean, Ground, House blend, Microlot";

  // Variants
  const variant_name = p.variant_name || `${title} - Ground 12oz`;
  const variant_price = p.variant_price || price;
  const variant_sku = p.variant_sku || `${sku}-GR-12`;
  const variant_inventory = p.variant_inventory || 20;

  // SEO
  const seo_title = p.seo_title || `${title} | Organic Store`;
  const seo_description = p.seo_description || short_description;

  // Metadata
  const created_at = p.created_at || p.date_created || new Date().toISOString();
  const updated_at = p.updated_at || p.date_modified || new Date().toISOString();

  return {
    id: String(p.id),
    storeId,
    title,
    slug,
    sku,
    type,
    status,
    short_description,
    description,
    price,
    regular_price,
    sale_price,
    currency,
    stock_status,
    stock_quantity,
    manage_stock,
    featured_image,
    gallery_images,
    image_alt,
    categories,
    category_slugs,
    tags,
    attributes,
    attribute_values,
    variant_name,
    variant_price,
    variant_sku,
    variant_inventory,
    seo_title,
    seo_description,
    created_at,
    updated_at
  };
}

export function filterProductByFields(p: any, selectedFields: string[] | undefined): any {
  const fields = selectedFields && selectedFields.length > 0 ? selectedFields : ALL_FIELDS;
  
  const filtered: any = {
    id: p.id,
    storeId: p.storeId
  };

  const fieldKeys: Record<string, string[]> = {
    "title": ["title"],
    "slug": ["slug"],
    "sku": ["sku"],
    "type": ["type"],
    "status": ["status"],
    "short_description": ["short_description"],
    "description": ["description"],
    "price": ["price"],
    "regular_price": ["regular_price"],
    "sale_price": ["sale_price"],
    "currency": ["currency"],
    "stock_status": ["stock_status"],
    "stock_quantity": ["stock_quantity"],
    "manage_stock": ["manage_stock"],
    "featured_image": ["featured_image"],
    "gallery_images": ["gallery_images"],
    "image_alt": ["image_alt"],
    "categories": ["categories"],
    "category_slugs": ["category_slugs"],
    "tags": ["tags"],
    "attributes": ["attributes"],
    "attribute_values": ["attribute_values"],
    "variant_name": ["variant_name"],
    "variant_price": ["variant_price"],
    "variant_sku": ["variant_sku"],
    "variant_inventory": ["variant_inventory"],
    "seo_title": ["seo_title"],
    "seo_description": ["seo_description"],
    "created_at": ["created_at"],
    "updated_at": ["updated_at"]
  };

  fields.forEach(field => {
    const keys = fieldKeys[field];
    if (keys) {
      keys.forEach(key => {
        if (p[key] !== undefined) {
          filtered[key] = p[key];
        }
      });
    }
  });

  return filtered;
}

export async function triggerSyncEngine(storeId: string, eventType: string = "Scheduled Sync"): Promise<void> {
  const stores = getStoresFromDb();
  const store = stores.find(s => s.id === storeId);
  if (!store) throw new Error("Store does not exist in DB");

  const setStatus = (st: "Connected" | "Syncing" | "degraded") => {
    const list = getStoresFromDb();
    const item = list.find(s => s.id === storeId);
    if (item) {
      item.status = st;
      if (st === "Connected") {
        item.last_sync = new Date().toISOString();
        item.failure_count = 0;
      }
      saveStoresToDb(list);
    }
  };

  setStatus("Syncing");

  try {
    const rawConsumerKey = decryptText(store.consumerKey);
    const rawConsumerSecret = decryptText(store.consumerSecret);

    let finalProducts: any[] = [];
    let finalCategories: NormalizedCategory[] = [];

    const isMock = store.url.includes(".domain") || store.url.includes("mock") || store.url === "https://artisanwood.store" || (!rawConsumerKey.startsWith("ck_") && !rawConsumerSecret.startsWith("cs_"));

    if (isMock) {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const isCoffee = store.name.toLowerCase().includes("coffee");
      if (isCoffee) {
        const rawList = [
          { id: "101", name: "Premium Espresso Dark Roast (Bag)", description: "Sustainable dark espresso blend with hints of cacao and hazelnut.", price: 17.50, images: ["https://images.unsplash.com/photo-1559056131-09a25b16e453?w=500"] },
          { id: "102", name: "Single Origin Colombia Medium (Bag)", description: "Sun-dried high altitude whole bean coffee with clean citrus acidity.", price: 22.50, images: ["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500"] },
          { id: "103", name: "Ceramic Pourover Cone & Dripper", description: "Insulating dual-ribbed matte black ceramic pouring cone.", price: 24.99, images: ["https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500"] },
          { id: "104", name: "Ergonomic Gooseneck Kettle (Stovetop)", description: "Flow-restrictive gooseneck spout constructed with medical grade steel.", price: 49.99, images: ["https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500"], inStock: false },
          { id: "105", name: "Imported Ceramic Espresso Match Set", description: "Exquisite glaze finished modular double cups set imported directly.", price: 28.00, images: ["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500"] }
        ];
        finalProducts = rawList.map(p => getFullyPopulatedProduct(p, storeId));
        finalCategories = [
          { id: "cat_1_1", name: "Bags", slug: "bags", count: 2 },
          { id: "cat_1_2", name: "Coffee", slug: "coffee", count: 2 },
          { id: "cat_1_3", name: "Accessories", slug: "accessories", count: 2 },
          { id: "cat_1_4", name: "Coffeeware", slug: "coffeeware", count: 1 }
        ];
      } else {
        const rawList = [
          { id: "201", name: "Handcrafted Solid Oak Salad Bowl", description: "Turned from premium white oak blocks, coated with food-grade wood beeswax.", price: 45.00, images: ["https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500"] },
          { id: "202", name: "End-Grain Walnut Prep Board", description: "Juice-catching grooved walnut heavy-duty preparation board.", price: 75.00, images: ["https://images.unsplash.com/photo-1594756297441-2a6c8e3bf6e1?w=500"] },
          { id: "203", name: "Minimalist Cedar Tri-Leg Plant Stand", description: "Treated with water-shedding exterior grade amber sealant.", price: 29.99, images: ["https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=500"] }
        ];
        finalProducts = rawList.map(p => getFullyPopulatedProduct(p, storeId));
        finalCategories = [
          { id: "cat_2_1", name: "Home", slug: "home", count: 1 },
          { id: "cat_2_2", name: "Bowls", slug: "bowls", count: 1 },
          { id: "cat_2_3", name: "Kitchen", slug: "kitchen", count: 1 },
          { id: "cat_2_4", name: "Boards", slug: "boards", count: 1 },
          { id: "cat_2_5", name: "Decor", slug: "decor", count: 1 },
          { id: "cat_2_6", name: "Cedar", slug: "cedar", count: 1 }
        ];
      }
    } else {
      const authHeader = "Basic " + Buffer.from(`${rawConsumerKey}:${rawConsumerSecret}`).toString("base64");
      
      const fetchWithRetry = async (targetUrl: string, attemptsLeft: number = 3, delay: number = 1000): Promise<any> => {
        try {
          const res = await fetch(targetUrl, {
            headers: {
              "Authorization": authHeader,
              "Content-Type": "application/json"
            }
          });
          if (!res.ok) throw new Error(`HTTP Error Status: ${res.status}`);
          return await res.json();
        } catch (err) {
          if (attemptsLeft <= 1) throw err;
          console.warn(`[Connector Retry] Fetch failed to ${targetUrl}, retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          return fetchWithRetry(targetUrl, attemptsLeft - 1, delay * 2);
        }
      };

      const productsUrl = `${store.url}/wp-json/wc/v3/products`;
      const categoriesUrl = `${store.url}/wp-json/wc/v3/products/categories`;

      console.log(`[Sync Engine] Issuing WooCommerce Rest API requests to ${productsUrl}`);
      const [rawProds, rawCats] = await Promise.all([
        fetchWithRetry(productsUrl),
        fetchWithRetry(categoriesUrl)
      ]);

      finalProducts = rawProds.map((p: any) => getFullyPopulatedProduct(p, storeId));
      finalCategories = rawCats.map((c: any) => ({
        id: String(c.id),
        name: c.name,
        slug: c.slug,
        count: c.count || 0
      }));
    }

    const selectedFields = store.selectedFields;
    finalProducts = finalProducts.map(p => filterProductByFields(p, selectedFields));

    const catalog = getCatalogData();
    catalog.products[storeId] = finalProducts;
    catalog.categories[storeId] = finalCategories;
    saveCatalogData(catalog);

    cacheLayer.invalidateStore(storeId);
    setStatus("Connected");
    console.log(`[Sync Success] Normalized database written for store Id: '${storeId}'`);
    addSyncLog(storeId, eventType, "success", `Successfully synchronized ${finalProducts.length} items and ${finalCategories.length} categories.`);

  } catch (err: any) {
    console.error(`[Sync Failure] Synchronization aborted for ${store.name}. Error:`, err.message);
    addSyncLog(storeId, eventType, "failed", `Failed to index store products/categories. Connection threshold breached.`, err.message || String(err));

    const queue = retryQueue.get(storeId) || { attempts: 0, nextRun: 0 };
    queue.attempts++;
    
    let delayMin = 1;
    if (queue.attempts === 2) delayMin = 5;
    else if (queue.attempts === 4) delayMin = 15;
    else if (queue.attempts > 4) delayMin = 60;

    queue.nextRun = Date.now() + delayMin * 60 * 1000;
    retryQueue.set(storeId, queue);

    const currentList = getStoresFromDb();
    const targetStore = currentList.find(s => s.id === storeId);
    if (targetStore) {
      targetStore.status = "degraded";
      targetStore.failure_count = queue.attempts;
      saveStoresToDb(currentList);
    }
    
    throw err;
  }
}

// Background scheduler
export function startCronSyncEngine() {
  setInterval(() => {
    console.log("[Scheduled Cron Engine] Commencing WooCommerce background synchronization sweeps...");
    const stores = getStoresFromDb();
    const now = Date.now();

    stores.forEach((store) => {
      const queue = retryQueue.get(store.id);
      if (queue && now < queue.nextRun) {
        return;
      }

      if (store.status !== "Syncing") {
        triggerSyncEngine(store.id, "Scheduled Sync")
          .then(() => {
            retryQueue.delete(store.id);
          })
          .catch(() => {
            console.warn(`[Cron Engine] Background sync retry count logged for store: ${store.id}`);
          });
      }
    });
  }, 10 * 60 * 1000);
}
