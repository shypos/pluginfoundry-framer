import { WooCommerceCreds, StoreMetadata, WooCommerceCategory, WooCommerceProduct } from "../types"

// Normalization function to align with fields of WooCommerceProduct
function normalizeProduct(p: any): WooCommerceProduct {
    const rawImages = Array.isArray(p.images)
        ? p.images.map((img: any) => typeof img === "string" ? img : img.src)
        : []
    const featured_image = rawImages[0] || "https://images.unsplash.com/photo-1559056131-09a25b16e453?w=500"
    const gallery_images = rawImages.slice(1)

    const price = Number(p.price || p.regular_price || 0)
    const regular_price = Number(p.regular_price || price || 0)
    const sale_price = p.sale_price ? Number(p.sale_price) : null

    const categoriesStr = Array.isArray(p.categories)
        ? p.categories.map((c: any) => typeof c === "string" ? c : c.name).join(", ")
        : (typeof p.categories === "string" ? p.categories : "")

    const tagsStr = Array.isArray(p.tags)
        ? p.tags.map((t: any) => typeof t === "string" ? t : t.name).join(", ")
        : (typeof p.tags === "string" ? p.tags : "")

    const attributeStr = Array.isArray(p.attributes)
        ? p.attributes.map((attr: any) => {
              const options = Array.isArray(attr.options) ? attr.options.join("/") : ""
              return `${attr.name}: ${options}`
          }).join(" | ")
        : ""

    return {
        id: String(p.id),
        name: p.name || "",
        slug: p.slug || (p.name ? p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `prod-${p.id}`),
        sku: p.sku || `SKU-${p.id}`,
        type: p.type || "simple",
        status: p.status || "publish",
        description: p.description || "",
        short_description: p.short_description || "",
        price,
        regular_price,
        sale_price,
        stock_status: p.stock_status || "instock",
        stock_quantity: p.stock_quantity !== undefined ? p.stock_quantity : null,
        manage_stock: p.manage_stock || false,
        weight: p.weight || "",
        featured_image,
        gallery_images,
        categories: categoriesStr,
        tags: tagsStr,
        attributes: attributeStr,
    }
}

export function isMockUrl(url: string): boolean {
    const s = url.trim().toLowerCase()
    return (
        s.includes(".domain") ||
        s.includes("mock") ||
        s.includes(".local") ||
        s === "https://artisanwood.store"
    )
}

/**
 * WooCommerce Native API Service
 */
export class WooCommerceService {
    private creds: WooCommerceCreds

    constructor(creds: WooCommerceCreds) {
        this.creds = creds
    }

    private getAuthHeader(): string {
        const token = btoa(`${this.creds.consumerKey}:${this.creds.consumerSecret}`)
        return `Basic ${token}`
    }

    private getSanitizedUrl(): string {
        return this.creds.url.trim().replace(/\/$/, "")
    }

    /**
     * Validates credentials and retrieves store metadata
     */
    async getStoreMetadata(): Promise<StoreMetadata> {
        const isMock = isMockUrl(this.creds.url)

        if (isMock) {
            // Simulate brief latency
            await new Promise(resolve => setTimeout(resolve, 800))

            const name = this.creds.url.includes("wood") ? "Artisan Woodwork Shop" : "Gourmet Coffee Boutique"
            return {
                name,
                url: this.getSanitizedUrl(),
                currency: "USD",
                timezone: "America/New_York",
                productCount: this.creds.url.includes("wood") ? 3 : 5,
                categoryCount: this.creds.url.includes("wood") ? 6 : 4,
            }
        }

        const authHeader = this.getAuthHeader()
        const url = this.getSanitizedUrl()

        // Attempt system status endpoint
        try {
            const res = await fetch(`${url}/wp-json/wc/v3/system_status`, {
                headers: {
                    Authorization: authHeader,
                    Accept: "application/json",
                },
            })

            if (res.status === 200) {
                const info = await res.json()
                return {
                    name: info.settings?.store_name || "WooCommerce Store",
                    url,
                    currency: info.settings?.currency || "USD",
                    timezone: info.settings?.timezone || "UTC",
                    productCount: 25, // default approximation
                    categoryCount: 5,
                }
            }
        } catch (e) {
            console.warn("System status check failed, attempting fallback products check...")
        }

        // Fallback: fetch products with count headers
        const res = await fetch(`${url}/wp-json/wc/v3/products?per_page=1`, {
            headers: {
                Authorization: authHeader,
                Accept: "application/json",
            },
        })

        if (!res.ok) {
            throw new Error(`Authentication refused (Status ${res.status}). Verify credentials and endpoint.`)
        }

        const totalProducts = parseInt(res.headers.get("X-WP-Total") || "10", 10)
        return {
            name: "WooCommerce Merchant Store",
            url,
            currency: "USD",
            timezone: "UTC",
            productCount: totalProducts,
            categoryCount: 5,
        }
    }

    /**
     * Fetch all Categories
     */
    async fetchCategories(): Promise<WooCommerceCategory[]> {
        const isMock = isMockUrl(this.creds.url)

        if (isMock) {
            const isWood = this.creds.url.includes("wood")
            if (isWood) {
                return [
                    { id: "cat_2_1", name: "Home", slug: "home", description: "Rustic home accents", parent: "", count: 1 },
                    { id: "cat_2_2", name: "Bowls", slug: "bowls", description: "Hand-turned natural bowls", parent: "", count: 1 },
                    { id: "cat_2_3", name: "Kitchen", slug: "kitchen", description: "Kitchenware utensils", parent: "", count: 1 },
                    { id: "cat_2_4", name: "Boards", slug: "boards", description: "Heavy-duty prep boards", parent: "", count: 1 },
                    { id: "cat_2_5", name: "Decor", slug: "decor", description: "Home decor craft", parent: "", count: 1 },
                    { id: "cat_2_6", name: "Cedar", slug: "cedar", description: "Cedar furniture", parent: "", count: 1 },
                ]
            } else {
                return [
                    { id: "cat_1_1", name: "Bags", slug: "bags", description: "Premium whole bean bags", parent: "", count: 2 },
                    { id: "cat_1_2", name: "Coffee", slug: "coffee", description: "Fresh single origin roasts", parent: "", count: 2 },
                    { id: "cat_1_3", name: "Accessories", slug: "accessories", description: "Specialty brewing gear", parent: "", count: 2 },
                    { id: "cat_1_4", name: "Coffeeware", slug: "coffeeware", description: "Artisan ceramics", parent: "", count: 1 },
                ]
            }
        }

        const authHeader = this.getAuthHeader()
        const url = this.getSanitizedUrl()

        const res = await fetch(`${url}/wp-json/wc/v3/products/categories?per_page=100`, {
            headers: {
                Authorization: authHeader,
                Accept: "application/json",
            },
        })

        if (!res.ok) {
            throw new Error(`Failed to fetch categories (HTTP ${res.status})`)
        }

        const data = await res.json()
        return data.map((c: any) => ({
            id: String(c.id),
            name: c.name,
            slug: c.slug,
            description: c.description || "",
            parent: String(c.parent || ""),
            image: c.image?.src || "",
            count: c.count || 0,
        }))
    }

    /**
     * Fetch Products (paginated/batched)
     */
    async fetchProducts(progressCallback?: (status: string) => void): Promise<WooCommerceProduct[]> {
        const isMock = isMockUrl(this.creds.url)

        if (isMock) {
            await new Promise(resolve => setTimeout(resolve, 600))
            const isWood = this.creds.url.includes("wood")

            if (isWood) {
                return [
                    normalizeProduct({
                        id: "401",
                        name: "Handcrafted Solid Oak Salad Bowl",
                        description: "Turned from premium white oak blocks, coated with food-grade wood beeswax.",
                        price: 45.0,
                        images: [{ src: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500" }],
                        categories: [{ name: "Home" }, { name: "Bowls" }],
                        sku: "WO-OAK-SALAD",
                    }),
                    normalizeProduct({
                        id: "402",
                        name: "End-Grain Walnut Prep Board",
                        description: "Juice-catching grooved walnut heavy-duty preparation board.",
                        price: 75.0,
                        images: [{ src: "https://images.unsplash.com/photo-1594756297441-2a6c8e3bf6e1?w=500" }],
                        categories: [{ name: "Kitchen" }, { name: "Boards" }],
                        sku: "WO-WAL-PREP",
                    }),
                    normalizeProduct({
                        id: "403",
                        name: "Minimalist Cedar Tri-Leg Plant Stand",
                        description: "Treated with water-shedding exterior grade amber sealant.",
                        price: 29.99,
                        images: [{ src: "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=500" }],
                        categories: [{ name: "Decor" }, { name: "Cedar" }],
                        sku: "WO-CED-STAND",
                    }),
                ]
            } else {
                return [
                    normalizeProduct({
                        id: "301",
                        name: "Premium Espresso Dark Roast (Bag)",
                        description: "Sustainable dark espresso blend with hints of cacao and hazelnut.",
                        price: 17.5,
                        images: [{ src: "https://images.unsplash.com/photo-1559056131-09a25b16e453?w=500" }],
                        categories: [{ name: "Bags" }, { name: "Coffee" }],
                        sku: "COF-DK-ROAST",
                    }),
                    normalizeProduct({
                        id: "302",
                        name: "Single Origin Colombia Medium (Bag)",
                        description: "Sun-dried high altitude whole bean coffee with clean citrus acidity.",
                        price: 22.5,
                        images: [{ src: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500" }],
                        categories: [{ name: "Bags" }, { name: "Coffee" }],
                        sku: "COF-COL-MED",
                    }),
                    normalizeProduct({
                        id: "303",
                        name: "Ceramic Pourover Cone & Dripper",
                        description: "Insulating dual-ribbed matte black ceramic pouring cone.",
                        price: 24.99,
                        images: [{ src: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=500" }],
                        categories: [{ name: "Accessories" }],
                        sku: "COF-CER-DRIP",
                    }),
                    normalizeProduct({
                        id: "304",
                        name: "Ergonomic Gooseneck Kettle (Stovetop)",
                        description: "Flow-restrictive gooseneck spout constructed with medical grade steel.",
                        price: 49.99,
                        images: [{ src: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500" }],
                        categories: [{ name: "Accessories" }],
                        sku: "COF-GOOSE-KET",
                    }),
                    normalizeProduct({
                        id: "305",
                        name: "Imported Ceramic Espresso Match Set",
                        description: "Exquisite glaze finished modular double cups set imported directly.",
                        price: 28.0,
                        images: [{ src: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500" }],
                        categories: [{ name: "Coffeeware" }],
                        sku: "COF-CER-CUP",
                    }),
                ]
            }
        }

        const authHeader = this.getAuthHeader()
        const url = this.getSanitizedUrl()
        let products: WooCommerceProduct[] = []
        let page = 1
        let keepFetching = true

        while (keepFetching) {
            if (progressCallback) {
                progressCallback(`Fetching page ${page}...`)
            }

            const res = await fetch(`${url}/wp-json/wc/v3/products?per_page=50&page=${page}`, {
                headers: {
                    Authorization: authHeader,
                    Accept: "application/json",
                },
            })

            if (!res.ok) {
                throw new Error(`Failed to fetch products page ${page} (HTTP ${res.status})`)
            }

            const data = await res.json()
            if (!Array.isArray(data) || data.length === 0) {
                keepFetching = false
                break
            }

            const normalizedBatch = data.map((p: any) => normalizeProduct(p))
            products = [...products, ...normalizedBatch]

            const totalPages = parseInt(res.headers.get("X-WP-TotalPages") || "1", 10)
            if (page >= totalPages || data.length < 50) {
                keepFetching = false
            } else {
                page++
            }
        }

        return products
    }
}
