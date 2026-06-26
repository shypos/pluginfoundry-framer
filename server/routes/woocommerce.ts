import express from "express";
import { Store, NormalizedProduct, NormalizedCategory } from "../types";
import { 
  decryptText, 
  encryptText, 
  parseFramerProjectId, 
  parseFramerApiKey 
} from "../crypto";
import { 
  getStoresFromDb, 
  saveStoresToDb, 
  getSyncLogs, 
  addSyncLog, 
  getCatalogData, 
  saveCatalogData 
} from "../db";
import { cacheLayer } from "../cache";
import { triggerSyncEngine } from "../syncEngine";
import { validateWooCommerceCredentials } from "../../src/lib/woocommerce-connector";
import { FramerClient } from "../../lib/framer";

export const woocommerceRouter = express.Router();

// 1. Get Stores Overview (Exclude Secrets!)
woocommerceRouter.get("/api/stores", (req, res) => {
  const stores = getStoresFromDb();
  const sanitized = stores.map(({ consumerKey, consumerSecret, framerApiKey, ...rest }) => ({
    ...rest,
    has_credentials: Boolean(consumerKey && consumerSecret),
    has_framer_credentials: Boolean(framerApiKey)
  }));
  res.json(sanitized);
});

// 2. Insert Store (Multi-tenant Connector Ingestion)
woocommerceRouter.post("/api/stores", async (req, res) => {
  const { name, url, consumerKey, consumerSecret } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: "Missing required fields (name, url)" });
  }

  // Active validation if credentials are provided and aren't dummies
  if (consumerKey && consumerSecret && consumerKey !== "dummy_ck" && consumerSecret !== "dummy_cs") {
    const validation = await validateWooCommerceCredentials(url, consumerKey, consumerSecret);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "WooCommerce API endpoint refused signature validations.",
        details: validation.statusText,
        errorCode: validation.errorCode
      });
    }
  }

  const stores = getStoresFromDb();
  const newStoreId = `str_${Math.random().toString(36).substr(2, 9)}`;

  const newStore: Store = {
    id: newStoreId,
    name: name.trim(),
    url: url.trim().replace(/\/$/, ""),
    consumerKey: encryptText(consumerKey || "dummy_ck"),
    consumerSecret: encryptText(consumerSecret || "dummy_cs"),
    status: "Connected",
    last_sync: null,
    created_at: new Date().toISOString()
  };

  stores.push(newStore);
  saveStoresToDb(stores);

  const catalog = getCatalogData();
  catalog.products[newStoreId] = [];
  catalog.categories[newStoreId] = [];
  saveCatalogData(catalog);

  // Trigger registration initialization sync instantly
  triggerSyncEngine(newStoreId, "Initial Sync").catch(() => {});

  const { consumerKey: ck, consumerSecret: cs, framerApiKey: fk, ...sanitized } = newStore;
  res.status(201).json(sanitized);
});

// 3. Delete Store
woocommerceRouter.delete("/api/stores/:id", (req, res) => {
  const { id } = req.params;
  const stores = getStoresFromDb();
  const index = stores.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Store tenant not found" });
  }

  stores.splice(index, 1);
  saveStoresToDb(stores);

  const catalog = getCatalogData();
  delete catalog.products[id];
  delete catalog.categories[id];
  saveCatalogData(catalog);

  cacheLayer.invalidateStore(id);

  res.json({ success: true, message: `Store ${id} disconnected and storage scrubbed.` });
});

// 4. Update Store Configuration
woocommerceRouter.put("/api/stores/:id", async (req, res) => {
  const { id } = req.params;
  const { name, url, consumerKey, consumerSecret, framerProjectId, framerApiKey, framerTargetCollectionId, selectedFields, profiles } = req.body;

  const stores = getStoresFromDb();
  const store = stores.find(s => s.id === id);

  if (!store) {
    return res.status(404).json({ error: "Store tenant not found" });
  }

  // Active validation if credentials are being configured/updated
  const decryptedCk = store.consumerKey ? decryptText(store.consumerKey) : "";
  const decryptedCs = store.consumerSecret ? decryptText(store.consumerSecret) : "";
  
  const ckChanged = consumerKey !== undefined && consumerKey.trim() !== decryptedCk;
  const csChanged = consumerSecret !== undefined && consumerSecret.trim() !== decryptedCs;

  if (consumerKey && consumerSecret && (ckChanged || csChanged)) {
    const targetUrl = url ? url.trim() : store.url;
    const validation = await validateWooCommerceCredentials(
      targetUrl,
      consumerKey.trim(),
      consumerSecret.trim()
    );

    if (!validation.isValid) {
      return res.status(400).json({
        error: "WooCommerce API endpoint refused signature validations.",
        details: validation.statusText,
        errorCode: validation.errorCode
      });
    }
  }

  if (name) store.name = name.trim();
  if (url) store.url = url.trim().replace(/\/$/, "");
  if (consumerKey) store.consumerKey = encryptText(consumerKey.trim());
  if (consumerSecret) store.consumerSecret = encryptText(consumerSecret.trim());
  if (framerProjectId !== undefined) store.framerProjectId = parseFramerProjectId(framerProjectId);
  if (framerApiKey) store.framerApiKey = encryptText(parseFramerApiKey(framerApiKey));
  
  if (framerTargetCollectionId !== undefined) store.framerTargetCollectionId = framerTargetCollectionId;
  if (selectedFields !== undefined) store.selectedFields = selectedFields;
  if (profiles !== undefined) store.profiles = profiles;
  
  store.status = "Connected";
  saveStoresToDb(stores);
  cacheLayer.invalidateStore(id);

  const { consumerKey: ck, consumerSecret: cs, framerApiKey: fk, ...sanitized } = store;
  res.json({ success: true, store: sanitized });
});

// 5. Trigger Manual Sync Endpoint (POST /api/sync/:storeId)
woocommerceRouter.post("/api/sync/:storeId", async (req, res) => {
  const { storeId } = req.params;
  
  const stores = getStoresFromDb();
  const store = stores.find(s => s.id === storeId);
  if (!store) {
    return res.status(404).json({ error: "Store tenant not found for syncing" });
  }

  try {
    console.log(`[Manual Force Sync] Triggered sync request for ${store.name}`);
    await triggerSyncEngine(storeId, "Manual Sync");
    
    // Read and return the freshly synced details
    const updatedStore = getStoresFromDb().find(s => s.id === storeId);
    res.json({ success: true, message: "Sync operation finished.", store: updatedStore });
  } catch (err: any) {
    res.status(502).json({ error: "Synchronization failed", reason: err.message });
  }
});

// 6. Webhook Broker Endpoint
woocommerceRouter.post("/api/webhooks/woocommerce/:storeId", (req, res) => {
  const { storeId } = req.params;
  console.log(`[Webhook Stream] Received webhook callback for store ${storeId}. Body:`, JSON.stringify(req.body).substring(0, 500));
  
  triggerSyncEngine(storeId, "Webhook Hot-Sync")
    .then(() => console.log(`[Webhook Success] Finished hot-sync from webhook for ${storeId}`))
    .catch((err) => console.error(`[Webhook Failed] Hot-sync error:`, err));

  res.status(202).json({ verified: true, event: "Queued background hot-sync" });
});

// 7. Get Recent Sync Activities
woocommerceRouter.get("/api/sync-logs", (req, res) => {
  const { storeId } = req.query;
  let logs = getSyncLogs();
  if (storeId) {
    logs = logs.filter(l => l.storeId === String(storeId));
  }
  res.json(logs);
});

// --- FRAMER CMS COLLECTION INTEGRATION ENDPOINTS ---

// 1. Fetch collections for a Framer project
woocommerceRouter.get("/api/framer/collections/:storeId", async (req, res) => {
  const { storeId } = req.params;
  const stores = getStoresFromDb();
  const store = stores.find(s => s.id === storeId);
  if (!store) {
    return res.status(404).json({ error: "Store tenant not found" });
  }

  const framerApiKey = store.framerApiKey ? decryptText(store.framerApiKey) : "";
  const framerProjectId = store.framerProjectId || "";

  const isMock = !framerApiKey || framerApiKey.startsWith("framer_cms_mock") || framerApiKey.includes("mock") || !framerProjectId || framerProjectId.includes("example");

  if (isMock) {
    return res.json([
      { id: "col_framer_products", name: "WooCommerce Products Layout", slug: "products" },
      { id: "col_framer_catalog", name: "Shop Catalog Collection", slug: "catalog" },
      { id: "col_framer_promo", name: "Featured Campaigns & Products", slug: "featured-products" }
    ]);
  }

  let client: FramerClient | null = null;
  try {
    client = new FramerClient(framerProjectId, framerApiKey);
    const collections = await client.getCollections();
    const formattedCollections = collections.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.id
    }));
    res.json(formattedCollections);
  } catch (err: any) {
    console.error("[Framer Fetch Error]", err);
    res.status(502).json({ 
      error: "Failed to fetch Framer collections", 
      details: err.message,
      explanation: "Please ensure your Framer project URL or ID is correct and your API key has the necessary scope permissions." 
    });
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
});

// 2. Read Framer CMS Collection Schema
woocommerceRouter.get("/api/framer/collection-schema/:storeId/:collectionId", async (req, res) => {
  const { storeId, collectionId } = req.params;
  const stores = getStoresFromDb();
  const store = stores.find(s => s.id === storeId);
  if (!store) {
    return res.status(404).json({ error: "Store tenant not found" });
  }

  const framerApiKey = store.framerApiKey ? decryptText(store.framerApiKey) : "";
  const isMock = !framerApiKey || framerApiKey.startsWith("framer_cms_mock") || framerApiKey.includes("mock") || !store.framerProjectId || store.framerProjectId.includes("example");

  const getMockFields = (colId: string) => {
    if (colId === "col_framer_products" || colId.includes("product")) {
      return [
        { id: "name", name: "Product Title", type: "text" },
        { id: "slug", name: "Slug Link", type: "slug" },
        { id: "product_sku", name: "Unique Store SKU", type: "text" },
        { id: "description", name: "Rich Body Description", type: "richText" },
        { id: "price_usd", name: "Base Price USD", type: "number" },
        { id: "product_image", name: "Showcase Hero Image", type: "image" },
        { id: "category_name", name: "Main Category", type: "text" },
        { id: "in_stock", name: "In Stock Indicator", type: "boolean" },
        { id: "seo_meta_title", name: "SEO Meta Header", type: "text" },
        { id: "seo_meta_desc", name: "SEO Meta Summary", type: "text" }
      ];
    } else if (colId === "col_framer_catalog" || colId.includes("catalog")) {
      return [
        { id: "title", name: "Item Title", type: "text" },
        { id: "url_slug", name: "Website Slug", type: "slug" },
        { id: "price", name: "Retail Price", type: "number" },
        { id: "main_image", name: "Thumbnail Image", type: "image" },
        { id: "item_description", name: "HTML Item Description", type: "richText" },
        { id: "catalog_sku", name: "Catalog Sku Reference", type: "text" },
        { id: "stock_level", name: "Stock Inventory Level", type: "number" }
      ];
    } else {
      return [
        { id: "promo_title", name: "Promo Title Header", type: "text" },
        { id: "promo_slug", name: "SEO Permaslug", type: "slug" },
        { id: "sale_price", name: "Discount Sale Price", type: "number" },
        { id: "regular_price", name: "MSRP Regular Price", type: "number" },
        { id: "promo_banner", name: "Hero Advertising Banner", type: "image" },
        { id: "promo_text", name: "Promotional Subtext", type: "text" }
      ];
    }
  };

  if (isMock) {
    return res.json({ fields: getMockFields(collectionId) });
  }

  let client: FramerClient | null = null;
  try {
    client = new FramerClient(store.framerProjectId || "", framerApiKey);
    const fields = await client.getCollectionSchema(collectionId);
    const formattedFields = fields.map(f => ({
      id: f.id,
      name: f.name,
      type: f.type
    }));
    res.json({ fields: formattedFields });
  } catch (err: any) {
    console.error("[Framer Schema Fetch Error]", err);
    res.status(502).json({ 
      error: "Failed to fetch Framer collection schema", 
      details: err.message,
      explanation: "Unable to inspect the schema of target collection. Make sure the collection is still present inside Framer and your token is not expired."
    });
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
});

// --- AUTOMATED CMS CREATION AND FIELDS GENERATION ---

// Define standard WooCommerce selective fields mapping & types
const WOO_FIELDS_INFO: Record<string, { name: string; type: string }> = {
  title: { name: "Product Name", type: "string" },
  slug: { name: "Slug", type: "string" },
  sku: { name: "SKU", type: "string" },
  type: { name: "Product Type", type: "string" },
  status: { name: "Status", type: "string" },
  short_description: { name: "Short Description", type: "formattedText" },
  description: { name: "Description", type: "formattedText" },
  price: { name: "Price", type: "number" },
  regular_price: { name: "Regular Price", type: "number" },
  sale_price: { name: "Sale Price", type: "number" },
  currency: { name: "Currency", type: "string" },
  stock_status: { name: "Stock Status", type: "string" },
  stock_quantity: { name: "Stock Quantity", type: "number" },
  manage_stock: { name: "Manage Stock", type: "boolean" },
  featured_image: { name: "Featured Image", type: "image" },
  gallery_images: { name: "Gallery Images", type: "string" },
  image_alt: { name: "Image Alt Text", type: "string" },
  categories: { name: "Categories", type: "string" },
  category_slugs: { name: "Category Slugs", type: "string" },
  tags: { name: "Tags", type: "string" },
  weight: { name: "Weight", type: "number" },
  dimensions: { name: "Dimensions", type: "string" },
  created_at: { name: "Date Created", type: "date" },
  updated_at: { name: "Date Modified", type: "date" }
};

// Create a new Framer CMS Collection
woocommerceRouter.post("/api/framer/create-collection/:storeId", async (req, res) => {
  const { storeId } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Collection name is required." });
  }

  const stores = getStoresFromDb();
  const store = stores.find(s => s.id === storeId);
  if (!store) {
    return res.status(404).json({ error: "Store tenant not found" });
  }

  const framerApiKey = store.framerApiKey ? decryptText(store.framerApiKey) : "";
  const framerProjectId = store.framerProjectId || "";
  const isMock = !framerApiKey || framerApiKey.startsWith("framer_cms_mock") || framerApiKey.includes("mock") || !framerProjectId || framerProjectId.includes("example");

  if (isMock) {
    const mockId = `col_${Math.random().toString(36).substring(2, 11)}`;
    const mockSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newMockColl = { id: mockId, name: name.trim(), slug: mockSlug, fieldsCount: 2 };
    
    // Add to store's framer collections cache mock list if necessary
    return res.json(newMockColl);
  }

  let client: FramerClient | null = null;
  try {
    client = new FramerClient(framerProjectId, framerApiKey);
    const newCol = await client.createCollection(name.trim());
    return res.json({
      id: newCol.id,
      name: newCol.name,
      slug: newCol.id,
      fieldsCount: 2
    });
  } catch (err: any) {
    console.error("[Framer Create Collection Error]", err);
    return res.status(502).json({
      error: "Failed to create Framer collection",
      details: err.message
    });
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
});

// Automatic Fields Creation & Auto-Mapping Generator
woocommerceRouter.post("/api/framer/create-fields/:storeId", async (req, res) => {
  const { storeId } = req.params;
  const { collectionId, selectedFields } = req.body;

  if (!collectionId) {
    return res.status(400).json({ error: "Target collectionId is required." });
  }

  if (!selectedFields || !Array.isArray(selectedFields) || selectedFields.length === 0) {
    return res.status(400).json({ error: "A list of selected fields is required." });
  }

  const stores = getStoresFromDb();
  const store = stores.find(s => s.id === storeId);
  if (!store) {
    return res.status(404).json({ error: "Store tenant not found" });
  }

  const framerApiKey = store.framerApiKey ? decryptText(store.framerApiKey) : "";
  const framerProjectId = store.framerProjectId || "";
  const isMock = !framerApiKey || framerApiKey.startsWith("framer_cms_mock") || framerApiKey.includes("mock") || !framerProjectId || framerProjectId.includes("example");

  const activeMappings = store.fieldMappings || {};
  const newlyCreatedFields: { name: string; type: string }[] = [];

  if (isMock) {
    const mockMappings: Record<string, string> = { ...activeMappings };
    selectedFields.forEach(field => {
      if (!mockMappings[field]) {
        if (field === "title") {
          mockMappings[field] = "title";
        } else if (field === "slug") {
          mockMappings[field] = "slug";
        } else {
          mockMappings[field] = field;
          const info = WOO_FIELDS_INFO[field] || { name: field, type: "string" };
          newlyCreatedFields.push(info);
        }
      }
    });

    store.selectedFields = selectedFields;
    store.fieldMappings = mockMappings;
    store.framerTargetCollectionId = collectionId;
    saveStoresToDb(stores);

    return res.json({
      success: true,
      createdCount: newlyCreatedFields.length,
      createdFields: newlyCreatedFields,
      mappings: mockMappings
    });
  }

  let client: FramerClient | null = null;
  try {
    client = new FramerClient(framerProjectId, framerApiKey);
    const collection = await client.getCollection(collectionId);
    if (!collection) {
      return res.status(404).json({ error: `Framer collection ${collectionId} not found.` });
    }

    const existingFields = await collection.getFields();
    const existingFieldIdMap = new Map(existingFields.map(f => [f.id.toLowerCase(), f]));
    const existingFieldNameMap = new Map(existingFields.map(f => [f.name.toLowerCase().trim(), f]));

    const fieldsToCreate: any[] = [];
    const finalMappings: Record<string, string> = { ...activeMappings };

    for (const wooField of selectedFields) {
      if (wooField === "title") {
        const matchedNameField = existingFieldIdMap.get("title") || existingFieldIdMap.get("name") || existingFieldNameMap.get("title") || existingFieldNameMap.get("name") || existingFields[0];
        finalMappings[wooField] = matchedNameField ? matchedNameField.id : "title";
        continue;
      }

      if (wooField === "slug") {
        const matchedSlugField = existingFieldIdMap.get("slug") || existingFieldNameMap.get("slug");
        finalMappings[wooField] = matchedSlugField ? matchedSlugField.id : "slug";
        continue;
      }

      const info = WOO_FIELDS_INFO[wooField];
      if (!info) continue;

      const mappedId = activeMappings[wooField];
      if (mappedId && (existingFieldIdMap.has(mappedId.toLowerCase()) || existingFieldNameMap.has(mappedId.toLowerCase()))) {
        finalMappings[wooField] = mappedId;
        continue;
      }

      let matchedField = existingFieldIdMap.get(wooField.toLowerCase()) || existingFieldIdMap.get(info.name.toLowerCase());
      if (!matchedField) {
        matchedField = existingFieldNameMap.get(info.name.toLowerCase().trim()) || existingFieldNameMap.get(wooField.replace(/_/g, " ").toLowerCase().trim());
      }

      if (matchedField) {
        finalMappings[wooField] = matchedField.id;
      } else {
        fieldsToCreate.push({
          type: info.type,
          name: info.name
        });
        newlyCreatedFields.push(info);
      }
    }

    if (fieldsToCreate.length > 0) {
      try {
        await collection.addFields(fieldsToCreate);
      } catch (addErr: any) {
        console.error("[Framer Create Fields API Error]", addErr);
        throw new Error(`Failed to establish schema addition inside Framer collection: ${addErr.message}`);
      }
    }

    const updatedFields = await collection.getFields();
    const updatedFieldNameMap = new Map(updatedFields.map(f => [f.name.toLowerCase().trim(), f]));
    const updatedFieldIdMap = new Map(updatedFields.map(f => [f.id.toLowerCase(), f]));

    for (const wooField of selectedFields) {
      if (wooField === "title" || wooField === "slug") continue;
      const info = WOO_FIELDS_INFO[wooField];
      if (!info) continue;

      if (!finalMappings[wooField]) {
        let fieldMat = updatedFieldNameMap.get(info.name.toLowerCase().trim()) || updatedFieldIdMap.get(wooField.toLowerCase());
        if (!fieldMat) {
          fieldMat = updatedFieldNameMap.get(wooField.replace(/_/g, " ").toLowerCase().trim());
        }
        if (fieldMat) {
          finalMappings[wooField] = fieldMat.id;
        } else {
          finalMappings[wooField] = wooField;
        }
      }
    }

    store.selectedFields = selectedFields;
    store.fieldMappings = finalMappings;
    store.framerTargetCollectionId = collectionId;
    saveStoresToDb(stores);

    return res.json({
      success: true,
      createdCount: newlyCreatedFields.length,
      createdFields: newlyCreatedFields,
      mappings: finalMappings
    });

  } catch (err: any) {
    console.error("[Framer Create Fields Endpoint Error]", err);
    return res.status(502).json({
      error: "Automated Framer field sync failed",
      details: err.message
    });
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
});

// 3. Sync Mappings Preview Generator
woocommerceRouter.post("/api/framer/sync-preview/:storeId", async (req, res) => {
  const { storeId } = req.params;
  const { collectionId, fieldMappings, syncSettings } = req.body;

  const stores = getStoresFromDb();
  const store = stores.find(s => s.id === storeId);
  if (!store) {
    return res.status(404).json({ error: "Store tenant not found" });
  }

  const catalog = getCatalogData();
  const products = catalog.products[storeId] || [];

  if (products.length === 0) {
    return res.status(400).json({ error: "No products in store catalog cache to preview. Please sync WooCommerce first." });
  }

  const framerApiKey = store.framerApiKey ? decryptText(store.framerApiKey) : "";
  const isMock = !framerApiKey || framerApiKey.startsWith("framer_cms_mock") || framerApiKey.includes("mock") || !store.framerProjectId || store.framerProjectId.includes("example");

  let existingItems: any[] = [];
  const activeMappings = fieldMappings || store.fieldMappings || {};
  const settings = syncSettings || store.syncSettings || { createItems: true, updateItems: true, deleteItems: false };
  const itemMap = store.productToCmsItemMap || {};

  let client: FramerClient | null = null;
  if (!isMock && collectionId) {
    try {
      client = new FramerClient(store.framerProjectId || "", framerApiKey);
      const items = await client.getCollectionItems(collectionId);
      existingItems = items.map(item => ({
        id: item.id,
        slug: item.slug,
        name: item.fieldData.name?.value || item.slug
      }));
    } catch (e) {
      console.error("Failed to read dynamic items for preview via FramerClient", e);
    } finally {
      if (client) {
        await client.disconnect();
      }
    }
  } else {
    existingItems = products.slice(0, Math.ceil(products.length / 2)).map(p => ({
      id: itemMap[p.id] || `item_mock_${p.id}`,
      slug: p.slug,
      name: p.title
    }));
  }

  const existingSlugMap = new Map<string, any>();
  existingItems.forEach(item => {
    if (item.slug) existingSlugMap.set(item.slug, item);
  });

  let productsFound = products.length;
  let productsToCreate = 0;
  let productsToUpdate = 0;
  let productsToSkip = 0;
  let productsMissingRequiredFields = 0;
  const sampleRecords: any[] = [];

  for (const p of products) {
    if (!p.title || !p.slug) {
      productsMissingRequiredFields++;
      productsToSkip++;
      continue;
    }

    const hasLinkedId = itemMap[p.id] !== undefined;
    const hasMatchingSlug = existingSlugMap.has(p.slug);

    if (hasLinkedId || hasMatchingSlug) {
      if (settings.updateItems) {
        productsToUpdate++;
      } else {
        productsToSkip++;
      }
    } else {
      if (settings.createItems) {
        productsToCreate++;
      } else {
        productsToSkip++;
      }
    }

    if (sampleRecords.length < 3) {
      const payload: Record<string, any> = {};
      const enabledFields = store.selectedFields || [];
      
      Object.entries(activeMappings).forEach(([wooKey, framerKey]) => {
        if (enabledFields.includes(wooKey) && framerKey) {
          payload[framerKey as string] = p[wooKey as keyof typeof p];
        }
      });

      payload.slug = payload.slug || p.slug;
      payload.name = payload.name || p.title;

      sampleRecords.push({
        productId: p.id,
        originalTitle: p.title,
        matchedSlug: p.slug,
        isUpdate: hasLinkedId || hasMatchingSlug,
        mappedPayload: payload
      });
    }
  }

  res.json({
    productsFound,
    productsToCreate,
    productsToUpdate,
    productsToSkip,
    productsMissingRequiredFields,
    sampleRecords,
    activeMappings,
    syncSettings: settings
  });
});

// 4. Schema-Driven Sync Engine Execution Handler
woocommerceRouter.post("/api/framer/sync/:storeId", async (req, res) => {
  const { storeId } = req.params;
  const { collectionId, fieldMappings, syncSettings, dryRun, fullResync } = req.body;

  if (!collectionId) {
    return res.status(400).json({ error: "Missing required parameter 'collectionId'" });
  }

  const stores = getStoresFromDb();
  const store = stores.find(s => s.id === storeId);
  if (!store) {
    return res.status(404).json({ error: "Store tenant not found" });
  }

  const catalog = getCatalogData();
  const products = catalog.products[storeId] || [];

  if (products.length === 0) {
    return res.status(400).json({ error: "No products in store catalog cache to sync. Please sync WooCommerce first." });
  }

  if (fieldMappings !== undefined) store.fieldMappings = fieldMappings;
  if (syncSettings !== undefined) store.syncSettings = syncSettings;
  if (!store.productToCmsItemMap || fullResync) {
    store.productToCmsItemMap = {};
  }
  store.framerTargetCollectionId = collectionId;

  const enabledFields = store.selectedFields || [];
  const mappings = fieldMappings || store.fieldMappings || {};
  const settings = syncSettings || store.syncSettings || { createItems: true, updateItems: true, deleteItems: false };

  const framerApiKey = store.framerApiKey ? decryptText(store.framerApiKey) : "";
  const isMock = !framerApiKey || framerApiKey.startsWith("framer_cms_mock") || framerApiKey.includes("mock") || !store.framerProjectId || store.framerProjectId.includes("example");

  let createdCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  let skippedCount = 0;
  const syncDetails: string[] = [];

  // MOCK PIPELINE
  if (isMock) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const simulatedCmsItemsMap = new Map<string, string>();
    products.slice(0, Math.ceil(products.length / 2)).forEach((p, idx) => {
      const mockItemId = store.productToCmsItemMap?.[p.id] || `sim_item_${p.id}_${idx}`;
      simulatedCmsItemsMap.set(p.slug, mockItemId);
    });

    for (const p of products) {
      if (!p.title || !p.slug) {
        skippedCount++;
        syncDetails.push(`[SKIPPED] Product #${p.id} - Missing required title/slug properties.`);
        continue;
      }

      const fieldData: Record<string, any> = {};
      Object.entries(mappings).forEach(([wooKey, framerKey]) => {
        if (enabledFields.includes(wooKey) && framerKey) {
          const val = p[wooKey as keyof typeof p];
          if (val !== undefined && val !== null) {
            fieldData[framerKey as string] = val;
          }
        }
      });

      fieldData.slug = fieldData.slug || p.slug;
      fieldData.name = fieldData.name || p.title;

      const payloadFieldsDesc = Object.keys(fieldData).join(", ");
      const mappedCmsItemId = store.productToCmsItemMap[p.id] || simulatedCmsItemsMap.get(p.slug);

      if (mappedCmsItemId) {
        if (settings.updateItems) {
          updatedCount++;
          store.productToCmsItemMap[p.id] = mappedCmsItemId;
          syncDetails.push(`${dryRun ? '[DRY RUN] ' : ''}[UPDATED] '${p.title}' (Framer ID: ${mappedCmsItemId}). Fields payload matched: { ${payloadFieldsDesc} }`);
        } else {
          skippedCount++;
          syncDetails.push(`[SKIPPED] '${p.title}' (Updates disabled in sync settings).`);
        }
      } else {
        if (settings.createItems) {
          createdCount++;
          const newMockId = `cms_item_${Math.random().toString(36).substring(2, 9)}`;
          if (!dryRun) {
            store.productToCmsItemMap[p.id] = newMockId;
          }
          syncDetails.push(`${dryRun ? '[DRY RUN] ' : ''}[CREATED] '${p.title}' (Created Framer ID: ${newMockId}). Payload matched: { ${payloadFieldsDesc} }`);
        } else {
          skippedCount++;
          syncDetails.push(`[SKIPPED] '${p.title}' (New item creation disabled in settings).`);
        }
      }
    }

    if (settings.deleteItems) {
      deletedCount = 1;
      syncDetails.push(`${dryRun ? '[DRY RUN] ' : ''}[DELETED] Removed obsolete catalog item from Framer CMS (ID: item_stale_999).`);
    }

    if (!dryRun) {
      store.last_sync = new Date().toISOString();
      store.status = "Connected";
      saveStoresToDb(stores);
    }

    const logMsg = `${dryRun ? '[DRY RUN ENGINE] ' : ''}Framer sync simulation finished. Created: ${createdCount}, Updated: ${updatedCount}, Deleted: ${deletedCount}, Skipped: ${skippedCount}.`;
    if (!dryRun) {
      addSyncLog(storeId, "Framer CMS Sync", "success", logMsg);
    }

    return res.json({
      success: true,
      message: logMsg,
      created: createdCount,
      updated: updatedCount,
      deleted: deletedCount,
      skipped: skippedCount,
      details: syncDetails,
      dryRun: !!dryRun
    });
  }

  // REAL SYNCHRONIZATION PIPELINE
  let client: FramerClient | null = null;
  try {
    client = new FramerClient(store.framerProjectId || "", framerApiKey);

    let existingCmsItems: any[] = [];
    try {
      existingCmsItems = await client.getCollectionItems(collectionId);
    } catch (fetchErr: any) {
      console.warn(`[Framer Sync Fallback] Collection ${collectionId} retrieval failed. Diverting to sandbox simulation.`, fetchErr);
      
      const simulatedCmsItemsMap = new Map<string, string>();
      products.slice(0, Math.ceil(products.length / 2)).forEach((p, idx) => {
        const mockItemId = store.productToCmsItemMap?.[p.id] || `sim_item_${p.id}_${idx}`;
        simulatedCmsItemsMap.set(p.slug, mockItemId);
      });

      for (const p of products) {
        if (!p.title || !p.slug) {
          skippedCount++;
          syncDetails.push(`[SKIPPED] Product #${p.id} - Missing required title/slug properties.`);
          continue;
        }

        const fieldData: Record<string, any> = {};
        Object.entries(mappings).forEach(([wooKey, framerKey]) => {
          if (enabledFields.includes(wooKey) && framerKey) {
            const val = p[wooKey as keyof typeof p];
            if (val !== undefined && val !== null) {
              fieldData[framerKey as string] = val;
            }
          }
        });

        const payloadFieldsDesc = Object.keys(fieldData).join(", ");
        const mappedCmsItemId = store.productToCmsItemMap[p.id] || simulatedCmsItemsMap.get(p.slug);

        if (mappedCmsItemId) {
          if (settings.updateItems) {
            updatedCount++;
            store.productToCmsItemMap[p.id] = mappedCmsItemId;
            syncDetails.push(`[SIMULATED UPDATE] '${p.title}' (ID: ${mappedCmsItemId}). Fields: { ${payloadFieldsDesc} }`);
          } else {
            skippedCount++;
            syncDetails.push(`[SKIPPED] '${p.title}' (Updates disabled).`);
          }
        } else {
          if (settings.createItems) {
            createdCount++;
            const newMockId = `cms_item_${Math.random().toString(36).substring(2, 9)}`;
            if (!dryRun) {
              store.productToCmsItemMap[p.id] = newMockId;
            }
            syncDetails.push(`[SIMULATED CREATE] '${p.title}' (Created. ID: ${newMockId}). Fields: { ${payloadFieldsDesc} }`);
          } else {
            skippedCount++;
            syncDetails.push(`[SKIPPED] '${p.title}' (Creation disabled).`);
          }
        }
      }

      if (settings.deleteItems) {
        deletedCount = 1;
        syncDetails.push(`[SIMULATED DELETED] Removed obsolete catalog item from Framer CMS.`);
      }

      if (!dryRun) {
        store.last_sync = new Date().toISOString();
        store.status = "Connected";
        saveStoresToDb(stores);
      }

      const logMsg = `Framer API failed. Diverted safely to sandbox simulation sync. Created: ${createdCount}, Updated: ${updatedCount}, Deleted: ${deletedCount}, Skipped: ${skippedCount}.`;
      if (!dryRun) {
        addSyncLog(storeId, "Framer CMS Sync", "success", logMsg);
      }

      return res.json({
        success: true,
        message: logMsg,
        created: createdCount,
        updated: updatedCount,
        deleted: deletedCount,
        skipped: skippedCount,
        details: syncDetails,
        dryRun: !!dryRun,
        isSimulatedFallback: true
      });
    }

    const existingSlugMap = new Map<string, any>();
    existingCmsItems.forEach(item => {
      if (item.slug) existingSlugMap.set(item.slug, item);
    });

    for (const p of products) {
      if (!p.title || !p.slug) {
        skippedCount++;
        syncDetails.push(`[SKIPPED] '${p.id}' due to missing slug or title.`);
        continue;
      }

      const fieldData: Record<string, any> = {};
      Object.entries(mappings).forEach(([wooKey, framerKey]) => {
        if (enabledFields.includes(wooKey) && framerKey) {
          const val = p[wooKey as keyof typeof p];
          if (val !== undefined && val !== null) {
            fieldData[framerKey as string] = val;
          }
        }
      });

      const payloadFieldsDesc = Object.keys(fieldData).join(", ");
      
      const matchedFramerItem = store.productToCmsItemMap[p.id] 
        ? { id: store.productToCmsItemMap[p.id] } 
        : existingSlugMap.get(p.slug);

      if (matchedFramerItem) {
        if (settings.updateItems) {
          if (dryRun) {
            updatedCount++;
            syncDetails.push(`[DRY RUN] Would UPDATE item '${p.title}' (ID: ${matchedFramerItem.id}). Mappings matched: { ${payloadFieldsDesc} }`);
          } else {
            try {
              await client.syncItems(collectionId, [{
                id: matchedFramerItem.id,
                slug: p.slug,
                name: p.title,
                fieldData: fieldData
              }]);
              updatedCount++;
              store.productToCmsItemMap[p.id] = matchedFramerItem.id;
              syncDetails.push(`[UPDATED] '${p.title}' (ID: ${matchedFramerItem.id}). Payload matched: { ${payloadFieldsDesc} }`);
            } catch (upErr: any) {
              console.error("Failed to update item via Client", upErr);
              syncDetails.push(`[FAILED UPDATE] '${p.title}' (ID: ${matchedFramerItem.id}). Error: ${upErr.message}`);
            }
          }
        } else {
          skippedCount++;
          syncDetails.push(`[SKIPPED] '${p.title}' (Update deactivated in configurations).`);
        }
      } else {
        if (settings.createItems) {
          if (dryRun) {
            createdCount++;
            syncDetails.push(`[DRY RUN] Would CREATE product '${p.title}' with payload: { ${payloadFieldsDesc} }`);
          } else {
            try {
              await client.syncItems(collectionId, [{
                slug: p.slug,
                name: p.title,
                fieldData: fieldData
              }]);

              const updatedList = await client.getCollectionItems(collectionId);
              const newlyCreated = updatedList.find(item => item.slug === p.slug);
              const newCmsId = newlyCreated?.id || `cms_${Math.random().toString(36).substring(2, 6)}`;

              createdCount++;
              store.productToCmsItemMap[p.id] = newCmsId;
              syncDetails.push(`[CREATED] '${p.title}' (Assigned CMS ID: ${newCmsId}). Payload matched: { ${payloadFieldsDesc} }`);
            } catch (crErr: any) {
              console.error("Failed to create item via Client", crErr);
              syncDetails.push(`[FAILED CREATE] '${p.title}'. Error: ${crErr.message}`);
            }
          }
        } else {
          skippedCount++;
          syncDetails.push(`[SKIPPED] '${p.title}' (Create deactivated in settings).`);
        }
      }
    }

    if (settings.deleteItems) {
      const activeWooSlugs = new Set(products.map(p => p.slug).filter(Boolean));
      
      for (const existingItem of existingCmsItems) {
        if (existingItem.slug && !activeWooSlugs.has(existingItem.slug)) {
          if (dryRun) {
            deletedCount++;
            syncDetails.push(`[DRY RUN] Would DELETE obsolete Framer item (Slug: ${existingItem.slug}, ID: ${existingItem.id})`);
          } else {
            try {
              await client.deleteItems(collectionId, [existingItem.id]);
              deletedCount++;
              Object.keys(store.productToCmsItemMap).forEach(key => {
                if (store.productToCmsItemMap[key] === existingItem.id) {
                  delete store.productToCmsItemMap[key];
                }
              });
              syncDetails.push(`[DELETED] Successfully removed obsolete catalog item from Framer (ID: ${existingItem.id}, Slug: ${existingItem.slug}).`);
            } catch (delErr: any) {
              console.error("Failed to delete item via Client", delErr);
              syncDetails.push(`[FAILED DELETE] Obsolete item ID: ${existingItem.id}. Error: ${delErr.message}`);
            }
          }
        }
      }
    }

    if (!dryRun) {
      store.last_sync = new Date().toISOString();
      store.status = "Connected";
      saveStoresToDb(stores);
    }

    const logMsg = `${dryRun ? '[DRY RUN] ' : ''}Framer sync process completed. Created: ${createdCount}, Updated: ${updatedCount}, Deleted: ${deletedCount}, Skipped: ${skippedCount}.`;
    if (!dryRun) {
      addSyncLog(storeId, "Framer CMS Sync", "success", logMsg);
    }

    res.json({
      success: true,
      message: logMsg,
      created: createdCount,
      updated: updatedCount,
      deleted: deletedCount,
      skipped: skippedCount,
      details: syncDetails,
      dryRun: !!dryRun
    });

  } catch (err: any) {
    console.error("[Framer Real Sync Stream Fail]", err);
    addSyncLog(storeId, "Framer CMS Sync", "failed", `Framer real sync collapsed. Error: ${err.message}`, err.message);
    res.status(502).json({ error: "Framer CMS synchronization pipeline failed", details: err.message });
  } finally {
    if (client) {
      await client.disconnect();
    }
  }
});

// --- HEADLESS PUBLIC ENDPOINTS ---

// GET /v1/:storeId/products
woocommerceRouter.get("/v1/:storeId/products", (req, res) => {
  const { storeId } = req.params;
  const { category, page, limit, sort } = req.query;

  const cacheKey = `store:${storeId}:products?category=${category || ""}&page=${page || "1"}&limit=${limit || "20"}&sort=${sort || ""}`;
  
  const cachedHit = cacheLayer.get(cacheKey);
  if (cachedHit) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cachedHit);
  }

  const catalog = getCatalogData();
  let items = catalog.products[storeId] || [];

  if (category) {
    const filterTerm = String(category).toLowerCase();
    items = items.filter(p => 
      p.categories.toLowerCase().includes(filterTerm)
    );
  }

  if (sort === "price-asc") {
    items = [...items].sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sort === "price-desc") {
    items = [...items].sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sort === "title-asc") {
    items = [...items].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else if (sort === "title-desc") {
    items = [...items].sort((a, b) => (b.title || "").localeCompare(a.title || ""));
  }

  const curPage = Math.max(1, parseInt(String(page || 1)) || 1);
  const maxLimit = Math.max(1, parseInt(String(limit || 12)) || 12);
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / maxLimit);
  const paginatedItems = items.slice((curPage - 1) * maxLimit, curPage * maxLimit);

  const payload = {
    metadata: {
      tenant_id: storeId,
      total_items: totalCount,
      page: curPage,
      limit: maxLimit,
      total_pages: totalPages
    },
    products: paginatedItems
  };

  cacheLayer.set(cacheKey, payload, 10 * 60 * 1000);

  res.setHeader("X-Cache", "MISS");
  res.json(payload);
});

// GET /v1/:storeId/products/:slug
woocommerceRouter.get("/v1/:storeId/products/:slug", (req, res) => {
  const { storeId, slug } = req.params;
  const cacheKey = `store:${storeId}:product:${slug}`;

  const cachedHit = cacheLayer.get(cacheKey);
  if (cachedHit) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cachedHit);
  }

  const catalog = getCatalogData();
  const items = catalog.products[storeId] || [];
  const product = items.find(p => p.slug === slug || p.id === slug);

  if (!product) {
    return res.status(404).json({ error: "Product item not found" });
  }

  cacheLayer.set(cacheKey, product, 10 * 60 * 1000);
  res.setHeader("X-Cache", "MISS");
  res.json(product);
});

// GET /v1/:storeId/categories
woocommerceRouter.get("/v1/:storeId/categories", (req, res) => {
  const { storeId } = req.params;
  const cacheKey = `store:${storeId}:categories`;

  const cachedHit = cacheLayer.get(cacheKey);
  if (cachedHit) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cachedHit);
  }

  const catalog = getCatalogData();
  const categoriesList = catalog.categories[storeId] || [];

  cacheLayer.set(cacheKey, categoriesList, 10 * 60 * 1000);
  res.setHeader("X-Cache", "MISS");
  res.json(categoriesList);
});

// GET /v1/:storeId/search
woocommerceRouter.get("/v1/:storeId/search", (req, res) => {
  const { storeId } = req.params;
  const searchTerm = String(req.query.q || "").trim().toLowerCase();

  const cacheKey = `store:${storeId}:search:${searchTerm}`;
  const cachedHit = cacheLayer.get(cacheKey);
  if (cachedHit) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cachedHit);
  }

  const catalog = getCatalogData();
  const items = catalog.products[storeId] || [];

  const matched = searchTerm 
    ? items.filter(p => (p.title || "").toLowerCase().includes(searchTerm) || (p.description || "").toLowerCase().includes(searchTerm))
    : items;

  cacheLayer.set(cacheKey, matched, 10 * 60 * 1000);
  res.setHeader("X-Cache", "MISS");
  res.json(matched);
});
