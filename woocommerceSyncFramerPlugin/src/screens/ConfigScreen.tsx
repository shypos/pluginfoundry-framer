import { useState } from "react"
import { SyncPreferences } from "../types"

interface ConfigScreenProps {
    storeName: string
    storeUrl: string
    onNext: (prefs: SyncPreferences) => void
    onDisconnect: () => void
}

export function ConfigScreen({ storeName, storeUrl, onNext, onDisconnect }: ConfigScreenProps) {
    // Basic preferences
    const [syncProducts, setSyncProducts] = useState(true)
    const [syncCategories, setSyncCategories] = useState(true)
    const [deleteRemoved, setDeleteRemoved] = useState(false)
    const [importImages, setImportImages] = useState(true)
    const [convertHtml, setConvertHtml] = useState(true)
    const [importStock, setImportStock] = useState(true)
    const [importVariants, setImportVariants] = useState(false)

    // Advanced new settings
    const [importTags, setImportTags] = useState(true)
    const [importAttributes, setImportAttributes] = useState(true)
    const [importSeo, setImportSeo] = useState(true)
    const [imageQuality, setImageQuality] = useState<"standard" | "high" | "raw">("standard")
    const [batchSize, setBatchSize] = useState<number>(50)
    const [defaultProductStatus, setDefaultProductStatus] = useState<"publish" | "draft">("publish")
    const [productsCollectionName, setProductsCollectionName] = useState("WooCommerce Products")
    const [categoriesCollectionName, setCategoriesCollectionName] = useState("WooCommerce Categories")

    const [activeTab, setActiveTab] = useState<"basic" | "advanced">("basic")

    const handleContinue = (e: React.FormEvent) => {
        e.preventDefault()
        onNext({
            syncProducts,
            syncCategories,
            deleteRemoved,
            importImages,
            convertHtml,
            importStock,
            importVariants,
            importTags,
            importAttributes,
            importSeo,
            imageQuality,
            batchSize,
            defaultProductStatus,
            productsCollectionName,
            categoriesCollectionName
        })
    }

    return (
        <main className="setup" style={{ height: "100%", display: "flex", flexDirection: "column", overflowY: "auto", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "8px" }}>
                <span style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)", textTransform: "uppercase", fontWeight: "600" }}>
                    Connected Store
                </span>
                <button
                    type="button"
                    onClick={onDisconnect}
                    style={{
                        padding: "2px 6px",
                        fontSize: "10px",
                        background: "none",
                        color: "var(--framer-color-error)",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600"
                    }}
                >
                    Disconnect
                </button>
            </div>

            <div style={{
                backgroundColor: "var(--framer-color-bg-tertiary)",
                borderRadius: "8px",
                padding: "10px",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                marginBottom: "12px"
            }}>
                <h3 style={{ fontSize: "13px", fontWeight: "600", margin: 0, color: "var(--framer-color-text)" }}>
                    {storeName}
                </h3>
                <span style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {storeUrl}
                </span>
            </div>

            {/* Config Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--framer-color-bg-tertiary)", marginBottom: "12px", gap: "12px" }}>
                <button
                    type="button"
                    onClick={() => setActiveTab("basic")}
                    style={{
                        padding: "6px 0",
                        fontSize: "11px",
                        fontWeight: "600",
                        backgroundColor: "transparent",
                        border: "none",
                        borderBottom: activeTab === "basic" ? "2px solid var(--framer-color-tint)" : "none",
                        color: activeTab === "basic" ? "var(--framer-color-text)" : "var(--framer-color-text-tertiary)",
                        cursor: "pointer"
                    }}
                >
                    Basic Sync
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("advanced")}
                    style={{
                        padding: "6px 0",
                        fontSize: "11px",
                        fontWeight: "600",
                        backgroundColor: "transparent",
                        border: "none",
                        borderBottom: activeTab === "advanced" ? "2px solid var(--framer-color-tint)" : "none",
                        color: activeTab === "advanced" ? "var(--framer-color-text)" : "var(--framer-color-text-tertiary)",
                        cursor: "pointer"
                    }}
                >
                    Advanced Preferences
                </button>
            </div>

            <form onSubmit={handleContinue} style={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
                {activeTab === "basic" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", marginBottom: "15px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--framer-color-text)" }}>Sync Products</div>
                                <div style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)" }}>Import WooCommerce catalogs</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={syncProducts}
                                onChange={e => setSyncProducts(e.target.checked)}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--framer-color-text)" }}>Sync Categories</div>
                                <div style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)" }}>Import category hierarchy</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={syncCategories}
                                onChange={e => setSyncCategories(e.target.checked)}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--framer-color-text)" }}>Download Images</div>
                                <div style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)" }}>Natively upload product images to Framer assets</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={importImages}
                                onChange={e => setImportImages(e.target.checked)}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--framer-color-text)" }}>Clean Deleted Items</div>
                                <div style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)" }}>Auto-remove items deleted from WooCommerce</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={deleteRemoved}
                                onChange={e => setDeleteRemoved(e.target.checked)}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--framer-color-text)" }}>Convert HTML description</div>
                                <div style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)" }}>Map description directly to native Framer Rich Text</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={convertHtml}
                                onChange={e => setConvertHtml(e.target.checked)}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--framer-color-text)" }}>Import Stock Status</div>
                                <div style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)" }}>Track product quantities & stock levels</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={importStock}
                                onChange={e => setImportStock(e.target.checked)}
                            />
                        </div>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginBottom: "15px" }}>
                        {/* Collection Names */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--framer-color-text-secondary)" }}>Products Collection Name</label>
                            <input
                                type="text"
                                value={productsCollectionName}
                                onChange={e => setProductsCollectionName(e.target.value)}
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
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--framer-color-text-secondary)" }}>Categories Collection Name</label>
                            <input
                                type="text"
                                value={categoriesCollectionName}
                                onChange={e => setCategoriesCollectionName(e.target.value)}
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
                        </div>

                        {/* Dropdowns */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--framer-color-text-secondary)" }}>Image Quality</label>
                                <select
                                    value={imageQuality}
                                    onChange={e => setImageQuality(e.target.value as any)}
                                    style={{
                                        padding: "6px",
                                        fontSize: "11px",
                                        backgroundColor: "var(--framer-color-bg-secondary)",
                                        border: "1px solid var(--framer-color-bg-tertiary)",
                                        borderRadius: "6px",
                                        color: "var(--framer-color-text)"
                                    }}
                                >
                                    <option value="standard">Standard Web-Ready</option>
                                    <option value="high">High Resolution</option>
                                    <option value="raw">Raw / Original</option>
                                </select>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "11px", fontWeight: "600", color: "var(--framer-color-text-secondary)" }}>Sync Batch Size</label>
                                <select
                                    value={batchSize}
                                    onChange={e => setBatchSize(Number(e.target.value))}
                                    style={{
                                        padding: "6px",
                                        fontSize: "11px",
                                        backgroundColor: "var(--framer-color-bg-secondary)",
                                        border: "1px solid var(--framer-color-bg-tertiary)",
                                        borderRadius: "6px",
                                        color: "var(--framer-color-text)"
                                    }}
                                >
                                    <option value={20}>20 products / page</option>
                                    <option value={50}>50 products / page</option>
                                    <option value={100}>100 products / page</option>
                                </select>
                            </div>
                        </div>

                        {/* Extra Checkboxes */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--framer-color-text)" }}>Import Variants</div>
                                <div style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)" }}>Fetch options and sub-variants</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={importVariants}
                                onChange={e => setImportVariants(e.target.checked)}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--framer-color-text)" }}>Import Product Tags</div>
                                <div style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)" }}>Store search tags on CMS metadata</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={importTags}
                                onChange={e => setImportTags(e.target.checked)}
                            />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--framer-color-text)" }}>Import SEO Metadata</div>
                                <div style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)" }}>Generate clean Yoast/SEO mapped headers</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={importSeo}
                                onChange={e => setImportSeo(e.target.checked)}
                            />
                        </div>
                    </div>
                )}

                <button type="submit" style={{
                    marginTop: "auto",
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "var(--framer-color-tint)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer"
                }}>
                    Configure Field Mapping
                </button>
            </form>
        </main>
    )
}
