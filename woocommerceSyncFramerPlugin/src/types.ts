export interface WooCommerceCreds {
    url: string
    consumerKey: string
    consumerSecret: string
    sslBypass: boolean
}

export interface StoreMetadata {
    name: string
    url: string
    currency: string
    timezone: string
    productCount: number
    categoryCount: number
}

export interface SyncPreferences {
    syncProducts: boolean
    syncCategories: boolean
    deleteRemoved: boolean
    importImages: boolean
    convertHtml: boolean
    importStock: boolean
    importVariants: boolean
}

export interface SyncProgress {
    status: "idle" | "connecting" | "fetching" | "downloading_images" | "importing" | "completed" | "failed"
    currentTask: string
    total: number
    processed: number
    updated: number
    skipped: number
    failed: number
    elapsedTime: number // in seconds
    logs: string[]
}

export interface WooCommerceCategory {
    id: string
    name: string
    slug: string
    description: string
    parent: string
    image?: string
    count: number
}

export interface WooCommerceProduct {
    id: string
    name: string
    slug: string
    sku: string
    type: string
    status: string
    description: string
    short_description: string
    price: number
    regular_price: number
    sale_price: number | null
    stock_status: string
    stock_quantity: number | null
    manage_stock: boolean
    weight: string
    featured_image: string
    gallery_images: string[]
    categories: string
    tags: string
    attributes: string
    variants?: string
}
