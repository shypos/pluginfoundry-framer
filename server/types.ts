// Multi-tenant WooCommerce & Framer CMS SaaS System Types
export interface ImportProfile {
  id: string;
  name: string;
  fields: string[];
  isCustom?: boolean;
}

export interface Store {
  id: string;
  name: string;
  url: string;
  consumerKey: string;      // Store Encrypted
  consumerSecret: string;   // Store Encrypted
  framerProjectId?: string;
  framerApiKey?: string;    // Store Encrypted
  framerTargetCollectionId?: string;
  selectedFields?: string[];
  profiles?: ImportProfile[];
  status: "Connected" | "Syncing" | "degraded";
  last_sync: string | null;
  created_at: string;
  failure_count?: number;
  fieldMappings?: Record<string, string>;
  syncSettings?: { createItems: boolean; updateItems: boolean; deleteItems: boolean };
  productToCmsItemMap?: Record<string, string>;
}

export interface SyncLog {
  id: string;
  storeId: string;
  storeName: string;
  eventType: string; // e.g. "Initial Sync", "Manual Sync", "Scheduled Sync", "Webhook Hot-Sync"
  status: "success" | "failed";
  timestamp: string;
  details: string;
  errorLog?: string;
}

export interface NormalizedProduct {
  id: string;
  storeId: string;
  title?: string;
  slug?: string;
  description?: string;
  price?: number;
  currency?: string;
  images?: string[];
  type?: string;
  inStock?: boolean;
  categories?: string;

  // Custom WooCommerce SaaS Selective Fields
  sku?: string;
  status?: string;
  short_description?: string;
  regular_price?: number;
  sale_price?: number | null;
  stock_status?: string;
  stock_quantity?: number;
  manage_stock?: boolean;
  featured_image?: string;
  gallery_images?: string[];
  image_alt?: string;
  category_slugs?: string;
  tags?: string;
  attributes?: any[];
  attribute_values?: string;
  variant_name?: string;
  variant_price?: number;
  variant_sku?: string;
  variant_inventory?: number;
  seo_title?: string;
  seo_description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NormalizedCategory {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface CatalogData {
  products: Record<string, NormalizedProduct[]>;
  categories: Record<string, NormalizedCategory[]>;
}

// Google Forms Integration core types
export interface Form {
  id: string; // Database IDs: frm_xxxxx
  user_id?: string;
  name: string;
  submissions: number;
  status: "Active" | "Draft";
  created_at: string;
  pf_id?: string; // pf_google_xxxxx
  google_url?: string;
  schema?: any; // FormConnectionSchema
  version?: number;
  framer_metadata?: Record<string, string>;
}

// Portcode Integration core types
export interface PortcodeWidget {
  id: string;
  user_id?: string;
  name: string;
  description: string;
  sourceCode: string;
  targetPlatform: "framer_embed" | "framer_tsx" | "webflow_embed";
  compiledCode: string;
  variables: Record<string, { label: string; type: "text" | "color" | "number"; value: any }>;
  status: "Active" | "Draft";
  created_at: string;
}
