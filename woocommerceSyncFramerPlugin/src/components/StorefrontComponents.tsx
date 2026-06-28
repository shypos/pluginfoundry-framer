import { useState } from "react"

interface ComponentMeta {
    id: string
    name: string
    category: "catalog" | "product" | "navigation" | "utilities"
    description: string
    code: string
}

export function StorefrontComponents() {
    const [selectedCategory, setSelectedCategory] = useState<"all" | "catalog" | "product" | "navigation" | "utilities">("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [activeComponent, setActiveComponent] = useState<ComponentMeta | null>(null)

    const handleCopy = (comp: ComponentMeta) => {
        navigator.clipboard.writeText(comp.code)
        setCopiedId(comp.id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const categories = [
        { id: "all", name: "All Components" },
        { id: "catalog", name: "Catalog & Grids" },
        { id: "product", name: "Product Details" },
        { id: "navigation", name: "Navigation & Filters" },
        { id: "utilities", name: "Storefront Utilities" },
    ]

    const filtered = componentsList.filter(comp => {
        const matchesCategory = selectedCategory === "all" || comp.category === selectedCategory
        const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              comp.description.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    return (
        <main className="setup" style={{ height: "100%", display: "flex", flexDirection: "column", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "12px" }}>
                <div>
                    <h2 style={{ fontSize: "14px", fontWeight: "700", margin: 0 }}>Storefront Components</h2>
                    <p style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)", margin: "2px 0 0 0" }}>
                        Copy clean React components to build your custom WooCommerce storefront in Framer.
                    </p>
                </div>
            </div>

            {/* Search and Category Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", marginBottom: "12px" }}>
                <input
                    type="text"
                    placeholder="Search components..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "6px 10px",
                        fontSize: "11px",
                        backgroundColor: "var(--framer-color-bg-secondary)",
                        border: "1px solid var(--framer-color-bg-tertiary)",
                        borderRadius: "6px",
                        color: "var(--framer-color-text)"
                    }}
                />

                <div style={{ display: "flex", gap: "4px", overflowX: "auto", paddingBottom: "4px" }}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id as any)}
                            style={{
                                padding: "4px 8px",
                                fontSize: "10px",
                                whiteSpace: "nowrap",
                                borderRadius: "4px",
                                border: "none",
                                backgroundColor: selectedCategory === cat.id ? "var(--framer-color-tint)" : "var(--framer-color-bg-tertiary)",
                                color: selectedCategory === cat.id ? "#fff" : "var(--framer-color-text-secondary)",
                                cursor: "pointer"
                            }}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* List and Details View */}
            <div style={{ display: "flex", flex: 1, gap: "12px", minHeight: 0 }}>
                {/* List Column */}
                <div style={{
                    width: activeComponent ? "40%" : "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    overflowY: "auto",
                    maxHeight: "340px",
                    borderRight: activeComponent ? "1px solid var(--framer-color-bg-tertiary)" : "none",
                    paddingRight: activeComponent ? "8px" : 0
                }}>
                    {filtered.map(comp => (
                        <button
                            key={comp.id}
                            onClick={() => setActiveComponent(comp)}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-start",
                                width: "100%",
                                padding: "8px 10px",
                                border: activeComponent?.id === comp.id ? "1.5px solid var(--framer-color-tint)" : "1px solid var(--framer-color-bg-tertiary)",
                                borderRadius: "6px",
                                backgroundColor: "var(--framer-color-bg-tertiary)",
                                cursor: "pointer",
                                textAlign: "left"
                            }}
                        >
                            <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--framer-color-text)" }}>{comp.name}</span>
                            <span style={{
                                fontSize: "9px",
                                color: "var(--framer-color-text-tertiary)",
                                overflow: "hidden",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                marginTop: "2px"
                            }}>
                                {comp.description}
                            </span>
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <div style={{ textAlign: "center", padding: "20px", fontSize: "11px", color: "var(--framer-color-text-tertiary)" }}>
                            No components found matching search criteria.
                        </div>
                    )}
                </div>

                {/* Details Column (Visible only when selected) */}
                {activeComponent && (
                    <div style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        maxHeight: "340px",
                        overflowY: "auto"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <h3 style={{ fontSize: "12px", fontWeight: "700", margin: 0 }}>{activeComponent.name}</h3>
                                <span style={{ fontSize: "9px", color: "var(--framer-color-text-tertiary)", textTransform: "uppercase" }}>
                                    {activeComponent.category} Component
                                </span>
                            </div>
                            <button
                                onClick={() => setActiveComponent(null)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--framer-color-text-tertiary)",
                                    fontSize: "10px",
                                    cursor: "pointer"
                                }}
                            >
                                Close
                            </button>
                        </div>

                        <p style={{ fontSize: "10px", color: "var(--framer-color-text-secondary)", lineHeight: "1.3", margin: 0 }}>
                            {activeComponent.description}
                        </p>

                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                onClick={() => handleCopy(activeComponent)}
                                style={{
                                    flex: 1,
                                    padding: "6px 12px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    borderRadius: "6px",
                                    border: "none",
                                    backgroundColor: "var(--framer-color-tint)",
                                    color: "#fff",
                                    cursor: "pointer"
                                }}
                            >
                                {copiedId === activeComponent.id ? "✓ Copied!" : "Copy React/TSX Code"}
                            </button>
                        </div>

                        <div style={{
                            flex: 1,
                            backgroundColor: "#18181b",
                            borderRadius: "6px",
                            padding: "8px",
                            overflow: "auto",
                            maxHeight: "180px",
                            fontSize: "9px",
                            fontFamily: "var(--font-mono, monospace)",
                            color: "#e4e4e7",
                            border: "1px solid #27272a"
                        }}>
                            <pre style={{ margin: 0 }}>{activeComponent.code}</pre>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}

// Complete library of production-ready Framer Code Components
const componentsList: ComponentMeta[] = [
    {
        id: "product_grid",
        name: "Product Grid",
        category: "catalog",
        description: "Renders a responsive, responsive grid of products directly linked to your WooCommerce sync catalog.",
        code: `import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

export default function ProductGrid(props) {
    const { products, columns, gap, showImage, showPrice, buyButtonText, currencySymbol } = props

    if (!products || products.length === 0) {
        return (
            <div style={emptyStyle}>
                <p>No products available. Double check that your WooCommerce store is connected.</p>
            </div>
        )
    }

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: \`repeat(\${columns}, minmax(0, 1fr))\`,
            gap: \`\${gap}px\`,
            width: "100%"
        }}>
            {products.map(p => {
                const isSale = p.sale_price && Number(p.sale_price) < Number(p.regular_price)
                return (
                    <div key={p.id || p.slug} style={cardStyle}>
                        {showImage && p.featured_image && (
                            <div style={imageContainerStyle}>
                                <img src={p.featured_image} alt={p.name} style={imageStyle} />
                                {isSale && <span style={saleBadgeStyle}>Sale</span>}
                            </div>
                        )}
                        <h3 style={titleStyle}>{p.name}</h3>
                        {showPrice && (
                            <div style={priceContainerStyle}>
                                <span style={priceStyle}>{currencySymbol}{p.price}</span>
                                {isSale && <span style={regularPriceStyle}>{currencySymbol}{p.regular_price}</span>}
                            </div>
                        )}
                        <a href={p.permalink || \`\${p.slug}\`} target="_blank" rel="noopener noreferrer" style={buttonStyle}>
                            {buyButtonText}
                        </a>
                    </div>
                )
            })}
        </div>
    )
}

const emptyStyle: React.CSSProperties = {
    padding: "24px",
    textAlign: "center",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    borderRadius: "8px",
    fontSize: "13px"
}

const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    padding: "12px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    fontFamily: "Inter, sans-serif"
}

const imageContainerStyle: React.CSSProperties = {
    position: "relative",
    aspectRatio: "1",
    borderRadius: "6px",
    overflow: "hidden",
    marginBottom: "10px",
    backgroundColor: "#f9fafb"
}

const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover"
}

const saleBadgeStyle: React.CSSProperties = {
    position: "absolute",
    top: "8px",
    right: "8px",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: "bold",
    padding: "2px 6px",
    borderRadius: "4px",
    textTransform: "uppercase"
}

const titleStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 600,
    margin: "0 0 6px 0",
    color: "#111827"
}

const priceContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: "6px",
    alignItems: "center",
    marginBottom: "12px"
}

const priceStyle: React.CSSProperties = {
    fontSize: "15px",
    fontWeight: 700,
    color: "#111827"
}

const regularPriceStyle: React.CSSProperties = {
    fontSize: "12px",
    color: "#9ca3af",
    textDecoration: "line-through"
}

const buttonStyle: React.CSSProperties = {
    padding: "8px 12px",
    backgroundColor: "#0099ff",
    color: "#ffffff",
    textAlign: "center",
    fontSize: "12px",
    fontWeight: 600,
    borderRadius: "6px",
    textDecoration: "none",
    cursor: "pointer"
}

addPropertyControls(ProductGrid, {
    products: { type: ControlType.Array, title: "Products", control: { type: ControlType.Object } },
    columns: { type: ControlType.Number, title: "Columns", min: 1, max: 6, defaultValue: 3 },
    gap: { type: ControlType.Number, title: "Gap (px)", min: 4, max: 64, defaultValue: 16 },
    showImage: { type: ControlType.Boolean, title: "Show Image", defaultValue: true },
    showPrice: { type: ControlType.Boolean, title: "Show Price", defaultValue: true },
    buyButtonText: { type: ControlType.String, title: "Button Text", defaultValue: "Buy Now" },
    currencySymbol: { type: ControlType.String, title: "Currency", defaultValue: "$" }
})`
    },
    {
        id: "product_price",
        name: "Product Price",
        category: "product",
        description: "Displays current and regular price with a strikethrough sale indicator.",
        code: `import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

export default function ProductPrice(props) {
    const { price, regularPrice, salePrice, currencySymbol, size, color, saleColor } = props
    const isSale = salePrice && Number(salePrice) < Number(regularPrice)

    return (
        <div style={{
            display: "flex",
            gap: "8px",
            alignItems: "baseline",
            fontFamily: "Inter, sans-serif"
        }}>
            <span style={{
                color: isSale ? saleColor : color,
                fontWeight: 700,
                fontSize: \`\${size}px\`
            }}>
                {currencySymbol}{price}
            </span>
            {isSale && (
                <span style={{
                    color: "#9ca3af",
                    textDecoration: "line-through",
                    fontSize: \`\${size * 0.75}px\`
                }}>
                    {currencySymbol}{regularPrice}
                </span>
            )}
        </div>
    )
}

addPropertyControls(ProductPrice, {
    price: { type: ControlType.Number, title: "Price", defaultValue: 45 },
    regularPrice: { type: ControlType.Number, title: "Regular Price", defaultValue: 45 },
    salePrice: { type: ControlType.Number, title: "Sale Price", defaultValue: null },
    currencySymbol: { type: ControlType.String, title: "Currency", defaultValue: "$" },
    size: { type: ControlType.Number, title: "Font Size", min: 10, max: 64, defaultValue: 18 },
    color: { type: ControlType.Color, title: "Price Color", defaultValue: "#111827" },
    saleColor: { type: ControlType.Color, title: "Sale Color", defaultValue: "#ef4444" }
})`
    },
    {
        id: "sale_badge",
        name: "Sale Badge",
        category: "product",
        description: "Renders a highly visible sale tag overlaying discounted product views.",
        code: `import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

export default function SaleBadge(props) {
    const { regularPrice, salePrice, badgeText, backgroundColor, textColor } = props
    const isSale = salePrice && Number(salePrice) < Number(regularPrice)

    if (!isSale) return null

    return (
        <span style={{
            backgroundColor,
            color: textColor,
            fontSize: "11px",
            fontWeight: 700,
            padding: "4px 8px",
            borderRadius: "4px",
            textTransform: "uppercase",
            fontFamily: "Inter, sans-serif",
            letterSpacing: "0.5px"
        }}>
            {badgeText}
        </span>
    )
}

addPropertyControls(SaleBadge, {
    regularPrice: { type: ControlType.Number, title: "Regular Price", defaultValue: 100 },
    salePrice: { type: ControlType.Number, title: "Sale Price", defaultValue: 80 },
    badgeText: { type: ControlType.String, title: "Badge Text", defaultValue: "Sale" },
    backgroundColor: { type: ControlType.Color, title: "Bg Color", defaultValue: "#ef4444" },
    textColor: { type: ControlType.Color, title: "Text Color", defaultValue: "#ffffff" }
})`
    },
    {
        id: "stock_badge",
        name: "Stock Badge",
        category: "product",
        description: "Visual tag mapping inventory stock status directly from WooCommerce.",
        code: `import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

export default function StockBadge(props) {
    const { stockStatus, stockQuantity, manageStock } = props
    const isOutOfStock = stockStatus === "outofstock"

    return (
        <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 8px",
            borderRadius: "4px",
            backgroundColor: isOutOfStock ? "#fef2f2" : "#f0fdf4",
            color: isOutOfStock ? "#991b1b" : "#166534",
            fontSize: "11px",
            fontWeight: 600,
            fontFamily: "Inter, sans-serif"
        }}>
            <span style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: isOutOfStock ? "#ef4444" : "#22c55e"
            }} />
            {isOutOfStock ? "Out of stock" : manageStock && stockQuantity ? \`\${stockQuantity} in stock\` : "In Stock"}
        </div>
    )
}

addPropertyControls(StockBadge, {
    stockStatus: { type: ControlType.String, title: "Status", defaultValue: "instock" },
    stockQuantity: { type: ControlType.Number, title: "Quantity", defaultValue: 10 },
    manageStock: { type: ControlType.Boolean, title: "Manage Stock", defaultValue: true }
})`
    },
    {
        id: "product_gallery",
        name: "Product Gallery",
        category: "product",
        description: "Interactive multi-image slider supporting main image view and thumbnail triggers.",
        code: `import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

export default function ProductGallery(props) {
    const { featuredImage, galleryImages } = props
    const allImages = React.useMemo(() => {
        const list = []
        if (featuredImage) list.push(featuredImage)
        if (galleryImages) {
            const parsed = typeof galleryImages === "string" ? galleryImages.split(",") : galleryImages
            list.push(...parsed)
        }
        return list.filter(Boolean)
    }, [featuredImage, galleryImages])

    const [activeIndex, setActiveIndex] = React.useState(0)

    if (allImages.length === 0) {
        return (
            <div style={{ aspectRatio: "1", backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span>No Images</span>
            </div>
        )
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <div style={{ aspectRatio: "1", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <img src={allImages[activeIndex]} alt="Product" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            {allImages.length > 1 && (
                <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
                    {allImages.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            style={{
                                width: "60px",
                                height: "60px",
                                padding: 0,
                                border: idx === activeIndex ? "2px solid #0099ff" : "1px solid #e5e7eb",
                                borderRadius: "4px",
                                overflow: "hidden",
                                cursor: "pointer",
                                flexShrink: 0
                            }}
                        >
                            <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

addPropertyControls(ProductGallery, {
    featuredImage: { type: ControlType.String, title: "Featured Image", defaultValue: "https://images.unsplash.com/photo-1559056131-09a25b16e453?w=500" },
    galleryImages: { type: ControlType.String, title: "Gallery (Comma-separated)", defaultValue: "" }
})`
    }
]
