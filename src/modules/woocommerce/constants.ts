import { FieldCategory } from "./types";

export const FIELD_CATEGORIES: FieldCategory[] = [
  {
    id: "basic",
    name: "Basic",
    fields: [
      { id: "title", label: "Product Name", desc: "The visible name of the product" },
      { id: "slug", label: "Slug", desc: "The web URL permalink slug" },
      { id: "sku", label: "SKU", desc: "Stock Keeping Unit unique model code" },
      { id: "type", label: "Product Type", desc: "'simple' or 'variable' store format" },
      { id: "status", label: "Status", desc: "Publishing state or stock visibility status" }
    ]
  },
  {
    id: "descriptions",
    name: "Description",
    fields: [
      { id: "short_description", label: "Short Description", desc: "The brief teaser intro text" },
      { id: "description", label: "Full Description", desc: "The main product content description" }
    ]
  },
  {
    id: "pricing",
    name: "Pricing",
    fields: [
      { id: "price", label: "Price", desc: "Active checkout price" },
      { id: "regular_price", label: "Regular Price", desc: "Standard standard non-discounted price" },
      { id: "sale_price", label: "Sale Price", desc: "Active drop sale discount price" },
      { id: "currency", label: "Currency", desc: "Store price currency denominator" }
    ]
  },
  {
    id: "inventory",
    name: "Inventory",
    fields: [
      { id: "stock_status", label: "Stock Status", desc: "In-stock, out-of-stock, on-backorder flags" },
      { id: "stock_quantity", label: "Stock Quantity", desc: "Exact quantity remaining in physical index" },
      { id: "manage_stock", label: "Manage Stock", desc: "Whether stock level tracking is enabled" }
    ]
  },
  {
    id: "images",
    name: "Images",
    fields: [
      { id: "featured_image", label: "Featured Image", desc: "The primary high-definition showcase asset" },
      { id: "gallery_images", label: "Gallery Images", desc: "Secondary product photo assets list" },
      { id: "image_alt", label: "Image Alt Text", desc: "Accessibility descriptive image text" }
    ]
  },
  {
    id: "taxonomy",
    name: "Taxonomy",
    fields: [
      { id: "categories", label: "Categories", desc: "Product category designations" },
      { id: "category_slugs", label: "Category Slugs", desc: "URL paths matched with product categories" },
      { id: "tags", label: "Tags", desc: "Meta keyword labeling lists" }
    ]
  },
  {
    id: "attributes",
    name: "Attributes",
    fields: [
      { id: "attributes", label: "Product Attributes", desc: "Defined custom characteristics (e.g. Size, Color)" },
      { id: "attribute_values", label: "Attribute Values", desc: "The specific option choices (e.g. M, L, Red)" }
    ]
  },
  {
    id: "variants",
    name: "Variants",
    fields: [
      { id: "variant_name", label: "Variant Name", desc: "Individual variant combination labels" },
      { id: "variant_price", label: "Variant Price", desc: "Variant specific pricing levels" },
      { id: "variant_sku", label: "Variant SKU", desc: "Variant unique identifier tags" },
      { id: "variant_inventory", label: "Variant Inventory", desc: "Variant storage stock numbers" }
    ]
  },
  {
    id: "seo",
    name: "SEO",
    fields: [
      { id: "seo_title", label: "SEO Title", desc: "Meta search engine title header text" },
      { id: "seo_description", label: "SEO Description", desc: "Snippets description displayed in index catalogs" }
    ]
  },
  {
    id: "metadata",
    name: "Metadata",
    fields: [
      { id: "created_at", label: "Created Date", desc: "ISO entry registration timestamp" },
      { id: "updated_at", label: "Updated Date", desc: "ISO modification date timestamp" }
    ]
  }
];
